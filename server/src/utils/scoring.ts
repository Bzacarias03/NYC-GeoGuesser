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
 * Maximum distance for scoring calculation (50km - diagonal of NYC)
 * Beyond this distance, players get 0 points
 */
const MAX_DISTANCE = 50000; // meters

/**
 * Maximum points per round
 */
const MAX_POINTS = 5000;

/**
 * Calculate points based on distance from target
 * Formula: points = max(0, 5000 * (1 - distance / 50000))
 * 
 * @param distanceMeters Distance in meters from the target station
 * @returns Points awarded (0-5000)
 */
export function calculatePoints(distanceMeters: number): number {
  // Clamp distance to max distance
  const normalizedDistance = Math.min(distanceMeters, MAX_DISTANCE);
  
  // Calculate points using spec formula
  const points = MAX_POINTS * (1 - normalizedDistance / MAX_DISTANCE);
  
  // Ensure points are between 0 and MAX_POINTS
  return Math.max(0, Math.round(points));
}

/**
 * Calculate points for a guess
 * @param guessLat Guess latitude
 * @param guessLng Guess longitude
 * @param targetLat Target station latitude
 * @param targetLng Target station longitude
 * @returns Object with distance (meters) and points
 */
export function calculateGuessScore(
  guessLat: number,
  guessLng: number,
  targetLat: number,
  targetLng: number
): { distance: number; points: number } {
  const distance = calculateDistance(guessLat, guessLng, targetLat, targetLng);
  const points = calculatePoints(distance);
  
  return { distance, points };
}
