import { socketService } from './socketService';
import { SERVER_EVENTS } from '../types/socket-events';
import type {
  ServerLobby,
  LobbyUpdateEvent,
  CountdownStartEvent,
  RoundStartEvent,
  RoundEndEvent,
  GameEndEvent,
} from '../types/socket-events';

/**
 * Real-time subscription manager for Socket.io events
 */
export class RealtimeSubscriptionManager {
  private subscriptions: Map<string, () => void> = new Map();

  /**
   * Subscribe to lobby updates (players joining/leaving, status changes)
   * @param callback - Callback function that receives updated lobby data
   * @returns Subscription key for unsubscribing
   */
  subscribeLobbyUpdates(callback: (lobby: ServerLobby) => void): string {
    const subscriptionKey = `lobby_updates_${Date.now()}`;
    
    // Remove existing subscription if any
    this.unsubscribe(subscriptionKey);

    const unsubscribe = socketService.on<LobbyUpdateEvent>(
      SERVER_EVENTS.LOBBY_UPDATE,
      (data) => {
        callback(data.lobby);
      }
    );

    this.subscriptions.set(subscriptionKey, unsubscribe);
    return subscriptionKey;
  }

  /**
   * Subscribe to game countdown start events
   * @param callback - Callback function that receives countdown data
   * @returns Subscription key for unsubscribing
   */
  subscribeCountdownStart(callback: (data: CountdownStartEvent) => void): string {
    const subscriptionKey = `countdown_start_${Date.now()}`;
    
    this.unsubscribe(subscriptionKey);

    const unsubscribe = socketService.on<CountdownStartEvent>(
      SERVER_EVENTS.COUNTDOWN_START,
      callback
    );

    this.subscriptions.set(subscriptionKey, unsubscribe);
    return subscriptionKey;
  }

  /**
   * Subscribe to round start events
   * @param callback - Callback function that receives round start data
   * @returns Subscription key for unsubscribing
   */
  subscribeRoundStart(callback: (data: RoundStartEvent) => void): string {
    const subscriptionKey = `round_start_${Date.now()}`;
    
    this.unsubscribe(subscriptionKey);

    const unsubscribe = socketService.on<RoundStartEvent>(
      SERVER_EVENTS.ROUND_START,
      callback
    );

    this.subscriptions.set(subscriptionKey, unsubscribe);
    return subscriptionKey;
  }

  /**
   * Subscribe to round end events
   * @param callback - Callback function that receives round results
   * @returns Subscription key for unsubscribing
   */
  subscribeRoundEnd(callback: (data: RoundEndEvent) => void): string {
    const subscriptionKey = `round_end_${Date.now()}`;
    
    this.unsubscribe(subscriptionKey);

    const unsubscribe = socketService.on<RoundEndEvent>(
      SERVER_EVENTS.ROUND_END,
      callback
    );

    this.subscriptions.set(subscriptionKey, unsubscribe);
    return subscriptionKey;
  }

  /**
   * Subscribe to game end events
   * @param callback - Callback function that receives final game results
   * @returns Subscription key for unsubscribing
   */
  subscribeGameEnd(callback: (data: GameEndEvent) => void): string {
    const subscriptionKey = `game_end_${Date.now()}`;
    
    this.unsubscribe(subscriptionKey);

    const unsubscribe = socketService.on<GameEndEvent>(
      SERVER_EVENTS.GAME_END,
      callback
    );

    this.subscriptions.set(subscriptionKey, unsubscribe);
    return subscriptionKey;
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionKey: string): void {
    const unsubscribe = this.subscriptions.get(subscriptionKey);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.subscriptions.clear();
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Global instance for easy access
export const realtimeManager = new RealtimeSubscriptionManager();

/**
 * Real-time lobby state synchronization
 * @param onLobbyUpdate - Callback when lobby updates (players, status, etc.)
 * @returns Subscription key for unsubscribing
 */
export const syncLobbyState = (
  onLobbyUpdate: (lobby: ServerLobby) => void
): string => {
  return realtimeManager.subscribeLobbyUpdates(onLobbyUpdate);
};

/**
 * Real-time game session synchronization
 * Listens for all game events (countdown, round start, round end, game end)
 * @param onCountdownStart - Callback when countdown starts
 * @param onRoundStart - Callback when round starts
 * @param onRoundEnd - Callback when round ends
 * @param onGameEnd - Callback when game ends
 * @returns Array of subscription keys for unsubscribing
 */
export const syncGameSession = (
  onCountdownStart?: (data: CountdownStartEvent) => void,
  onRoundStart?: (data: RoundStartEvent) => void,
  onRoundEnd?: (data: RoundEndEvent) => void,
  onGameEnd?: (data: GameEndEvent) => void
): string[] => {
  const keys: string[] = [];

  if (onCountdownStart) {
    keys.push(realtimeManager.subscribeCountdownStart(onCountdownStart));
  }

  if (onRoundStart) {
    keys.push(realtimeManager.subscribeRoundStart(onRoundStart));
  }

  if (onRoundEnd) {
    keys.push(realtimeManager.subscribeRoundEnd(onRoundEnd));
  }

  if (onGameEnd) {
    keys.push(realtimeManager.subscribeGameEnd(onGameEnd));
  }

  return keys;
};


