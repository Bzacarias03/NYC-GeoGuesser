import type { Lobby } from '../types/lobby';
import type { Player } from '../types/player';
import type { Station, StationWithTrains } from '../types/station';
import { parseStationTrains } from './station-filter';

/**
 * Station as shown to players while a round is in play: name and lines only.
 * Coordinates are withheld until the round ends so the answer can't be read
 * from the network traffic.
 */
export type PublicStation = Omit<StationWithTrains, 'latitude' | 'longitude' | 'coordinates'>;

/** Player as broadcast to the lobby; guesses are hidden while a round is in play */
export interface PublicPlayer extends Player {
  /** Whether the player has guessed this round (safe to show during the round) */
  hasGuessed: boolean;
}

export interface PublicLobby extends Omit<Lobby, 'players' | 'currentStation'> {
  players: PublicPlayer[];
  currentStation: Station | PublicStation | null;
}

export function toPublicStation(station: Station): PublicStation {
  const { latitude: _latitude, longitude: _longitude, coordinates: _coordinates, ...rest } = parseStationTrains(station);
  return rest;
}

/**
 * Everything sent to clients about a lobby goes through here. During the
 * countdown and active round, other players' guesses and the station's
 * location are stripped; they are revealed with the round results.
 */
export function toPublicLobby(lobby: Lobby): PublicLobby {
  const inPlay = lobby.gameState === 'countdown' || lobby.gameState === 'active';

  return {
    ...lobby,
    players: lobby.players.map(player => ({
      ...player,
      hasGuessed: player.currentRoundGuess !== null,
      ...(inPlay ? { currentRoundGuess: null, currentRoundScore: 0 } : {}),
    })),
    currentStation: inPlay && lobby.currentStation ? toPublicStation(lobby.currentStation) : lobby.currentStation,
  };
}
