import { Socket, Server } from 'socket.io';
import type { LobbyManager, GameManager, PlayerManager } from '../../managers';
import type { StationWithTrains } from '../../types/station';
import { CLIENT_EVENTS, SERVER_EVENTS, type CreateLobbyEvent, type JoinLobbyEvent, type LeaveLobbyEvent } from '../../types/events';

/**
 * Setup lobby event handlers
 */
export function setupLobbyHandlers(
  socket: Socket,
  io: Server,
  lobbyManager: LobbyManager,
  gameManager: GameManager,
  playerManager: PlayerManager,
  availableStations: StationWithTrains[]
): void {
  /**
   * Create a new lobby
   * Client emits: createLobby({ username })
   * Server emits: lobbyJoined({ lobby, player })
   */
  socket.on(CLIENT_EVENTS.CREATE_LOBBY, (data: CreateLobbyEvent) => {
    try {
      const { username } = data;

      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Username is required',
          code: 'INVALID_USERNAME',
        });
        return;
      }

      // Create lobby
      const lobby = lobbyManager.createLobby(socket.id, username.trim());

      // Join socket.io room
      socket.join(lobby.id);

      // Find the host player
      const hostPlayer = lobby.players.find(p => p.isHost && p.socketId === socket.id);
      if (!hostPlayer) {
        throw new Error('Host player not found after lobby creation');
      }

      // Emit lobby joined event
      socket.emit(SERVER_EVENTS.LOBBY_JOINED, {
        lobby,
        player: hostPlayer,
      });
    } catch (error) {
      socket.emit(SERVER_EVENTS.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to create lobby',
        code: 'CREATE_LOBBY_ERROR',
      });
    }
  });

  /**
   * Join an existing lobby
   * Client emits: joinLobby({ code, username })
   * Server emits: lobbyJoined({ lobby, player }) to joiner
   * Server emits: lobbyUpdate({ lobby }) to all other players in lobby
   */
  socket.on(CLIENT_EVENTS.JOIN_LOBBY, (data: JoinLobbyEvent) => {
    try {
      const { code, username } = data;

      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Lobby code is required',
          code: 'INVALID_CODE',
        });
        return;
      }

      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Username is required',
          code: 'INVALID_USERNAME',
        });
        return;
      }

      // Join lobby
      const lobby = lobbyManager.joinLobby(code.toUpperCase().trim(), socket.id, username.trim());

      // Join socket.io room
      socket.join(lobby.id);

      // Find the player who just joined
      const joinedPlayer = lobby.players.find(p => p.socketId === socket.id);
      if (!joinedPlayer) {
        throw new Error('Player not found after joining lobby');
      }

      // Emit lobby joined event to the joiner
      socket.emit(SERVER_EVENTS.LOBBY_JOINED, {
        lobby,
        player: joinedPlayer,
      });

      // Broadcast lobby update to ALL players in the lobby (including the joiner)
      // This ensures the joiner receives the update for their subscription
      io.to(lobby.id).emit(SERVER_EVENTS.LOBBY_UPDATE, {
        lobby,
      });
    } catch (error) {
      socket.emit(SERVER_EVENTS.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to join lobby',
        code: 'JOIN_LOBBY_ERROR',
      });
    }
  });

  /**
   * Leave a lobby
   * Client emits: leaveLobby()
   * Server emits: lobbyUpdate({ lobby }) to remaining players
   */
  socket.on(CLIENT_EVENTS.LEAVE_LOBBY, () => {
    try {
      const lobbyId = lobbyManager.getLobbyIdForSocket(socket.id);
      
      if (!lobbyId) {
        socket.emit(SERVER_EVENTS.ERROR, {
          message: 'Not in a lobby',
          code: 'NOT_IN_LOBBY',
        });
        return;
      }

      // Leave lobby
      const updatedLobby = lobbyManager.leaveLobby(socket.id);

      // Leave socket.io room
      socket.leave(lobbyId);

      if (updatedLobby) {
        // Broadcast lobby update to remaining players
        socket.to(lobbyId).emit(SERVER_EVENTS.LOBBY_UPDATE, {
          lobby: updatedLobby,
        });
      }
    } catch (error) {
      socket.emit(SERVER_EVENTS.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to leave lobby',
        code: 'LEAVE_LOBBY_ERROR',
      });
    }
  });
}
