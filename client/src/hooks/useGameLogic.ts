import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  submitPlayerGuess,
  RoundTimer
} from '../services/gameService';
import { 
  syncGameSession,
  syncLobbyState,
  realtimeManager 
} from '../services/realtimeService';
import type {
  CountdownStartEvent,
  RoundStartEvent,
  RoundEndEvent,
  GameEndEvent,
  RoundResults,
  ServerLobby,
  PublicStation,
} from '../types/socket-events';
import { GAME_CONFIG } from '../constants';
import { socketService } from '../services/socketService';
import { useLobbyStore } from '../stores/lobbyStore';


interface GameLogicState {
  currentRound: number;
  currentStation: PublicStation | null;
  /** This player's own pin; everyone else's stays hidden until the round ends */
  myGuess: { lat: number; lng: number } | null;
  /** Who has guessed this round (not where) */
  guessedPlayerIds: string[];
  timeRemaining: number;
  isRoundActive: boolean;
  isCountdown: boolean;
  countdownTime: number;
  roundResults: RoundResults | null;
  gameResults: {
    finalScores: Array<{ playerId: string; playerName: string; totalScore: number }>;
    winner: { playerId: string; playerName: string; totalScore: number };
  } | null;
  error: string | null;
}

const initialState: GameLogicState = {
  currentRound: 0,
  currentStation: null,
  myGuess: null,
  guessedPlayerIds: [],
  timeRemaining: 0,
  isRoundActive: false,
  isCountdown: false,
  countdownTime: 0,
  roundResults: null,
  gameResults: null,
  error: null,
};

