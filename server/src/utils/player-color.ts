import { PLAYER_COLORS } from '../config/constants';

/**
 * Get consistent color for a player based on their ID
 * Uses the same hash function as the client to ensure consistency
 * @param playerId Player ID
 * @returns Color hex string
 */
export function getPlayerColor(playerId: string): string {
  // Simple hash function to get consistent color based on player ID
  // This matches the client-side implementation in LobbyPage.tsx
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const colorIndex = Math.abs(hash) % PLAYER_COLORS.length;
  const color = PLAYER_COLORS[colorIndex];
  // TypeScript: colorIndex is guaranteed to be within bounds, so color is defined
  if (!color) {
    throw new Error(`Invalid color index: ${colorIndex}`);
  }
  return color;
}

