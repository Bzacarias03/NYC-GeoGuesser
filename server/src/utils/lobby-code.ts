/**
 * Characters to use for lobby codes
 * Excludes confusing characters (0, O, I, 1, L) to avoid user errors
 */
const LOBBY_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a unique 6-character alphanumeric lobby code
 * Excludes confusing characters (0, O, I, 1, L)
 * 
 * @returns 6-character lobby code
 */
export function generateLobbyCode(): string {
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * LOBBY_CODE_CHARS.length);
    code += LOBBY_CODE_CHARS[randomIndex];
  }
  
  return code;
}

/**
 * Validate a lobby code format
 * @param code Code to validate
 * @returns True if code is valid format
 */
export function isValidLobbyCode(code: string): boolean {
  if (!code || code.length !== 6) {
    return false;
  }
  
  // Check all characters are valid
  for (const char of code.toUpperCase()) {
    if (!LOBBY_CODE_CHARS.includes(char)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Normalize lobby code (uppercase, trim)
 * @param code Code to normalize
 * @returns Normalized code
 */
export function normalizeLobbyCode(code: string): string {
  return code.trim().toUpperCase();
}
