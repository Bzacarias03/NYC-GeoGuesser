import { isValidLobbyCode, normalizeLobbyCode } from './lobby-code';

/**
 * Validate username
 * @param username Username to validate
 * @returns Validation result with error message if invalid
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Username cannot be empty' };
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  
  // Check for valid characters (alphanumeric, spaces, hyphens, underscores)
  const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Username contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Validate lobby code
 * @param code Lobby code to validate
 * @returns Validation result with normalized code and error message if invalid
 */
export function validateLobbyCode(code: string): { valid: boolean; normalizedCode?: string; error?: string } {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Lobby code is required' };
  }
  
  const normalized = normalizeLobbyCode(code);
  
  if (!isValidLobbyCode(normalized)) {
    return { valid: false, error: 'Invalid lobby code format' };
  }
  
  return { valid: true, normalizedCode: normalized };
}

/**
 * Validate coordinates
 * @param lat Latitude
 * @param lng Longitude
 * @returns Validation result with error message if invalid
 */
export function validateCoordinates(lat: number, lng: number): { valid: boolean; error?: string } {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' };
  }
  
  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, error: 'Coordinates cannot be NaN' };
  }
  
  if (!isFinite(lat) || !isFinite(lng)) {
    return { valid: false, error: 'Coordinates must be finite numbers' };
  }
  
  // Validate latitude range (-90 to 90)
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }
  
  // Validate longitude range (-180 to 180)
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }
  
  return { valid: true };
}

/**
 * Validate coordinates are within NYC bounds
 * @param lat Latitude
 * @param lng Longitude
 * @returns Validation result with error message if invalid
 */
export function validateNYCBounds(lat: number, lng: number): { valid: boolean; error?: string } {
  const coordValidation = validateCoordinates(lat, lng);
  if (!coordValidation.valid) {
    return coordValidation;
  }
  
  // NYC bounds (approximate)
  const NYC_BOUNDS = {
    north: 40.9476,
    south: 40.5074,
    east: -73.6004,
    west: -74.1391,
  };
  
  if (lat < NYC_BOUNDS.south || lat > NYC_BOUNDS.north) {
    return { valid: false, error: 'Coordinates are outside NYC bounds' };
  }
  
  if (lng < NYC_BOUNDS.west || lng > NYC_BOUNDS.east) {
    return { valid: false, error: 'Coordinates are outside NYC bounds' };
  }
  
  return { valid: true };
}
