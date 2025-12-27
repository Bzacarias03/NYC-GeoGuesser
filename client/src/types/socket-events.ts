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
}

/**
 * Station with train lines (matching server StationWithTrains type)
 */
export interface StationWithTrains extends Station {
  /** Parsed array of train lines */
  trains: string[];
}

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
  currentStation: StationWithTrains | null;
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

/**
 * Server to Client Events
 */
export interface LobbyJoinedEvent {
  lobby: ServerLobby;
  player: ServerPlayer;
}

export interface LobbyUpdateEvent {
  lobby: ServerLobby;
}

export interface CountdownStartEvent {
  station: StationWithTrains;
  countdown: number; // seconds remaining
}

export interface RoundStartEvent {
  station: StationWithTrains;
  timer: number; // seconds remaining
}

export interface RoundEndEvent {
  results: RoundResults;
}

export interface GameEndEvent {
  finalScores: Array<{ playerId: string; playerName: string; totalScore: number }>;
  winner: { playerId: string; playerName: string; totalScore: number };
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
