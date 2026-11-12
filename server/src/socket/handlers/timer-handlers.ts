import { Socket, Server } from 'socket.io';
import type { LobbyManager, GameManager } from '../../managers';
import type { Station, StationWithTrains } from '../../types/station';
import type { Lobby } from '../../types/lobby';
import { SERVER_EVENTS } from '../../types/events';
import { GAME_CONFIG, TIMER_CONFIG } from '../../config/constants';
import { parseStationTrains } from '../../utils/station-filter';
import { toPublicLobby, toPublicStation } from '../../utils/public-views';

/**
 * The running timer for each lobby: the countdown or round interval, or the
 * pause between rounds. A lobby only ever has one at a time.
 */
const timerIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Run one step of a lobby's game loop. Timer callbacks run outside any
 * try/catch, so an error here would otherwise crash the whole server and end
 * every lobby's game. Instead, only this lobby's game is ended.
 */
function runGuarded(
  io: Server,
  lobbyId: string,
  lobbyManager: LobbyManager,
  gameManager: GameManager,
  step: string,
  fn: () => void
): void {
  try {
    fn();
  } catch (error) {
    console.error(`[game] ${step} failed for lobby ${lobbyId}; ending its game`, error);
    abortGame(io, lobbyId, lobbyManager, gameManager);
  }
}

/**
 * End a lobby's game after an error: stop its timers, return the lobby to
 * 'waiting' so the host can start again, and tell its players.
 */
function abortGame(
  io: Server,
  lobbyId: string,
  lobbyManager: LobbyManager,
  gameManager: GameManager
): void {
  try {
    clearTimer(lobbyId);
    gameManager.cleanupGame(lobbyId);

    const lobby = lobbyManager.getLobby(lobbyId);
    if (!lobby) {
      return;
    }

    lobby.players.forEach(player => {
      player.currentRoundGuess = null;
      player.currentRoundScore = 0;
    });
    lobbyManager.updateLobby(lobbyId, {
      gameState: 'waiting',
      currentRound: 0,
      currentStation: null,
      roundTimer: 0,
      roundStartTime: null,
    });

    io.to(lobbyId).emit(SERVER_EVENTS.ERROR, {
      message: 'Something went wrong, so the game was ended.',
      code: 'GAME_ABORTED',
    });
    io.to(lobbyId).emit(SERVER_EVENTS.LOBBY_UPDATE, { lobby: toPublicLobby(lobby) });
  } catch (error) {
    console.error(`[game] Failed to clean up lobby ${lobbyId} after an error`, error);
  }
}

/**
 * Setup timer event handlers
 */
export function setupTimerHandlers(
  socket: Socket,
  io: Server,
  lobbyManager: LobbyManager,
  gameManager: GameManager
): void {
  // Timer handlers are managed server-side
  // No client events needed - timers are server-authoritative
}

/**
 * Store available stations for timer handlers
 */
let availableStationsForTimers: StationWithTrains[] = [];

/**
 * Set available stations for timer handlers
 */
export function setAvailableStations(stations: StationWithTrains[]): void {
  availableStationsForTimers = stations;
}

/**
 * Start countdown timer for a lobby
 * Emits countdown updates every second, then starts round
 */
export function startCountdownTimer(
  io: Server,
  lobbyId: string,
  lobbyManager: LobbyManager,
  gameManager: GameManager,
  station: StationWithTrains
): void {
  // Clear any existing timer
  clearTimer(lobbyId);

  let countdown = GAME_CONFIG.COUNTDOWN_DURATION;
  const round = lobbyManager.getLobby(lobbyId)?.currentRound ?? 0;

  // Emit initial countdown
  io.to(lobbyId).emit(SERVER_EVENTS.COUNTDOWN_START, {
    station: toPublicStation(station),
    countdown,
    round,
  });

  // Start countdown interval
  const interval = setInterval(() => runGuarded(io, lobbyId, lobbyManager, gameManager, 'countdown', () => {
    countdown--;

    if (countdown > 0) {
      // Emit countdown update
      io.to(lobbyId).emit(SERVER_EVENTS.COUNTDOWN_START, {
        station: toPublicStation(station),
        countdown,
        round,
      });
    } else {
      // Countdown finished - start active round
      clearTimer(lobbyId);
      startRoundTimer(io, lobbyId, lobbyManager, gameManager, station);
    }
  }), TIMER_CONFIG.UPDATE_INTERVAL_MS);

  timerIntervals.set(lobbyId, interval);
}

/**
 * Start round timer for a lobby
 * Emits timer updates every second, then ends round
 */
