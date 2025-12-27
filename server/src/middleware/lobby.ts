import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';
import { validateUsername } from '../utils/validation';
import { generateLobbyCode } from '../utils/lobby-code';

/**
 * Lobby validation middleware
 * Provides validation helpers for lobby-related operations
 */

/**
 * Validate lobby code format
 * @param code Lobby code to validate
 * @returns True if valid, throws error if invalid
 */
export function validateLobbyCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    throw new AppError('Lobby code is required', 400, 'INVALID_LOBBY_CODE');
  }

  const trimmedCode = code.trim().toUpperCase();
  
  if (trimmedCode.length !== 6) {
    throw new AppError('Lobby code must be 6 characters', 400, 'INVALID_LOBBY_CODE');
  }

  if (!/^[A-Z0-9]{6}$/.test(trimmedCode)) {
    throw new AppError('Lobby code must contain only letters and numbers', 400, 'INVALID_LOBBY_CODE');
  }

  return true;
}

/**
 * Validate username for lobby operations
 * @param username Username to validate
 * @returns True if valid, throws error if invalid
 */
export function validateLobbyUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    throw new AppError('Username is required', 400, 'INVALID_USERNAME');
  }

  const validation = validateUsername(username);
  if (!validation.valid) {
    throw new AppError(
      validation.error || 'Invalid username',
      400,
      'INVALID_USERNAME'
    );
  }

  return true;
}

/**
 * Middleware to validate lobby code in request body
 * Expects { code: string } in req.body
 */
export function validateLobbyCodeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { code } = req.body;
    validateLobbyCode(code);
    // Normalize code to uppercase
    req.body.code = code.trim().toUpperCase();
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to validate username in request body
 * Expects { username: string } in req.body
 */
export function validateUsernameMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { username } = req.body;
    validateLobbyUsername(username);
    // Normalize username
    req.body.username = username.trim();
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to validate lobby join request
 * Expects { code: string, username: string } in req.body
 */
export function validateLobbyJoinMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { code, username } = req.body;
    validateLobbyCode(code);
    validateLobbyUsername(username);
    // Normalize inputs
    req.body.code = code.trim().toUpperCase();
    req.body.username = username.trim();
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Generate a unique lobby code (utility function)
 * Note: This doesn't check for uniqueness - that's handled by LobbyManager
 * @returns Generated lobby code
 */
export function generateLobbyCodeHelper(): string {
  return generateLobbyCode();
}
