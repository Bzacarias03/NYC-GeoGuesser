import { randomUUID } from 'crypto';
import type { Lobby, GameState } from '../types/lobby';
import type { Player } from '../types/player';
import type { Station } from '../types/station';
import type { RoundResults, PlayerGuess } from '../types/game';
import { GAME_CONFIG } from '../config/constants';
import { selectRandomStation, getStationId } from '../utils/station-selector';
import { calculateGuessScore } from '../utils/scoring';
import { validateCoordinates, validateNYCBounds } from '../utils/validation';

/**
 * GameManager handles all game-related operations
 * - Game state machine (waiting → countdown → active → results → finished)
 * - Round management (5 rounds)
 * - Station selection (no repeats)
 * - Timer management (5s countdown, 30s round)
 * - Guess collection and validation
 * - Round results calculation
 * - Game completion logic
 */
export class GameManager {
  private activeGames: Map<string, GameState> = new Map(); // Map<lobbyId, GameState>
  private roundTimers: Map<string, NodeJS.Timeout> = new Map(); // Map<lobbyId, Timer>
  private usedStations: Map<string, Set<string>> = new Map(); // Map<lobbyId, Set<stationId>>
  private playerGuesses: Map<string, Map<string, PlayerGuess>> = new Map(); // Map<lobbyId, Map<playerId, PlayerGuess>>

  /**
   * Start a game for a lobby
   * @param lobby Lobby to start game for
   * @param availableStations Array of available stations
   * @returns Updated lobby
   */
  startGame(lobby: Lobby, availableStations: Station[]): Lobby {
    if (lobby.gameState !== 'waiting') {
      throw new Error('Game can only be started from waiting state');
    }

    if (lobby.players.length < GAME_CONFIG.MIN_PLAYERS_TO_START) {
      throw new Error(`Need at least ${GAME_CONFIG.MIN_PLAYERS_TO_START} players to start`);
    }

    // Initialize game state
    this.activeGames.set(lobby.id, 'countdown');
    this.usedStations.set(lobby.id, new Set());
    this.playerGuesses.set(lobby.id, new Map());

    // Reset all player scores and guesses
    lobby.players.forEach(player => {
      player.totalScore = 0;
      player.currentRoundGuess = null;
      player.currentRoundScore = 0;
    });

    // Start first round
    return this.startRound(lobby, availableStations);
  }

  /**
   * Start a new round
   * @param lobby Lobby
   * @param availableStations Array of available stations
   * @returns Updated lobby
   */
  startRound(lobby: Lobby, availableStations: Station[]): Lobby {
    // Clear previous round guesses
    const guessesMap = this.playerGuesses.get(lobby.id);
    if (guessesMap) {
      guessesMap.clear();
    }

    // Reset player round guesses
    lobby.players.forEach(player => {
      player.currentRoundGuess = null;
      player.currentRoundScore = 0;
    });

    // Select random station (no repeats)
    const usedStationIds = this.usedStations.get(lobby.id) || new Set();
    const station = selectRandomStation(availableStations, usedStationIds);

    if (!station) {
      throw new Error('No available stations remaining');
    }

    // Mark station as used
    usedStationIds.add(getStationId(station));
    this.usedStations.set(lobby.id, usedStationIds);

    // Update lobby state
    lobby.currentRound += 1;
    lobby.currentStation = station;
    lobby.gameState = 'countdown';
    lobby.roundTimer = GAME_CONFIG.COUNTDOWN_DURATION;
    lobby.roundStartTime = Date.now();

    // Store game state
    this.activeGames.set(lobby.id, 'countdown');

    return lobby;
  }

  /**
   * Start countdown for current round
   * @param lobby Lobby
   * @returns Updated lobby
   */
  startCountdown(lobby: Lobby): Lobby {
    if (lobby.gameState !== 'countdown') {
      throw new Error('Can only start countdown from countdown state');
    }

    lobby.gameState = 'countdown';
    lobby.roundTimer = GAME_CONFIG.COUNTDOWN_DURATION;
    lobby.roundStartTime = Date.now();
    this.activeGames.set(lobby.id, 'countdown');

    return lobby;
  }

