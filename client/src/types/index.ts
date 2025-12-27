// Utility Types
export interface Coordinates {
  lat: number;
  lng: number;
}

// Station type (matches server Station type)
export interface MTAStation {
  station_name: string;
  line: string;
  latitude: number;
  longitude: number;
  borough: string;
} 