// Game Configuration (matching server spec)
export const GAME_CONFIG = {
  TOTAL_ROUNDS: 5,
  ROUND_DURATION: 30, // seconds (updated to match spec)
  COUNTDOWN_DURATION: 5, // seconds (new - countdown before each round)
  MAX_PLAYERS_PER_LOBBY: 4, // updated to match spec
  MIN_PLAYERS_TO_START: 2,
  POINTS_MAX: 5000, // updated to match spec
  POINTS_MIN: 0,
} as const;

// NYC Map Configuration
export const MAP_CONFIG = {
  INITIAL_VIEWPORT: {
    longitude: -73.93567,
    latitude: 40.64817,
    zoom: 11,
  },
  MAX_ZOOM: 12.5,
  MIN_ZOOM: 9,
  NYC_BOUNDS: {
    north: 40.9476,
    south: 40.5074,
    east: -73.6004,
    west: -74.1391,
  },
} as const;

// Scoring Configuration
export const SCORING_CONFIG = {
  // Distance in meters for scoring calculation
  PERFECT_DISTANCE: 100, // meters - full points
  ZERO_POINTS_DISTANCE: 5000, // meters - zero points
  DISTANCE_MULTIPLIER: 0.8, // scoring curve multiplier
} as const;

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION: 300, // milliseconds
  TOAST_DURATION: 3000, // milliseconds
  AUTO_REDIRECT_DELAY: 2000, // milliseconds
  LOADING_TIMEOUT: 10000, // milliseconds
  DARK_BACKGROUND: '#242424', // Dark theme background color
  SIDEBAR_WIDTH: 320, // Sidebar width in pixels
} as const;

// API Configuration
export const API_CONFIG = {
  // Socket.io server URL
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080',
  // MapTiler API key for map rendering
  MAPTILER_API_KEY: import.meta.env.VITE_MAPTILER_API_KEY,
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOBBY: '/lobby',
  GAME: '/game/:gameSessionId',
  RESULTS: '/results/:lobbyId',
  CREATE_LOBBY: '/create',
  JOIN_LOBBY: '/join',
  JOIN_WITH_CODE: '/join/:lobbyCode', // Add this new route
} as const;

// Real-time Events (Socket.io event names)
// These match the server-side SERVER_EVENTS
// Note: Use SERVER_EVENTS from types/socket-events.ts instead
export const REALTIME_EVENTS = {
  LOBBY_JOINED: 'lobbyJoined',
  LOBBY_UPDATE: 'lobbyUpdate',
  COUNTDOWN_START: 'countdownStart',
  ROUND_START: 'roundStart',
  ROUND_END: 'roundEnd',
  GAME_END: 'gameEnd',
  ERROR: 'error',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  LOBBY_NOT_FOUND: 'Lobby not found. Please check the lobby code.',
  LOBBY_FULL: 'This lobby is full. Please try another one.',
  INVALID_PLAYER_NAME: 'Please enter a valid player name.',
  GAME_ALREADY_STARTED: 'This game has already started.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  TIMEOUT: 'Request timed out. Please try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOBBY_CREATED: 'Lobby created successfully!',
  JOINED_LOBBY: 'Successfully joined the lobby!',
  GUESS_SUBMITTED: 'Your guess has been submitted!',
  GAME_STARTED: 'Game started! Get ready for round 1.',
} as const;

// Map Styles
export const MAP_STYLES = {
  DEFAULT: `https://api.maptiler.com/maps/0197eb34-bcc7-7eed-b35a-396c93f1b7ad/style.json?key=${API_CONFIG.MAPTILER_API_KEY}`,
  SATELLITE: `https://api.maptiler.com/maps/satellite/style.json?key=${API_CONFIG.MAPTILER_API_KEY}`,
  TERRAIN: `https://api.maptiler.com/maps/terrain/style.json?key=${API_CONFIG.MAPTILER_API_KEY}`,
} as const;

// Player Colors for UI (matching SVG design)
export const PLAYER_COLORS = [
  '#FF00CC', // Magenta/Pink (Player 1)
  '#00B3FF', // Blue (Player 2)
  '#15FF00', // Green (Player 3)
  '#FFAA00', // Orange (Player 4)
  '#9C27B0', // Purple (Player 5)
  '#FF5722', // Deep Orange (Player 6)
  '#607D8B', // Blue Grey (Player 7)
  '#795548', // Brown (Player 8)
] as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  PLAYER_NAME: 'nyc-guesser-player-name',
  PLAYER_ID: 'nyc-guesser-player-id',
  GAME_SETTINGS: 'nyc-guesser-settings',
  RECENT_LOBBIES: 'nyc-guesser-recent-lobbies',
} as const; 