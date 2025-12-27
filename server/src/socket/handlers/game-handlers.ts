import { Socket, Server } from 'socket.io';
import type { LobbyManager, GameManager, PlayerManager } from '../../managers';
import type { StationWithTrains } from '../../types/station';
import { CLIENT_EVENTS, SERVER_EVENTS, type StartGameEvent, type MakeGuessEvent } from '../../types/events';
import { GAME_CONFIG } from '../../config/constants';
import { startCountdownTimer } from './timer-handlers';
import { parseStationTrains } from '../../utils/station-filter';

/**
 * Setup game event handlers
 */
export function setupGameHandlers(
  socket: Socket,
  io: Server,
  lobbyManager: LobbyManager,
  gameManager: GameManager,
  playerManager: PlayerManager,
  availableStations: StationWithTrains[]
): void {
  /**
   * Start a game (host only)
   * Client emits: startGame()
   * Server emits: countdownStart({ station, countdown }) to all players
   */
  socket.on(CLIENT_EVENTS.START_GAME, () => {
    try {
      const lobbyId = lobbyManager.getLobbyIdForSocket(socket.id);
      
      if (!lobbyId) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Not in a lobby',
          code: 'NOT_IN_LOBBY',
        });
        return;
      }

      // Check if player is host
      if (!lobbyManager.isPlayerHost(socket.id)) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Only the host can start the game',
          code: 'NOT_HOST',
        });
        return;
      }

      const lobby = lobbyManager.getLobby(lobbyId);
      if (!lobby) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Lobby not found',
          code: 'LOBBY_NOT_FOUND',
        });
        return;
      }

      // Check if game can be started
      if (lobby.gameState !== 'waiting') {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Game has already started',
          code: 'GAME_ALREADY_STARTED',
        });
        return;
      }

      // Start game
      const updatedLobby = gameManager.startGame(lobby, availableStations);
      
      // Update lobby in manager
      lobbyManager.updateLobby(lobbyId, updatedLobby);

      // Emit countdown start to all players in the lobby
      if (updatedLobby.currentStation) {
        // Convert Station to StationWithTrains
        const stationWithTrains = parseStationTrains(updatedLobby.currentStation);

        // Start countdown timer
        startCountdownTimer(io, lobbyId, lobbyManager, gameManager, stationWithTrains);
      }
    } catch (error) {
      socket.emit(SERVER_EVENTS.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to start game',
        code: 'START_GAME_ERROR',
      });
    }
  });

  /**
   * Submit a guess
   * Client emits: makeGuess({ lat, lng })
   * Server validates and stores guess
   * No immediate response - results sent at round end
   */
  socket.on(CLIENT_EVENTS.MAKE_GUESS, (data: MakeGuessEvent) => {
    try {
      const { lat, lng } = data;

      const lobbyId = lobbyManager.getLobbyIdForSocket(socket.id);
      
      if (!lobbyId) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Not in a lobby',
          code: 'NOT_IN_LOBBY',
        });
        return;
      }

      const lobby = lobbyManager.getLobby(lobbyId);
      if (!lobby) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Lobby not found',
          code: 'LOBBY_NOT_FOUND',
        });
        return;
      }

      // Find player
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Player not found',
          code: 'PLAYER_NOT_FOUND',
        });
        return;
      }

      // Validate coordinates
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Invalid coordinates',
          code: 'INVALID_COORDINATES',
        });
        return;
      }

      // Submit guess
      const updatedLobby = gameManager.submitGuess(lobby, player.id, lat, lng);
      
      // Update lobby in manager
      lobbyManager.updateLobby(lobbyId, updatedLobby);

      // Broadcast lobby update to all players (so they can see who has guessed)
      io.to(lobbyId).emit(SERVER_EVENTS.LOBBY_UPDATE, {
        lobby: updatedLobby,
      });
    } catch (error) {
      socket.emit(SERVER_EVENTS.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to submit guess',
        code: 'MAKE_GUESS_ERROR',
      });
    }
  });
}
