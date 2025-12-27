import { randomUUID } from 'crypto';
import type { Player } from '../types/player';
import { validateUsername } from '../utils/validation';

/**
 * PlayerManager handles player-related operations
 * - Player state tracking
 * - Score accumulation
 * - Connection status tracking
 * - Player disconnection handling
 */
export class PlayerManager {
  /**
   * Create a new player
   * @param socketId Socket ID
   * @param username Username
   * @param isHost Whether player is host
   * @returns Created player
   */
  createPlayer(socketId: string, username: string, isHost: boolean = false): Player {
    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      throw new Error(usernameValidation.error || 'Invalid username');
    }

    return {
      id: randomUUID(),
      username: username.trim(),
      isHost,
      totalScore: 0,
      currentRoundGuess: null,
      currentRoundScore: 0,
      connected: true,
      socketId,
    };
  }

  /**
   * Update player connection status
   * @param player Player to update
   * @param connected Connection status
   */
  updateConnectionStatus(player: Player, connected: boolean): void {
    player.connected = connected;
  }

  /**
   * Add score to player's total
   * @param player Player to update
   * @param points Points to add
   */
  addScore(player: Player, points: number): void {
    player.totalScore += points;
  }

  /**
   * Reset player's round guess
   * @param player Player to update
   */
  resetRoundGuess(player: Player): void {
    player.currentRoundGuess = null;
    player.currentRoundScore = 0;
  }

  /**
   * Set player's round guess
   * @param player Player to update
   * @param lat Latitude
   * @param lng Longitude
   * @param points Points earned
   */
  setRoundGuess(player: Player, lat: number, lng: number, points: number): void {
    player.currentRoundGuess = { lat, lng };
    player.currentRoundScore = points;
  }

  /**
   * Reset player's total score
   * @param player Player to update
   */
  resetTotalScore(player: Player): void {
    player.totalScore = 0;
  }

  /**
   * Reset all player game state (for new game)
   * @param player Player to update
   */
  resetGameState(player: Player): void {
    player.totalScore = 0;
    player.currentRoundGuess = null;
    player.currentRoundScore = 0;
  }

  /**
   * Transfer host status from one player to another
   * @param oldHost Player losing host status
   * @param newHost Player gaining host status
   */
  transferHost(oldHost: Player, newHost: Player): void {
    oldHost.isHost = false;
    newHost.isHost = true;
  }

  /**
   * Check if player has submitted a guess for current round
   * @param player Player to check
   * @returns True if player has guessed
   */
  hasGuessed(player: Player): boolean {
    return player.currentRoundGuess !== null;
  }

  /**
   * Get player by ID from array
   * @param players Array of players
   * @param playerId Player ID
   * @returns Player or null if not found
   */
  getPlayerById(players: Player[], playerId: string): Player | null {
    return players.find(p => p.id === playerId) || null;
  }

  /**
   * Get player by socket ID from array
   * @param players Array of players
   * @param socketId Socket ID
   * @returns Player or null if not found
   */
  getPlayerBySocketId(players: Player[], socketId: string): Player | null {
    return players.find(p => p.socketId === socketId) || null;
  }

  /**
   * Check if username is taken in player array
   * @param players Array of players
   * @param username Username to check
   * @param excludePlayerId Optional player ID to exclude from check
   * @returns True if username is taken
   */
  isUsernameTaken(players: Player[], username: string, excludePlayerId?: string): boolean {
    const trimmedUsername = username.trim().toLowerCase();
    return players.some(
      p => p.username.toLowerCase() === trimmedUsername && p.id !== excludePlayerId
    );
  }

  /**
   * Get host player from array
   * @param players Array of players
   * @returns Host player or null if not found
   */
  getHostPlayer(players: Player[]): Player | null {
    return players.find(p => p.isHost) || null;
  }

  /**
   * Get connected players from array
   * @param players Array of players
   * @returns Array of connected players
   */
  getConnectedPlayers(players: Player[]): Player[] {
    return players.filter(p => p.connected);
  }

  /**
   * Get disconnected players from array
   * @param players Array of players
   * @returns Array of disconnected players
   */
  getDisconnectedPlayers(players: Player[]): Player[] {
    return players.filter(p => !p.connected);
  }

  /**
   * Sort players by total score (descending)
   * @param players Array of players
   * @returns Sorted array of players
   */
  sortPlayersByScore(players: Player[]): Player[] {
    return [...players].sort((a, b) => b.totalScore - a.totalScore);
  }
}
