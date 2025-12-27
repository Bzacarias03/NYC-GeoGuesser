/**
 * Game configuration constants matching spec requirements
 */
export const GAME_CONFIG = {
  /** Total number of rounds per game */
  TOTAL_ROUNDS: 5,
  /** Duration of each round in seconds */
  ROUND_DURATION: 30,
  /** Countdown duration before each round in seconds */
  COUNTDOWN_DURATION: 5,
  /** Maximum points per round */
  POINTS_MAX: 5000,
  /** Minimum points per round */
  POINTS_MIN: 0,
  /** Maximum players per lobby */
  MAX_PLAYERS_PER_LOBBY: 4,
  /** Minimum players required to start game */
  MIN_PLAYERS_TO_START: 2,
  /** Maximum distance for scoring calculation (50km) */
  MAX_DISTANCE_METERS: 50000,
} as const;

/**
 * Lobby configuration
 */
export const LOBBY_CONFIG = {
  /** Lobby code length */
  CODE_LENGTH: 6,
  /** Lobby expiration time in milliseconds (1 hour) */
  EXPIRATION_TIME_MS: 60 * 60 * 1000,
  /** Lobby cleanup interval in milliseconds (5 minutes) */
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000,
} as const;

/**
 * Timer configuration
 */
export const TIMER_CONFIG = {
  /** Timer update interval in milliseconds (1 second) */
  UPDATE_INTERVAL_MS: 1000,
} as const;

/**
 * Player Colors for UI (matching client constants)
 */
export const PLAYER_COLORS = [
  '#FF00CC', // Magenta/Pink (Player 1)
  '#00B3FF', // Blue (Player 2)
  '#15FF00', // Green (Player 3)
  '#FFAA00', // Orange (Player 4)
  '#9C27B0', // Purple (Player 5)
  '#FF5722', // Deep Orange (Player 6)
  '#607D8B', // Blue Grey (Player 7)
  '#795548', // Brown (Player 8)
] as const;
