import type { Station } from '../types/station';

/**
 * Select a random station from the available stations
 * Excludes stations that have already been used
 * 
 * @param stations Array of available stations
 * @param usedStationIds Set of station IDs that have already been used
 * @returns Random station that hasn't been used, or null if all stations used
 */
export function selectRandomStation(
  stations: Station[],
  usedStationIds: Set<string>
): Station | null {
  // Filter out used stations
  const availableStations = stations.filter(station => {
    // Use station_name as unique identifier
    const stationId = getStationId(station);
    return !usedStationIds.has(stationId);
  });
  
  if (availableStations.length === 0) {
    return null; // All stations have been used
  }
  
  // Select random station from available ones
  const randomIndex = Math.floor(Math.random() * availableStations.length);
  const selected = availableStations[randomIndex];
  return selected || null;
}

/**
 * Get unique identifier for a station
 * Uses station_name as the ID since JSON doesn't have explicit IDs
 * 
 * @param station Station object
 * @returns Unique station identifier
 */
export function getStationId(station: Station): string {
  return station.station_name;
}

/**
 * Select multiple random stations for a game
 * Ensures no repeats within the selection
 * 
 * @param stations Array of available stations
 * @param count Number of stations to select
 * @param usedStationIds Set of station IDs already used (optional)
 * @returns Array of randomly selected stations
 */
export function selectRandomStations(
  stations: Station[],
  count: number,
  usedStationIds: Set<string> = new Set()
): Station[] {
  const selected: Station[] = [];
  const used = new Set(usedStationIds);
  
  for (let i = 0; i < count; i++) {
    const station = selectRandomStation(stations, used);
    
    if (!station) {
      // Not enough stations available
      break;
    }
    
    selected.push(station);
    used.add(getStationId(station));
  }
  
  return selected;
}
