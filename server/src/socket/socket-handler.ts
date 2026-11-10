import { Server, Socket } from 'socket.io';
import type { LobbyManager, GameManager, PlayerManager } from '../managers';
import type { StationWithTrains } from '../types/station';
import { setupLobbyHandlers } from './handlers/lobby-handlers';
import { setupGameHandlers } from './handlers/game-handlers';
import { setupTimerHandlers, clearTimer } from './handlers/timer-handlers';
import { SERVER_EVENTS } from '../types/events';
import { toPublicLobby } from '../utils/public-views';

/**
 * Socket handler setup
 * Manages Socket.io connections, rooms, and event routing
 */
export function setupSocketHandler(
  io: Server,
  lobbyManager: LobbyManager,
  gameManager: GameManager,
  playerManager: PlayerManager,
  availableStations: StationWithTrains[]
): void {
  io.on('connection', (socket: Socket) => {
    // Setup event handlers
    setupLobbyHandlers(socket, io, lobbyManager, gameManager, playerManager, availableStations);
    setupGameHandlers(socket, io, lobbyManager, gameManager, playerManager, availableStations);
    setupTimerHandlers(socket, io, lobbyManager, gameManager);

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      handleDisconnection(socket, io, lobbyManager, gameManager);
    });

    // Handle connection errors
    socket.on('error', (error: Error) => {
      socket.emit('error', { message: 'Connection error occurred', code: 'CONNECTION_ERROR' });
    });
  });
}

/**
 * Handle client disconnection
 * - Keep the player's seat for a grace period so they can rejoin
 * - Remove them (migrating host if needed) if they don't come back
 * - Clean up game state if the lobby is dissolved
 */
function handleDisconnection(
  socket: Socket,
  io: Server,
  lobbyManager: LobbyManager,
  gameManager: GameManager
): void {
  const lobby = lobbyManager.markPlayerDisconnected(socket.id, (lobbyId, updatedLobby) => {
    if (updatedLobby) {
      io.to(lobbyId).emit(SERVER_EVENTS.LOBBY_UPDATE, { lobby: toPublicLobby(updatedLobby) });
    } else {
      // Last player gave up their seat - stop the game loop for this lobby
      clearTimer(lobbyId);
      gameManager.cleanupGame(lobbyId);
    }
  });

  if (lobby) {
    // Let remaining players see who dropped
    socket.to(lobby.id).emit(SERVER_EVENTS.LOBBY_UPDATE, { lobby: toPublicLobby(lobby) });
  }
}
