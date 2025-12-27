import { Socket, Server } from 'socket.io';
import type { LobbyManager, GameManager } from '../../managers';
import type { Station, StationWithTrains } from '../../types/station';
import { SERVER_EVENTS } from '../../types/events';
import { GAME_CONFIG, TIMER_CONFIG } from '../../config/constants';
import { parseStationTrains } from '../../utils/station-filter';

/**
 * Timer intervals for each lobby
 */
const timerIntervals = new Map<string, NodeJS.Timeout>();

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

  // Emit initial countdown
  io.to(lobbyId).emit(SERVER_EVENTS.COUNTDOWN_START, {
    station,
    countdown,
  });

  // Start countdown interval
  const interval = setInterval(() => {
    countdown--;

    if (countdown > 0) {
      // Emit countdown update
      io.to(lobbyId).emit(SERVER_EVENTS.COUNTDOWN_START, {
        station,
        countdown,
      });
    } else {
      // Countdown finished - start active round
      clearTimer(lobbyId);
      startRoundTimer(io, lobbyId, lobbyManager, gameManager, station);
    }
  }, TIMER_CONFIG.UPDATE_INTERVAL_MS);

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
    station,
    timer: GAME_CONFIG.ROUND_DURATION,
  });

  let timeRemaining = GAME_CONFIG.ROUND_DURATION;

  // Start round timer interval
  const interval = setInterval(() => {
    timeRemaining--;

    if (timeRemaining > 0) {
      // Emit timer update (optional - can be done client-side for smoother updates)
      // For now, we'll let clients handle their own timers based on roundStart event
    } else {
      // Round time finished - end round
      clearTimer(lobbyId);
      endRound(io, lobbyId, lobbyManager, gameManager);
    }
  }, TIMER_CONFIG.UPDATE_INTERVAL_MS);

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
      lobby: updatedLobby,
    });
  }

  // Wait a bit before starting next round or ending game
  setTimeout(() => {
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
  }, 3000); // 3 second delay between rounds
}

/**
 * Clear timer for a lobby
 */
export function clearTimer(lobbyId: string): void {
  const interval = timerIntervals.get(lobbyId);
  if (interval) {
    clearInterval(interval);
    timerIntervals.delete(lobbyId);
  }
}

/**
 * Clean up all timers (for server shutdown)
 */
export function clearAllTimers(): void {
  timerIntervals.forEach((interval) => {
    clearInterval(interval);
  });
  timerIntervals.clear();
}
