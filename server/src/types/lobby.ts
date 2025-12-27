import type { Player } from './player';
import type { Station } from './station';

/**
 * Game state enum
 */
export type GameState = 'waiting' | 'countdown' | 'active' | 'results' | 'finished';

/**
 * Lobby object matching spec requirements
 */
export interface Lobby {
  /** Unique lobby identifier */
  id: string;
  /** 6-character alphanumeric lobby code */
  code: string;
  /** Array of Player objects (max 4) */
  players: Player[];
  /** Current game state */
  gameState: GameState;
  /** Current round number (1-5) */
  currentRound: number;
  /** Current station object from stations list */
  currentStation: Station | null;
  /** Countdown timer value (seconds) */
  roundTimer: number;
  /** Timestamp for round timing */
  roundStartTime: number | null;
  /** Final scores and rankings */
  gameResults: {
    finalScores: Array<{ playerId: string; playerName: string; totalScore: number }>;
    winner: { playerId: string; playerName: string; totalScore: number };
  } | null;
  /** Timestamp when lobby was created */
  createdAt: number;
  /** Timestamp when lobby was last active */
  lastActiveAt: number;
}