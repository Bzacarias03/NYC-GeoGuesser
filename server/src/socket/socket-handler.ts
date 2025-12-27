import { Server, Socket } from 'socket.io';
import type { LobbyManager, GameManager, PlayerManager } from '../managers';
import type { StationWithTrains } from '../types/station';
import { setupLobbyHandlers } from './handlers/lobby-handlers';
import { setupGameHandlers } from './handlers/game-handlers';
import { setupTimerHandlers } from './handlers/timer-handlers';

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
      handleDisconnection(socket, lobbyManager, gameManager);
    });

    // Handle connection errors
    socket.on('error', (error: Error) => {
      socket.emit('error', { message: 'Connection error occurred', code: 'CONNECTION_ERROR' });
    });
  });
}

/**
 * Handle client disconnection
 * - Remove player from lobby
 * - Migrate host if needed
 * - Clean up game state if necessary
 */
function handleDisconnection(
  socket: Socket,
  lobbyManager: LobbyManager,
  gameManager: GameManager
): void {
  const lobbyId = lobbyManager.getLobbyIdForSocket(socket.id);
  
  if (!lobbyId) {
    // Socket wasn't in a lobby, nothing to clean up
    return;
  }

  const lobby = lobbyManager.getLobby(lobbyId);
  if (!lobby) {
    return;
  }

  // Mark player as disconnected
  lobbyManager.markPlayerDisconnected(socket.id);

  // Leave the socket.io room
  socket.leave(lobbyId);

  // If game is active, remove player but continue game
  if (lobby.gameState !== 'waiting' && lobby.gameState !== 'finished') {
    // Player left during active game - remove them but continue
    const updatedLobby = lobbyManager.leaveLobby(socket.id);
    
    if (updatedLobby) {
      // Broadcast lobby update to remaining players
      socket.to(lobbyId).emit('lobbyUpdate', { lobby: updatedLobby });
    }
  } else {
    // Game not active - normal leave
    const updatedLobby = lobbyManager.leaveLobby(socket.id);
    
    if (updatedLobby) {
      // Broadcast lobby update to remaining players
      socket.to(lobbyId).emit('lobbyUpdate', { lobby: updatedLobby });
    }
  }
}
