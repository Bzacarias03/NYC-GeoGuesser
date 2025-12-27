import { v4 as uuidv4 } from 'uuid';
import { GAME_CONFIG, SCORING_CONFIG, STORAGE_KEYS, MAP_CONFIG } from '../constants';
import type { Coordinates } from '../types';

// Distance calculation using Haversine formula
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (coord1.lat * Math.PI) / 180;
  const lat2Rad = (coord2.lat * Math.PI) / 180;
  const deltaLatRad = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLngRad = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a = 
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate points based on distance (closer = more points)
export const calculatePoints = (distance: number): number => {
  const { PERFECT_DISTANCE, ZERO_POINTS_DISTANCE, DISTANCE_MULTIPLIER } = SCORING_CONFIG;
  const { POINTS_MAX, POINTS_MIN } = GAME_CONFIG;

  if (distance <= PERFECT_DISTANCE) {
    return POINTS_MAX;
  }

  if (distance >= ZERO_POINTS_DISTANCE) {
    return POINTS_MIN;
  }

  // Exponential decay scoring
  const normalizedDistance = distance / ZERO_POINTS_DISTANCE;
  const score = POINTS_MAX * Math.pow(1 - normalizedDistance, DISTANCE_MULTIPLIER);

  return Math.max(POINTS_MIN, Math.round(score));
};

// Generate unique ID
export const generateId = (): string => {
  return uuidv4();
};

// Generate lobby code (6 character alphanumeric)
export const generateLobbyCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if coordinates are within NYC bounds
export const isWithinNYCBounds = (coordinates: Coordinates): boolean => {
  const { NYC_BOUNDS } = MAP_CONFIG;
  return (
    coordinates.lat >= NYC_BOUNDS.south &&
    coordinates.lat <= NYC_BOUNDS.north &&
    coordinates.lng >= NYC_BOUNDS.west &&
    coordinates.lng <= NYC_BOUNDS.east
  );
};

// Local storage helpers
export const saveToStorage = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const loadFromStorage = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// Player management helpers
export const savePlayerData = (playerId: string, playerName: string): void => {
  saveToStorage(STORAGE_KEYS.PLAYER_ID, playerId);
  saveToStorage(STORAGE_KEYS.PLAYER_NAME, playerName);
};

export const loadPlayerData = (): { id: string; name: string } | null => {
  const id = loadFromStorage<string>(STORAGE_KEYS.PLAYER_ID);
  const name = loadFromStorage<string>(STORAGE_KEYS.PLAYER_NAME);
  
  return id && name ? { id, name } : null;
};

export const clearPlayerData = (): void => {
  removeFromStorage(STORAGE_KEYS.PLAYER_ID);
  removeFromStorage(STORAGE_KEYS.PLAYER_NAME);
};

// Validation helpers
export const isValidPlayerName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 20;
};

export const isValidLobbyName = (name: string): boolean => {
  return name.trim().length >= 3 && name.trim().length <= 50;
};

// Debounce function for performance optimization
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for performance optimization
export const throttle = <T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Format player score for display
export const formatScore = (score: number): string => {
  return score.toLocaleString();
}; 