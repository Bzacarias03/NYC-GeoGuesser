/**
 * Station data structure matching the JSON file format
 * and spec requirements
 */
export interface StationCoordinate {
  latitude: number;
  longitude: number;
}

export interface Station {
  /** MTA Complex ID (unique per station complex) */
  id: string;
  /** Station display name */
  station_name: string;
  /** Comma-separated list of train lines serving this station */
  line: string;
  /** Latitude coordinate (center of the complex, used for display) */
  latitude: number;
  /** Longitude coordinate (center of the complex, used for display) */
  longitude: number;
  /** Borough where station is located */
  borough: string;
  /** Every platform in the complex; guesses are scored against the nearest */
  coordinates: StationCoordinate[];
}

/**
 * Station with parsed train lines array (for easier use)
 */
export interface StationWithTrains extends Station {
  /** Parsed array of train lines */
  trains: string[];
}

/**
 * Station identifier for tracking used stations
 */
export type StationId = string;
