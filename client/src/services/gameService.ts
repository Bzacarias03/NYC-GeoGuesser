import { socketService } from './socketService';
import { SERVER_EVENTS } from '../types/socket-events';

/**
 * Start the game (host only)
 * Server will handle countdown, rounds, and game flow
 * @returns Promise that resolves when game starts (countdown begins)
 */
export const startGame = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let connectUnsubscribe: (() => void) | null = null;

    // Set up one-time listener for countdownStart event
    const unsubscribe = socketService.on(SERVER_EVENTS.COUNTDOWN_START, () => {
      cleanup();
      resolve();
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
        socketService.startGame();
      });
    } else {
      // Already connected, emit immediately
      socketService.startGame();
    }

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Failed to start game'));
    }, 10000);
  });
};

/**
 * Submit a player's guess
 * @param lat - Guess latitude
 * @param lng - Guess longitude
 */
export const submitPlayerGuess = async (
  lat: number,
  lng: number
): Promise<void> => {
  try {
    if (!socketService.isConnected()) {
      throw new Error('Socket not connected');
    }

    socketService.makeGuess(lat, lng);
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to submit guess');
  }
};

/**
 * Timer management utility for client-side display
 * Note: This should sync with server timers via real-time events
 */
export class RoundTimer {
  private timerId: NodeJS.Timeout | null = null;
  private timeRemaining: number = 0;
  private onTick: (timeRemaining: number) => void;
  private onComplete: () => void;

  constructor(
    duration: number,
    onTick: (timeRemaining: number) => void,
    onComplete: () => void
  ) {
    this.timeRemaining = duration;
    this.onTick = onTick;
    this.onComplete = onComplete;
  }

  start(): void {
    this.timerId = setInterval(() => {
      this.timeRemaining--;
      this.onTick(this.timeRemaining);

      if (this.timeRemaining <= 0) {
        this.stop();
        this.onComplete();
      }
    }, 1000);
  }

  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Update timer from server (for synchronization)
   */
  update(timeRemaining: number): void {
    this.timeRemaining = timeRemaining;
  }

  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  isRunning(): boolean {
    return this.timerId !== null;
  }
}
