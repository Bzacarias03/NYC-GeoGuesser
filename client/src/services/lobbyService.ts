import { socketService } from './socketService';
import type { ServerLobby, ServerPlayer } from '../types/socket-events';
import { SERVER_EVENTS } from '../types/socket-events';

/**
 * Create a new lobby using Socket.io
 * @param hostName - Name of the host player
 * @returns Promise resolving to server lobby, server player, and lobby code
 */
export const createLobby = async (
  hostName: string,
): Promise<{ lobby: ServerLobby; player: ServerPlayer; lobbyCode: string }> => {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let connectUnsubscribe: (() => void) | null = null;

    // Set up one-time listener for lobbyJoined event
    const unsubscribe = socketService.on(SERVER_EVENTS.LOBBY_JOINED, (data: { lobby: ServerLobby; player: ServerPlayer }) => {
      cleanup();
      
      resolve({
        lobby: data.lobby,
        player: data.player,
        lobbyCode: data.lobby.code,
      });
    });

    // Set up error handler
    const errorUnsubscribe = socketService.on(SERVER_EVENTS.ERROR, (error: { message: string; code?: string }) => {
      cleanup();
      reject(new Error(error.message));
    });

    // Cleanup function
    const cleanup = () => {
      unsubscribe();
      errorUnsubscribe();
      if (connectUnsubscribe) {
        connectUnsubscribe();
        connectUnsubscribe = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Ensure socket is connected
    if (!socketService.isConnected()) {
      socketService.connect();
      
      // Wait for connection before emitting
      connectUnsubscribe = socketService.on('connected', () => {
        const unsubscribe = connectUnsubscribe;
        if (unsubscribe) {
          connectUnsubscribe = null;
          unsubscribe();
        }
        socketService.createLobby(hostName);
      });
    } else {
      // Already connected, emit immediately
      socketService.createLobby(hostName);
    }

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Lobby creation timed out'));
    }, 10000);
  });
};

/**
 * Join an existing lobby using Socket.io
 * @param lobbyCode - 6-character lobby code
 * @param playerName - Name of the joining player
 * @returns Promise resolving to the server player object
 */
export const joinLobby = async (
  lobbyCode: string,
  playerName: string
): Promise<ServerPlayer> => {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let connectUnsubscribe: (() => void) | null = null;

    // Set up one-time listener for lobbyJoined event
    const unsubscribe = socketService.on(SERVER_EVENTS.LOBBY_JOINED, (data: { lobby: ServerLobby; player: ServerPlayer }) => {
      cleanup();
      
      resolve(data.player);
    });

    // Set up error handler
    const errorUnsubscribe = socketService.on(SERVER_EVENTS.ERROR, (error: { message: string; code?: string }) => {
      cleanup();
      reject(new Error(error.message));
    });

    // Cleanup function
    const cleanup = () => {
      unsubscribe();
      errorUnsubscribe();
      if (connectUnsubscribe) {
        connectUnsubscribe();
        connectUnsubscribe = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Ensure socket is connected
    if (!socketService.isConnected()) {
      socketService.connect();
      
      // Wait for connection before emitting
      connectUnsubscribe = socketService.on('connected', () => {
        const unsubscribe = connectUnsubscribe;
        if (unsubscribe) {
          connectUnsubscribe = null;
          unsubscribe();
        }
        socketService.joinLobby(lobbyCode, playerName);
      });
    } else {
      // Already connected, emit immediately
      socketService.joinLobby(lobbyCode, playerName);
    }

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Failed to join lobby'));
    }, 10000);
  });
};

/**
 * Leave lobby using Socket.io
 * @returns Promise resolving to void
 */
export const leaveLobby = async (): Promise<void> => {
  // Socket.io handles leaving automatically on disconnect
  // But we can explicitly call leaveLobby if needed
  try {
    socketService.leaveLobby();
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to leave lobby');
  }
};
