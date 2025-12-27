import type { Lobby } from './lobby';
import type { Player } from './player';
import type { Station, StationWithTrains } from './station';
import type { RoundResults } from './game';

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
  lobby: Lobby;
  player: Player;
}

export interface LobbyUpdateEvent {
  lobby: Lobby;
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
