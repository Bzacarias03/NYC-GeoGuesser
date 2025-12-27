import { randomUUID } from 'crypto';
import type { Lobby, GameState } from '../types/lobby';
import type { Player } from '../types/player';
import { GAME_CONFIG, LOBBY_CONFIG } from '../config/constants';
import { generateLobbyCode } from '../utils/lobby-code';
import { validateUsername } from '../utils/validation';
import { getPlayerColor } from '../utils/player-color';

/**
 * LobbyManager handles all lobby-related operations
 * - Lobby creation with unique codes
 * - Player join/leave logic
 * - Host migration on disconnect
 * - Lobby cleanup (expiration, dissolution)
 * - Max players enforcement (4 players)
 */
export class LobbyManager {
  private lobbies: Map<string, Lobby> = new Map(); // Map<lobbyId, Lobby>
  private lobbyCodes: Map<string, string> = new Map(); // Map<code, lobbyId>
  private socketToLobby: Map<string, string> = new Map(); // Map<socketId, lobbyId>
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Create a new lobby with a unique code
   * @param socketId Socket ID of the creator
   * @param username Username of the creator
   * @returns Created lobby
   */
  createLobby(socketId: string, username: string): Lobby {
    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      throw new Error(usernameValidation.error || 'Invalid username');
    }

    // Check if socket is already in a lobby
    if (this.socketToLobby.has(socketId)) {
      throw new Error('Socket is already in a lobby');
    }