  /**
   * Start active round (after countdown)
   * @param lobby Lobby
   * @returns Updated lobby
   */
  startActiveRound(lobby: Lobby): Lobby {
    if (lobby.gameState !== 'countdown') {
      throw new Error('Can only start active round from countdown state');
    }

    lobby.gameState = 'active';
    lobby.roundTimer = GAME_CONFIG.ROUND_DURATION;
    lobby.roundStartTime = Date.now();
    this.activeGames.set(lobby.id, 'active');

    return lobby;
  }

  /**
   * Submit a guess for a player
   * @param lobby Lobby
   * @param playerId Player ID
   * @param lat Latitude
   * @param lng Longitude
   * @returns Updated lobby
   */
  submitGuess(lobby: Lobby, playerId: string, lat: number, lng: number): Lobby {
    if (lobby.gameState !== 'active') {
      throw new Error('Can only submit guesses during active round');
    }

    if (!lobby.currentStation) {
      throw new Error('No station selected for current round');
    }

    // Validate coordinates
    const coordValidation = validateCoordinates(lat, lng);
    if (!coordValidation.valid) {
      throw new Error(coordValidation.error || 'Invalid coordinates');
    }

    // Validate NYC bounds (optional, but recommended)
    const boundsValidation = validateNYCBounds(lat, lng);
    if (!boundsValidation.valid) {
      // Warn but don't block - allow guesses outside bounds
    }

    // Find player
    const player = lobby.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Allow updating guesses - remove the check that blocks multiple guesses
    // Players can update their guess multiple times during a round

    // Calculate score
    const score = calculateGuessScore(
      lat,
      lng,
      lobby.currentStation.latitude,
      lobby.currentStation.longitude
    );

    // Create or update guess
    const guess: PlayerGuess = {
      playerId,
      playerName: player.username,
      lat,
      lng,
      distance: score.distance,
      points: score.points,
      submittedAt: Date.now(),
    };

    // Store or update guess (allows multiple guesses per player)
    const guessesMap = this.playerGuesses.get(lobby.id);
    if (!guessesMap) {
      this.playerGuesses.set(lobby.id, new Map());
    }
    this.playerGuesses.get(lobby.id)!.set(playerId, guess);

    // Update player state
    player.currentRoundGuess = { lat, lng };
    player.currentRoundScore = score.points;

    return lobby;
  }

  /**
   * End current round and calculate results
   * @param lobby Lobby
   * @returns Round results
   */
  endRound(lobby: Lobby): RoundResults {
    if (lobby.gameState !== 'active') {
      throw new Error('Can only end round from active state');
    }

    if (!lobby.currentStation) {
      throw new Error('No station selected for current round');
    }

    // Get all guesses for this round
    const guessesMap = this.playerGuesses.get(lobby.id) || new Map();
    const guesses: PlayerGuess[] = Array.from(guessesMap.values());

    // Sort guesses by points (descending)
    guesses.sort((a, b) => b.points - a.points);

    // Update player total scores
    guesses.forEach(guess => {
      const player = lobby.players.find(p => p.id === guess.playerId);
      if (player) {
        player.totalScore += guess.points;
      }
    });

    // Create round results
    const roundResults: RoundResults = {
      roundNumber: lobby.currentRound,
      station: lobby.currentStation,
      guesses,
      endedAt: Date.now(),
    };

    // Update lobby state
    lobby.gameState = 'results';
    this.activeGames.set(lobby.id, 'results');

    return roundResults;
  }

