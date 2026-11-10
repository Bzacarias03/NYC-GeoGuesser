import { GAME_CONFIG } from '../config/constants';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 * 
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLatRad = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLngRad = ((lng2 - lng1) * Math.PI) / 180;
  
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate points based on distance from target
 * Quadratic falloff from BenMusch/transit-guessr:
 * points = 5000 * (max(0, 20000 - distance) / 20000)^2
 *
 * @param distanceMeters Distance in meters from the target station
 * @returns Points awarded (0-5000)
 */
export function calculatePoints(distanceMeters: number): number {
  const remaining = Math.max(GAME_CONFIG.ZERO_POINT_DISTANCE_METERS - distanceMeters, 0);
  return Math.round(GAME_CONFIG.POINTS_MAX * (remaining / GAME_CONFIG.ZERO_POINT_DISTANCE_METERS) ** 2);
}

/**
 * Calculate points for a guess against the nearest platform of a station complex
 * @param guessLat Guess latitude
 * @param guessLng Guess longitude
 * @param targets Platform coordinates of the target station
 * @returns Object with distance to the nearest platform (meters) and points
 */
export function calculateGuessScore(
  guessLat: number,
  guessLng: number,
  targets: Array<{ latitude: number; longitude: number }>
): { distance: number; points: number } {
  const distance = Math.min(
    ...targets.map(target => calculateDistance(guessLat, guessLng, target.latitude, target.longitude))
  );
  const points = calculatePoints(distance);

  return { distance, points };
}
