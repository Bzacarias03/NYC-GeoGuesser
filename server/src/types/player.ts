/**
 * Player object matching spec requirements
 */
export interface Player {
  /** Unique socket ID */
  id: string;
  /** Player-chosen display name */
  username: string;
  /** Boolean indicating lobby host */
  isHost: boolean;
  /** Accumulated points across all rounds */
  totalScore: number;
  /** Current round guess coordinates {lat, lng} */
  currentRoundGuess: { lat: number; lng: number } | null;
  /** Points earned in current round */
  currentRoundScore: number;
  /** Connection status */
  connected: boolean;
  /** Socket ID for connection management */
  socketId: string;
  /** Color for UI display */
  color?: string;
}