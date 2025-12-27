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
} from '../types/socket-events';
import { GAME_CONFIG } from '../constants';


interface GameLogicState {
  currentRound: number;
  currentStation: {
    station_name: string;
    line: string;
    latitude: number;
    longitude: number;
    borough: string;
    trains: string[];
  } | null;
  guesses: Array<{
    playerId: string;
    playerName: string;
    lat: number;
    lng: number;
    distance: number;
    points: number;
    submittedAt: number;
  }>;
  players: Array<{ id: string; name: string; score: number }>;
  timeRemaining: number;
  isRoundActive: boolean;
  isCountdown: boolean;
  countdownTime: number;
  roundResults: RoundResults | null;
  gameResults: {
    finalScores: Array<{ playerId: string; playerName: string; totalScore: number }>;
    winner: { playerId: string; playerName: string; totalScore: number };
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: GameLogicState = {
  currentRound: 0,
  currentStation: null,
  guesses: [],
  players: [],
  timeRemaining: 0,
  isRoundActive: false,
  isCountdown: false,
  countdownTime: 0,
  roundResults: null,
  gameResults: null,
  isLoading: false,
  error: null,
};

export const useGameLogic = (lobbyId: string | null, currentPlayerId: string | null) => {
  const [state, setState] = useState<GameLogicState>(initialState);
  const timerRef = useRef<RoundTimer | null>(null);
  const countdownTimerRef = useRef<RoundTimer | null>(null);
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
    
    setState(prev => ({
      ...prev,
      isCountdown: true,
      countdownTime: data.countdown,
      currentStation: data.station,
      isRoundActive: false,
      timeRemaining: 0,
      guesses: [],
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
      currentRound: prev.currentRound + 1,
      guesses: [],
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
      guesses: data.results.guesses,
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
    setTimeout(() => {
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

  // Handle lobby updates during active rounds to show guesses in real-time
  const handleLobbyUpdate = useCallback((serverLobby: ServerLobby) => {
    // Only process lobby updates during active rounds to extract guesses
    if (serverLobby.gameState === 'active') {
      // Extract guesses from player.currentRoundGuess
      const activeGuesses = serverLobby.players
        .filter(p => p.currentRoundGuess !== null)
        .map(player => ({
          playerId: player.id,
          playerName: player.username,
          lat: player.currentRoundGuess!.lat,
          lng: player.currentRoundGuess!.lng,
          distance: 0, // Will be calculated at round end
          points: 0, // Will be calculated at round end
          submittedAt: Date.now(), // Approximate timestamp
        }));

      // Update guesses state to show markers on map
      setState(prev => ({
        ...prev,
        guesses: activeGuesses,
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
    };
  }, []);

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    return seconds.toString().padStart(2, '0');
  }, []);

  // Check if current player has guessed
  const hasCurrentPlayerGuessed = useCallback((): boolean => {
    if (!currentPlayerId) return false;
    return state.guesses.some(guess => guess.playerId === currentPlayerId);
  }, [currentPlayerId, state.guesses]);

  return {
    // State
    currentRound: state.currentRound,
    currentStation: state.currentStation,
    guesses: state.guesses,
    players: state.players,
    timeRemaining: state.timeRemaining,
    isRoundActive: state.isRoundActive,
    isCountdown: state.isCountdown,
    countdownTime: state.countdownTime,
    roundResults: state.roundResults,
    gameResults: state.gameResults,
    isLoading: state.isLoading,
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