  /**
   * Move to next round or end game
   * @param lobby Lobby
   * @param availableStations Array of available stations
   * @returns Updated lobby and whether game is complete
   */
  nextRound(lobby: Lobby, availableStations: Station[]): { lobby: Lobby; gameComplete: boolean } {
    if (lobby.gameState !== 'results') {
      throw new Error('Can only move to next round from results state');
    }

    // Check if game is complete
    if (lobby.currentRound >= GAME_CONFIG.TOTAL_ROUNDS) {
      return { lobby: this.endGame(lobby), gameComplete: true };
    }

    // Start next round
    const updatedLobby = this.startRound(lobby, availableStations);
    return { lobby: updatedLobby, gameComplete: false };
  }

  /**
   * End game and calculate final results
   * @param lobby Lobby
   * @returns Updated lobby
   */
  endGame(lobby: Lobby): Lobby {
    // Calculate final scores
    const finalScores = lobby.players
      .map(player => ({
        playerId: player.id,
        playerName: player.username,
        totalScore: player.totalScore,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    // Determine winner (should always exist if game ended)
    if (finalScores.length === 0) {
      throw new Error('Cannot end game with no players');
    }

    // TypeScript: We've checked length > 0, so [0] is guaranteed to exist
    const winner = finalScores[0]!;

    // Update lobby
    lobby.gameState = 'finished';
    lobby.gameResults = {
      finalScores,
      winner,
    };
    lobby.currentStation = null;
    lobby.roundTimer = 0;
    lobby.roundStartTime = null;

    // Clean up game state
    this.activeGames.delete(lobby.id);
    this.usedStations.delete(lobby.id);
    this.playerGuesses.delete(lobby.id);
    this.clearRoundTimer(lobby.id);

    return lobby;
  }

  /**
   * Get current game state for a lobby
   * @param lobbyId Lobby ID
   * @returns Game state or null
   */
  getGameState(lobbyId: string): GameState | null {
    return this.activeGames.get(lobbyId) || null;
  }

  /**
   * Check if game is active
   * @param lobbyId Lobby ID
   * @returns True if game is active
   */
  isGameActive(lobbyId: string): boolean {
    const state = this.activeGames.get(lobbyId);
    return state !== undefined && state !== 'waiting' && state !== 'finished';
  }

  /**
   * Get player guess for current round
   * @param lobbyId Lobby ID
   * @param playerId Player ID
   * @returns Player guess or null
   */
  getPlayerGuess(lobbyId: string, playerId: string): PlayerGuess | null {
    const guessesMap = this.playerGuesses.get(lobbyId);
    if (!guessesMap) {
      return null;
    }
    return guessesMap.get(playerId) || null;
  }

  /**
   * Check if player has guessed in current round
   * @param lobbyId Lobby ID
   * @param playerId Player ID
   * @returns True if player has guessed
   */
  hasPlayerGuessed(lobbyId: string, playerId: string): boolean {
    return this.getPlayerGuess(lobbyId, playerId) !== null;
  }

  /**
   * Get all guesses for current round
   * @param lobbyId Lobby ID
   * @returns Array of player guesses
   */
  getAllGuesses(lobbyId: string): PlayerGuess[] {
    const guessesMap = this.playerGuesses.get(lobbyId);
    if (!guessesMap) {
      return [];
    }
    return Array.from(guessesMap.values());
  }

  /**
   * Set round timer
   * @param lobbyId Lobby ID
   * @param timer NodeJS.Timeout
   */
  setRoundTimer(lobbyId: string, timer: NodeJS.Timeout): void {
    // Clear existing timer if any
    this.clearRoundTimer(lobbyId);
    this.roundTimers.set(lobbyId, timer);
  }

  /**
   * Clear round timer
   * @param lobbyId Lobby ID
   */
  clearRoundTimer(lobbyId: string): void {
    const timer = this.roundTimers.get(lobbyId);
    if (timer) {
      clearTimeout(timer);
      this.roundTimers.delete(lobbyId);
    }
  }

  /**
   * Clean up game state for a lobby
   * @param lobbyId Lobby ID
   */
  cleanupGame(lobbyId: string): void {
    this.activeGames.delete(lobbyId);
    this.usedStations.delete(lobbyId);
    this.playerGuesses.delete(lobbyId);
    this.clearRoundTimer(lobbyId);
  }
}