export function startRoundTimer(
  io: Server,
  lobbyId: string,
  lobbyManager: LobbyManager,
  gameManager: GameManager,
  station: StationWithTrains
): void {
  // Clear any existing timer
  clearTimer(lobbyId);

  const lobby = lobbyManager.getLobby(lobbyId);
  if (!lobby) {
    return;
  }

  // Start active round
  const updatedLobby = gameManager.startActiveRound(lobby);
  lobbyManager.updateLobby(lobbyId, updatedLobby);

  // Emit round start
  io.to(lobbyId).emit(SERVER_EVENTS.ROUND_START, {
    station: toPublicStation(station),
    timer: GAME_CONFIG.ROUND_DURATION,
    round: updatedLobby.currentRound,
  });

  let timeRemaining = GAME_CONFIG.ROUND_DURATION;

  // Start round timer interval
  const interval = setInterval(() => runGuarded(io, lobbyId, lobbyManager, gameManager, 'round end', () => {
    timeRemaining--;

    if (timeRemaining > 0) {
      // Emit timer update (optional - can be done client-side for smoother updates)
      // For now, we'll let clients handle their own timers based on roundStart event
    } else {
      // Round time finished - end round
      clearTimer(lobbyId);
      endRound(io, lobbyId, lobbyManager, gameManager);
    }
  }), TIMER_CONFIG.UPDATE_INTERVAL_MS);

  timerIntervals.set(lobbyId, interval);
}

/**
 * End current round and calculate results
 */
function endRound(
  io: Server,
  lobbyId: string,
  lobbyManager: LobbyManager,
  gameManager: GameManager
): void {
  const lobby = lobbyManager.getLobby(lobbyId);
  if (!lobby) {
    return;
  }

  // End round and calculate results
  const roundResults = gameManager.endRound(lobby);
  
  // Update lobby state
  lobbyManager.updateLobby(lobbyId, {
    gameState: 'results',
  });

  // Get updated lobby with new scores
  const updatedLobby = lobbyManager.getLobby(lobbyId);

  // Emit round end with results
  io.to(lobbyId).emit(SERVER_EVENTS.ROUND_END, {
    results: roundResults,
  });

  // Emit lobby update with updated player scores
  if (updatedLobby) {
    io.to(lobbyId).emit(SERVER_EVENTS.LOBBY_UPDATE, {
      lobby: toPublicLobby(updatedLobby),
    });
  }

  // Wait a bit before starting next round or ending game. Tracked like the
  // other timers so it's cancelled if the lobby ends during the pause.
  const pause = setTimeout(() => runGuarded(io, lobbyId, lobbyManager, gameManager, 'next round', () => {
    timerIntervals.delete(lobbyId);
    const currentLobby = lobbyManager.getLobby(lobbyId);
    if (!currentLobby) {
      return;
    }

    // Move to next round or end game
    const { lobby: updatedLobby, gameComplete } = gameManager.nextRound(currentLobby, availableStationsForTimers);
    
    if (gameComplete) {
      // Game finished
      lobbyManager.updateLobby(lobbyId, updatedLobby);
      
      if (updatedLobby.gameResults) {
        io.to(lobbyId).emit(SERVER_EVENTS.GAME_END, {
          finalScores: updatedLobby.gameResults.finalScores,
          winner: updatedLobby.gameResults.winner,
        });
      }

      // Lobby is back in 'waiting' - let clients know a rematch can start
      io.to(lobbyId).emit(SERVER_EVENTS.LOBBY_UPDATE, { lobby: toPublicLobby(updatedLobby) });
    } else {
      // Start next round
      lobbyManager.updateLobby(lobbyId, updatedLobby);
      
      if (updatedLobby.currentStation) {
        // Convert Station to StationWithTrains
        const stationWithTrains = parseStationTrains(updatedLobby.currentStation);
        // Start countdown for next round
        startCountdownTimer(io, lobbyId, lobbyManager, gameManager, stationWithTrains);
      }
    }
  }), GAME_CONFIG.REVEAL_DURATION * 1000); // Players look over the revealed map

  timerIntervals.set(lobbyId, pause);
}

/**
 * Send a (re)joining player the countdown or round that is currently running,
 * so they land mid-game with the right station, round and time remaining
 */
export function emitCurrentGameState(socket: Socket, lobby: Lobby): void {
  if (!lobby.currentStation || lobby.roundStartTime === null) {
    return;
  }

  const elapsedSeconds = (Date.now() - lobby.roundStartTime) / 1000;
  const remaining = Math.max(Math.ceil(lobby.roundTimer - elapsedSeconds), 0);
  const station = toPublicStation(lobby.currentStation);

  if (lobby.gameState === 'countdown') {
    socket.emit(SERVER_EVENTS.COUNTDOWN_START, { station, countdown: remaining, round: lobby.currentRound });
  } else if (lobby.gameState === 'active') {
    socket.emit(SERVER_EVENTS.ROUND_START, { station, timer: remaining, round: lobby.currentRound });
  }
}

/**
 * Clear timer for a lobby
 */
export function clearTimer(lobbyId: string): void {
  const timer = timerIntervals.get(lobbyId);
  if (timer) {
    // clearTimeout cancels both intervals and timeouts in Node
    clearTimeout(timer);
    timerIntervals.delete(lobbyId);
  }
}

/**
 * Clean up all timers (for server shutdown)
 */
export function clearAllTimers(): void {
  timerIntervals.forEach((timer) => {
    clearTimeout(timer);
  });
  timerIntervals.clear();
}
