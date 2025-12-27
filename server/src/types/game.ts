import type { Station } from './station';
import type { Player } from './player';

/**
 * Round status
 */
export type RoundStatus = 'waiting' | 'countdown' | 'active' | 'completed';

/**
 * Round data structure
 */
export interface Round {
  /** Round number (1-5) */
  roundNumber: number;
  /** Station for this round */
  station: Station;
  /** Round status */
  status: RoundStatus;
  /** Timestamp when round started */
  startTime: number | null;
  /** Timestamp when round ended */
  endTime: number | null;
  /** Time remaining in seconds */
  timeRemaining: number;
}

/**
 * Player guess for a round
 */
export interface PlayerGuess {
  /** Player ID */
  playerId: string;
  /** Player username */
  playerName: string;
  /** Guess latitude */
  lat: number;
  /** Guess longitude */
  lng: number;
  /** Distance from actual station in meters */
  distance: number;
  /** Points awarded for this guess */
  points: number;
  /** Timestamp when guess was submitted */
  submittedAt: number;
}

/**
 * Round results
 */
export interface RoundResults {
  /** Round number */
  roundNumber: number;
  /** Station that was guessed */
  station: Station;
  /** All player guesses sorted by points (descending) */
  guesses: PlayerGuess[];
  /** Timestamp when round ended */
  endedAt: number;
}

/**
 * Game session data
 */
export interface GameSession {
  /** Game session ID */
  id: string;
  /** Lobby ID this game belongs to */
  lobbyId: string;
  /** Current round number */
  currentRound: number;
  /** Total rounds (5) */
  totalRounds: number;
  /** Array of used station IDs to prevent repeats */
  usedStationIds: string[];
  /** Array of completed round results */
  roundResults: RoundResults[];
  /** Game status */
  status: 'waiting' | 'in_progress' | 'completed';
  /** Timestamp when game started */
  startedAt: number | null;
  /** Timestamp when game ended */
  endedAt: number | null;
}
