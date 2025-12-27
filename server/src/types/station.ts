/**
 * Station data structure matching the JSON file format
 * and spec requirements
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
