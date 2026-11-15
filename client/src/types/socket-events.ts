/**
 * Socket.io event type definitions for client
 * These match the server-side event types
 */

// Import server types that we need (these should be compatible)
// For now, we'll define compatible types on the client side

/**
 * Station base type (matching server Station type)
 */
export interface Station {
  /** MTA Complex ID (unique per station complex) */
  id: string;
  /** Station display name */
  station_name: string;
  /** Comma-separated list of train lines serving this station */
  line: string;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Borough where station is located */
  borough: string;
  /** Every platform in the complex; guesses are scored against the nearest */
  coordinates: Array<{ latitude: number; longitude: number }>;
}

/**
 * Station with train lines (matching server StationWithTrains type)
 */
export interface StationWithTrains extends Station {
  /** Parsed array of train lines */
  trains: string[];
}

/**
 * Station as sent while a round is in play: name and lines only.
 * Coordinates arrive with the round results.
 */
export type PublicStation = Omit<StationWithTrains, 'latitude' | 'longitude' | 'coordinates'>;

/**
 * Player object from server
 */
export interface ServerPlayer {
  id: string;
  username: string;
  isHost: boolean;
  totalScore: number;
  currentRoundGuess: { lat: number; lng: number } | null;
  currentRoundScore: number;
  connected: boolean;
  socketId: string;
  color?: string;
  /** Whether the player has guessed this round (guess itself is hidden until the round ends) */
  hasGuessed: boolean;
}

/**
 * Lobby object from server
 */
export interface ServerLobby {
  id: string;
  code: string;
  players: ServerPlayer[];
  gameState: 'waiting' | 'countdown' | 'active' | 'results' | 'finished';
  currentRound: number;
  currentStation: StationWithTrains | PublicStation | null;
  /** Id of the current (or last) game; shared by every player's analytics events */
  gameId: string | null;
  roundTimer: number;
  roundStartTime: number | null;
  gameResults: {
    finalScores: Array<{ playerId: string; playerName: string; totalScore: number }>;
    winner: { playerId: string; playerName: string; totalScore: number };
  } | null;
  createdAt: number;
  lastActiveAt: number;
}

/**
 * Round results (matching server RoundResults type)
 */
export interface RoundResults {
  /** Round number */
  roundNumber: number;
  /** Station that was guessed (uses Station, not StationWithTrains) */
  station: Station;
  /** All player guesses sorted by points (descending) */
  guesses: Array<{
    playerId: string;
    playerName: string;
    lat: number;
    lng: number;
    distance: number;
    points: number;
    submittedAt: number;
  }>;
  /** Timestamp when round ended */
  endedAt: number;
}

/**
 * Client to Server Events
 */
export interface CreateLobbyEvent {
  username: string;
}

export interface JoinLobbyEvent {
  code: string;
  username: string;
}

export interface StartGameEvent {
  // No payload - host only action
}

export interface MakeGuessEvent {
  lat: number;
  lng: number;
}

export interface LeaveLobbyEvent {
  // No payload
}

export interface RejoinLobbyEvent {
  sessionToken: string;
}

/**
 * Server to Client Events
 */
export interface LobbyJoinedEvent {
  lobby: ServerLobby;
  player: ServerPlayer;
  /** Secret for reclaiming this seat after a refresh or dropped connection */
  sessionToken: string;
}

export interface LobbyUpdateEvent {
  lobby: ServerLobby;
}

export interface CountdownStartEvent {
  station: PublicStation;
  countdown: number; // seconds remaining
  round: number;
  gameId: string;
}

export interface RoundStartEvent {
  station: PublicStation;
  timer: number; // seconds remaining
  round: number;
  gameId: string;
}

export interface RoundEndEvent {
  results: RoundResults;
  gameId: string;
}

export interface GameEndEvent {
  finalScores: Array<{ playerId: string; playerName: string; totalScore: number }>;
  winner: { playerId: string; playerName: string; totalScore: number };
  gameId: string;
}

export interface ErrorEvent {
  message: string;
  code?: string;
}

/**
 * Socket.io event names
 */
export const CLIENT_EVENTS = {
  CREATE_LOBBY: 'createLobby',
  JOIN_LOBBY: 'joinLobby',
  START_GAME: 'startGame',
  MAKE_GUESS: 'makeGuess',
  LEAVE_LOBBY: 'leaveLobby',
  REJOIN_LOBBY: 'rejoinLobby',
  REQUEST_GAME_STATE: 'requestGameState',
} as const;

export const SERVER_EVENTS = {
  LOBBY_JOINED: 'lobbyJoined',
  LOBBY_UPDATE: 'lobbyUpdate',
  COUNTDOWN_START: 'countdownStart',
  ROUND_START: 'roundStart',
  ROUND_END: 'roundEnd',
  GAME_END: 'gameEnd',
  ERROR: 'error',
} as const;
