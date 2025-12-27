import type { Station, StationWithTrains } from '../types/station';

/**
 * Limited service and overnight-only routes to exclude
 * These routes don't run during weekday daytime service
 */
const EXCLUDED_ROUTES = new Set([
  'SIR', // Staten Island Railway (separate system)
  'H',   // Rockaway Park Shuttle (limited service)
  'S',   // 42nd Street Shuttle (not a regular route for geo-guessing)
]);

/**
 * Filter stations to only include those with weekday daytime service
 * Excludes limited service and overnight-only routes
 * 
 * @param stations Array of stations to filter
 * @returns Filtered array of stations with weekday daytime service
 */
export function filterWeekdayDaytimeStations(stations: Station[]): Station[] {
  return stations.filter(station => {
    // Parse train lines from comma-separated string
    const lines = station.line.split(',').map(line => line.trim());
    
    // Check if station has at least one non-excluded route
    const hasValidService = lines.some(line => !EXCLUDED_ROUTES.has(line));
    
    return hasValidService;
  });
}

/**
 * Parse station lines into array and add to station object
 * @param station Station with comma-separated line string
 * @returns Station with parsed trains array
 */
export function parseStationTrains(station: Station): StationWithTrains {
  const trains = station.line
    .split(',')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !EXCLUDED_ROUTES.has(line));
  
  return {
    ...station,
    trains,
  };
}

/**
 * Get all stations with weekday daytime service and parsed trains
 * @param stations Array of stations to process
 * @returns Filtered and parsed stations
 */
export function getFilteredStationsWithTrains(stations: Station[]): StationWithTrains[] {
  const filtered = filterWeekdayDaytimeStations(stations);
  return filtered.map(parseStationTrains);
}