    // Generate unique lobby code
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      code = generateLobbyCode();
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('Failed to generate unique lobby code');
      }
    } while (this.lobbyCodes.has(code));

    // Create lobby ID
    const lobbyId = randomUUID();

    // Create host player
    const hostPlayerId = randomUUID();
    const hostPlayerColor = getPlayerColor(hostPlayerId);
    const hostPlayer: Player = {
      id: hostPlayerId,
      username: username.trim(),
      isHost: true,
      totalScore: 0,
      currentRoundGuess: null,
      currentRoundScore: 0,
      connected: true,
      socketId,
      color: hostPlayerColor,
    };

    // Create lobby
    const lobby: Lobby = {
      id: lobbyId,
      code,
      players: [hostPlayer],
      gameState: 'waiting',
      currentRound: 0,
      currentStation: null,
      roundTimer: 0,
      roundStartTime: null,
      gameResults: null,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    // Store lobby
    this.lobbies.set(lobbyId, lobby);
    this.lobbyCodes.set(code, lobbyId);
    this.socketToLobby.set(socketId, lobbyId);

    return lobby;
  }

  /**
   * Join an existing lobby
   * @param code Lobby code
   * @param socketId Socket ID of the player joining
   * @param username Username of the player joining
   * @returns Joined lobby
   */
  joinLobby(code: string, socketId: string, username: string): Lobby {
    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      throw new Error(usernameValidation.error || 'Invalid username');
    }

    // Check if socket is already in a lobby
    if (this.socketToLobby.has(socketId)) {
      throw new Error('Socket is already in a lobby');
    }

    // Find lobby by code
    const lobbyId = this.lobbyCodes.get(code.toUpperCase());
    if (!lobbyId) {
      throw new Error('Lobby not found');
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Check if lobby is full
    if (lobby.players.length >= GAME_CONFIG.MAX_PLAYERS_PER_LOBBY) {
      throw new Error('Lobby is full');
    }

    // Check if game has already started
    if (lobby.gameState !== 'waiting') {
      throw new Error('Game has already started');
    }

    // Check for duplicate username
    const trimmedUsername = username.trim();
    const hasDuplicateUsername = lobby.players.some(
      p => p.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (hasDuplicateUsername) {
      throw new Error('Username already taken in this lobby');
    }

    // Create player
    const playerId = randomUUID();
    const playerColor = getPlayerColor(playerId);
    const player: Player = {
      id: playerId,
      username: trimmedUsername,
      isHost: false,
      totalScore: 0,
      currentRoundGuess: null,
      currentRoundScore: 0,
      connected: true,
      socketId,
      color: playerColor,
    };

    // Add player to lobby
    lobby.players.push(player);
    lobby.lastActiveAt = Date.now();
    this.socketToLobby.set(socketId, lobbyId);

    return lobby;
  }

  /**
   * Leave a lobby
   * @param socketId Socket ID of the player leaving
   * @returns Updated lobby or null if lobby was dissolved
   */
  leaveLobby(socketId: string): Lobby | null {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) {
      return null; // Not in a lobby
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      this.socketToLobby.delete(socketId);
      return null;
    }

    // Remove player
    const playerIndex = lobby.players.findIndex(p => p.socketId === socketId);
    if (playerIndex === -1) {
      this.socketToLobby.delete(socketId);
      return lobby;
    }

    const player = lobby.players[playerIndex];
    if (!player) {
      this.socketToLobby.delete(socketId);
      return lobby;
    }

    const wasHost = player.isHost;
    lobby.players.splice(playerIndex, 1);
    lobby.lastActiveAt = Date.now();
    this.socketToLobby.delete(socketId);

    // If host left, migrate host to first remaining player
    if (wasHost && lobby.players.length > 0) {
      const newHost = lobby.players[0];
      if (newHost) {
        newHost.isHost = true;
      }
    }

    // If no players left, dissolve lobby
    if (lobby.players.length === 0) {
      this.dissolveLobby(lobbyId);
      return null;
    }

    return lobby;
  }

  /**
   * Get lobby by ID
   * @param lobbyId Lobby ID
   * @returns Lobby or null if not found
   */
  getLobby(lobbyId: string): Lobby | null {
    return this.lobbies.get(lobbyId) || null;
  }

  /**
   * Get lobby by code
   * @param code Lobby code
   * @returns Lobby or null if not found
   */
  getLobbyByCode(code: string): Lobby | null {
    const lobbyId = this.lobbyCodes.get(code.toUpperCase());
    if (!lobbyId) {
      return null;
    }
    return this.lobbies.get(lobbyId) || null;
  }

  /**
   * Get lobby ID for a socket
   * @param socketId Socket ID
   * @returns Lobby ID or null if not in a lobby
   */
  getLobbyIdForSocket(socketId: string): string | null {
    return this.socketToLobby.get(socketId) || null;
  }

  /**
   * Update lobby (for game state changes)
   * @param lobbyId Lobby ID
   * @param updates Partial lobby updates
   */
  updateLobby(lobbyId: string, updates: Partial<Lobby>): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return;
    }

    Object.assign(lobby, updates);
    lobby.lastActiveAt = Date.now();
  }

  /**
   * Mark player as disconnected
   * @param socketId Socket ID
   */
  markPlayerDisconnected(socketId: string): void {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) {
      return;
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return;
    }

    const player = lobby.players.find(p => p.socketId === socketId);
    if (player) {
      player.connected = false;
      lobby.lastActiveAt = Date.now();
    }
  }

  /**
   * Mark player as connected
   * @param socketId Socket ID
   */
  markPlayerConnected(socketId: string): void {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) {
      return;
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return;
    }

    const player = lobby.players.find(p => p.socketId === socketId);
    if (player) {
      player.connected = true;
      lobby.lastActiveAt = Date.now();
    }
  }

  /**
   * Check if player is host
   * @param socketId Socket ID
   * @returns True if player is host
   */
  isPlayerHost(socketId: string): boolean {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) {
      return false;
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return false;
    }

    const player = lobby.players.find(p => p.socketId === socketId);
    return player?.isHost || false;
  }

  /**
   * Dissolve a lobby (remove it completely)
   * @param lobbyId Lobby ID
   */
  private dissolveLobby(lobbyId: string): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return;
    }

    // Remove all socket mappings
    lobby.players.forEach(player => {
      this.socketToLobby.delete(player.socketId);
    });

    // Remove lobby code mapping
    this.lobbyCodes.delete(lobby.code);

    // Remove lobby
    this.lobbies.delete(lobbyId);
  }

  /**
   * Clean up expired lobbies
   */
  private cleanupExpiredLobbies(): void {
    const now = Date.now();
    const expiredLobbyIds: string[] = [];

    for (const [lobbyId, lobby] of this.lobbies.entries()) {
      // Check if lobby is expired (no activity for EXPIRATION_TIME_MS)
      const timeSinceLastActivity = now - lobby.lastActiveAt;
      if (timeSinceLastActivity > LOBBY_CONFIG.EXPIRATION_TIME_MS) {
        expiredLobbyIds.push(lobbyId);
      }
    }

    // Dissolve expired lobbies
    expiredLobbyIds.forEach(lobbyId => {
      this.dissolveLobby(lobbyId);
    });
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredLobbies();
    }, LOBBY_CONFIG.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get all lobbies (for debugging/admin)
   */
  getAllLobbies(): Lobby[] {
    return Array.from(this.lobbies.values());
  }

  /**
   * Get lobby count (for debugging/admin)
   */
  getLobbyCount(): number {
    return this.lobbies.size;
  }
}
