import { readFileSync } from 'fs';
import { join } from 'path';
import type { Station } from '../types/station';

/**
 * Load station data from JSON file
 * @returns Array of stations
 */
export function loadStations(): Station[] {
  try {
    const filePath = join(process.cwd(), 'src', 'data', 'mta-stations.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    const stations: Station[] = JSON.parse(fileContent);
    
    // Validate structure
    if (!Array.isArray(stations)) {
      throw new Error('Station data must be an array');
    }
    
    // Validate each station has required fields
    stations.forEach((station, index) => {
      if (!station.station_name || typeof station.latitude !== 'number' || typeof station.longitude !== 'number') {
        throw new Error(`Invalid station at index ${index}: missing required fields`);
      }
    });
    
    return stations;
  } catch (error) {
    throw new Error('Failed to load station data');
  }
}

/**
 * Get station count
 */
export function getStationCount(): number {
  return loadStations().length;
}
