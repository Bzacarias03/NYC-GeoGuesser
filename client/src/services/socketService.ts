import { io, Socket } from 'socket.io-client';
import type {
  CreateLobbyEvent,
  JoinLobbyEvent,
  StartGameEvent,
  MakeGuessEvent,
  LeaveLobbyEvent,
  LobbyJoinedEvent,
  LobbyUpdateEvent,
  CountdownStartEvent,
  RoundStartEvent,
  RoundEndEvent,
  GameEndEvent,
  ErrorEvent,
} from '../types/socket-events';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../types/socket-events';

/**
 * Socket.io client service
 * Manages Socket.io connection, events, and reconnection logic
 */
class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isManualDisconnect = false;
  private eventListeners: Map<string, Set<Function>> = new Map();

  /**
   * Get Socket.io server URL from environment or default to localhost
   */
  private getSocketUrl(): string {
    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';
    return url;
  }

  /**
   * Connect to Socket.io server
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    if (this.socket) {
      // Reuse existing socket instance
      this.socket.connect();
      return;
    }

    const url = this.getSocketUrl();

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.isManualDisconnect = false;
      this.notifyListeners('connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason: string) => {
      this.notifyListeners('disconnected', { reason });

      // Auto-reconnect unless manually disconnected
      if (!this.isManualDisconnect && reason !== 'io client disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      this.notifyListeners('error', { message: error.message, code: 'CONNECTION_ERROR' });
    });

    // Forward server events to registered listeners
    this.socket.on(SERVER_EVENTS.LOBBY_JOINED, (data: LobbyJoinedEvent) => {
      this.notifyListeners(SERVER_EVENTS.LOBBY_JOINED, data);
    });

    this.socket.on(SERVER_EVENTS.LOBBY_UPDATE, (data: LobbyUpdateEvent) => {
      this.notifyListeners(SERVER_EVENTS.LOBBY_UPDATE, data);
    });

    this.socket.on(SERVER_EVENTS.COUNTDOWN_START, (data: CountdownStartEvent) => {
      this.notifyListeners(SERVER_EVENTS.COUNTDOWN_START, data);
    });

    this.socket.on(SERVER_EVENTS.ROUND_START, (data: RoundStartEvent) => {
      this.notifyListeners(SERVER_EVENTS.ROUND_START, data);
    });

    this.socket.on(SERVER_EVENTS.ROUND_END, (data: RoundEndEvent) => {
      this.notifyListeners(SERVER_EVENTS.ROUND_END, data);
    });

    this.socket.on(SERVER_EVENTS.GAME_END, (data: GameEndEvent) => {
      this.notifyListeners(SERVER_EVENTS.GAME_END, data);
    });

    this.socket.on(SERVER_EVENTS.ERROR, (data: ErrorEvent) => {
      this.notifyListeners(SERVER_EVENTS.ERROR, data);
    });
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.notifyListeners('error', {
        message: 'Failed to reconnect to server',
        code: 'RECONNECTION_FAILED',
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      10000
    );

    setTimeout(() => {
      if (!this.isManualDisconnect && this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: unknown): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit(event, data);
  }

  /**
   * Subscribe to Socket.io event
   */
  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  /**
   * Unsubscribe from Socket.io event
   */
  off(event: string, callback?: Function): void {
    if (!callback) {
      // Remove all listeners for this event
      this.eventListeners.delete(event);
      return;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Internal method to notify registered listeners
   */
  private notifyListeners(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          // Error in event listener - silently fail
          console.error('Error in event listener', error)
        }
      });
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Convenience methods for game events

  /**
   * Create a lobby
   */
  createLobby(username: string): void {
    this.emit(CLIENT_EVENTS.CREATE_LOBBY, { username } as CreateLobbyEvent);
  }

  /**
   * Join a lobby
   */
  joinLobby(code: string, username: string): void {
    this.emit(CLIENT_EVENTS.JOIN_LOBBY, { code, username } as JoinLobbyEvent);
  }

  /**
   * Start the game (host only)
   */
  startGame(): void {
    this.emit(CLIENT_EVENTS.START_GAME, {} as StartGameEvent);
  }

  /**
   * Submit a guess
   */
  makeGuess(lat: number, lng: number): void {
    this.emit(CLIENT_EVENTS.MAKE_GUESS, { lat, lng } as MakeGuessEvent);
  }

  /**
   * Leave the lobby
   */
  leaveLobby(): void {
    this.emit(CLIENT_EVENTS.LEAVE_LOBBY, {} as LeaveLobbyEvent);
  }
}

// Export singleton instance
export const socketService = new SocketService();