export const useGameLogic = (lobbyId: string | null, currentPlayerId: string | null) => {
  const [state, setState] = useState<GameLogicState>(initialState);
  const timerRef = useRef<RoundTimer | null>(null);
  const countdownTimerRef = useRef<RoundTimer | null>(null);
  const returnToLobbyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Handle countdown start
  const handleCountdownStart = useCallback((data: CountdownStartEvent) => {
    // Stop any existing timers
    if (timerRef.current) {
      timerRef.current.stop();
    }
    if (countdownTimerRef.current) {
      countdownTimerRef.current.stop();
    }
    // A rematch may start while this player is still on the final results screen
    if (returnToLobbyRef.current) {
      clearTimeout(returnToLobbyRef.current);
      returnToLobbyRef.current = null;
    }
    
    setState(prev => ({
      ...(prev.gameResults ? initialState : prev),
      isCountdown: true,
      countdownTime: data.countdown,
      currentRound: data.round,
      currentStation: data.station,
      isRoundActive: false,
      timeRemaining: 0,
      myGuess: null,
      guessedPlayerIds: [],
      roundResults: null,
    }));
    
    // Start countdown timer
    countdownTimerRef.current = new RoundTimer(
      data.countdown,
      (timeRemaining) => {
        setState(prev => ({ 
          ...prev, 
          countdownTime: timeRemaining
        }));
      },
      () => {
        // Countdown complete - round will start via roundStart event
        setState(prev => ({ 
          ...prev, 
          isCountdown: false,
          countdownTime: 0
        }));
        if (countdownTimerRef.current) {
          countdownTimerRef.current.stop();
        }
      }
    );
    countdownTimerRef.current.start();
  }, []);

  // Handle round start
  const handleRoundStart = useCallback((data: RoundStartEvent) => {
    // Stop countdown timer if still running
    if (countdownTimerRef.current) {
      countdownTimerRef.current.stop();
      countdownTimerRef.current = null;
    }
    
    // Stop any existing round timer
    if (timerRef.current) {
      timerRef.current.stop();
    }
    
    setState(prev => ({
      ...prev,
      isCountdown: false,
      countdownTime: 0,
      isRoundActive: true,
      timeRemaining: data.timer,
      currentStation: data.station,
      currentRound: data.round,
      // A reconnect resends the running round; keep our pin if it's the same one
      myGuess: prev.currentRound === data.round ? prev.myGuess : null,
      guessedPlayerIds: prev.currentRound === data.round ? prev.guessedPlayerIds : [],
      roundResults: null,
    }));
    
    // Start round timer (client-side sync with server)
    timerRef.current = new RoundTimer(
      data.timer,
      (timeRemaining) => {
        setState(prev => ({ 
          ...prev, 
          timeRemaining,
          isRoundActive: timeRemaining > 0
        }));
      },
      () => {
        // Timer complete - round will end via roundEnd event
        setState(prev => ({ 
          ...prev, 
          isRoundActive: false,
          timeRemaining: 0
        }));
        if (timerRef.current) {
          timerRef.current.stop();
        }
      }
    );
    timerRef.current.start();
  }, []);

  // Handle round end
  const handleRoundEnd = useCallback((data: RoundEndEvent) => {
    // Stop round timer
    if (timerRef.current) {
      timerRef.current.stop();
      timerRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isRoundActive: false,
      timeRemaining: 0,
      roundResults: data.results,
    }));
    
    // Check if game is complete
    if (data.results.roundNumber >= GAME_CONFIG.TOTAL_ROUNDS) {
      // Game will end via gameEnd event
    }
  }, []);

  // Handle game end
  const handleGameEnd = useCallback((data: GameEndEvent) => {
    // Stop all timers
    if (timerRef.current) {
      timerRef.current.stop();
      timerRef.current = null;
    }
    if (countdownTimerRef.current) {
      countdownTimerRef.current.stop();
      countdownTimerRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isRoundActive: false,
      isCountdown: false,
      timeRemaining: 0,
      countdownTime: 0,
      gameResults: {
        finalScores: data.finalScores,
        winner: data.winner,
      },
    }));
    
    // Navigate to lobby after showing results
    returnToLobbyRef.current = setTimeout(() => {
      returnToLobbyRef.current = null;
      navigate('/lobby');
    }, 10000);
  }, [navigate]);



  // Submit a guess
  const submitGuess = useCallback(async (lat: number, lng: number) => {
    if (!currentPlayerId || !state.isRoundActive) {
      setState(prev => ({
        ...prev,
        error: 'Cannot submit guess - round not active'
      }));
      return;
    }

    // Show our own pin right away; nobody else sees it until the round ends
    setState(prev => ({ ...prev, myGuess: { lat, lng } }));

    try {
      await submitPlayerGuess(lat, lng);
      // Guess will be included in roundEnd results
      // We can optimistically update UI if needed
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to submit guess'
      }));
    }
  }, [currentPlayerId, state.isRoundActive]);

  // Track who has guessed during the round (the server hides where)
  const handleLobbyUpdate = useCallback((serverLobby: ServerLobby) => {
    if (serverLobby.gameState === 'countdown' || serverLobby.gameState === 'active') {
      setState(prev => ({
        ...prev,
        guessedPlayerIds: serverLobby.players.filter(p => p.hasGuessed).map(p => p.id),
      }));
    }
  }, []);

  // Set up Socket.io event subscriptions
  useEffect(() => {
    if (!lobbyId) return;

    // Subscribe to all game events
    const subscriptionKeys = syncGameSession(
      handleCountdownStart,
      handleRoundStart,
      handleRoundEnd,
      handleGameEnd
    );

    // Subscribe to lobby updates to get real-time guesses during active rounds
    const lobbyUpdateKey = syncLobbyState(handleLobbyUpdate);

    // The first countdown event can arrive before this page finishes loading,
    // so ask for the running countdown/round. (After a refresh, the rejoin sends it.)
    if (socketService.isConnected() && useLobbyStore.getState().currentLobby) {
      socketService.requestGameState();
    }

    // Cleanup subscriptions on unmount
    return () => {
      subscriptionKeys.forEach(key => realtimeManager.unsubscribe(key));
      realtimeManager.unsubscribe(lobbyUpdateKey);
      
      // Cleanup timers
      if (timerRef.current) {
        timerRef.current.stop();
        timerRef.current = null;
      }
      if (countdownTimerRef.current) {
        countdownTimerRef.current.stop();
        countdownTimerRef.current = null;
      }
    };
  }, [lobbyId, handleCountdownStart, handleRoundStart, handleRoundEnd, handleGameEnd, handleLobbyUpdate]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        timerRef.current.stop();
      }
      if (countdownTimerRef.current) {
        countdownTimerRef.current.stop();
      }
      if (returnToLobbyRef.current) {
        clearTimeout(returnToLobbyRef.current);
      }
    };
  }, []);

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    return seconds.toString().padStart(2, '0');
  }, []);

  // Check if current player has guessed
  const hasCurrentPlayerGuessed = useCallback((): boolean => {
    return state.myGuess !== null;
  }, [state.myGuess]);

  return {
    // State
    currentRound: state.currentRound,
    currentStation: state.currentStation,
    myGuess: state.myGuess,
    guessedPlayerIds: state.guessedPlayerIds,
    timeRemaining: state.timeRemaining,
    isRoundActive: state.isRoundActive,
    isCountdown: state.isCountdown,
    countdownTime: state.countdownTime,
    roundResults: state.roundResults,
    gameResults: state.gameResults,
    error: state.error,

    // Actions
    submitGuess,

    // Computed
    formatTime,
    hasCurrentPlayerGuessed,
    
    // Progress info
    currentRoundNumber: state.currentRound,
    totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
    isGameComplete: !!state.gameResults,
    isShowingResults: !!state.roundResults && !state.isRoundActive,
  };
}; 