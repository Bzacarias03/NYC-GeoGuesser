/**
 * Environment variable validation and configuration
 */

interface EnvConfig {
  PORT: number;
  CORS_ORIGIN: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

/**
 * Validate and get environment variables
 * @returns Validated environment configuration
 */
export function getEnvConfig(): EnvConfig {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  
  // Validate port
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  }
  
  // Validate CORS origin
  if (typeof corsOrigin !== 'string' || corsOrigin.length === 0) {
    throw new Error('CORS_ORIGIN must be a non-empty string');
  }
  
  // Validate NODE_ENV
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be 'development', 'production', or 'test'.`);
  }
  
  return {
    PORT: port,
    CORS_ORIGIN: corsOrigin,
    NODE_ENV: nodeEnv,
  };
}

/**
 * Get validated environment configuration
 * Throws error if configuration is invalid
 */
export const env = getEnvConfig();
