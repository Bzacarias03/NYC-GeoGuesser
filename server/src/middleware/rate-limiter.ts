import type { Request, Response, NextFunction } from 'express';

/**
 * Rate limiter configuration
 */
interface RateLimiterConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

/**
 * Default rate limiter configuration
 */
const DEFAULT_CONFIG: RateLimiterConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
};

/**
 * In-memory store for rate limiting
 * In production, consider using Redis or similar
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    const entry = store[key];
    if (entry && entry.resetTime < now) {
      delete store[key];
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Get client identifier for rate limiting
 */
function getClientId(req: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress || 'unknown';
  
  return (ip || 'unknown').trim();
}

/**
 * Basic rate limiter middleware
 * Limits requests per IP address within a time window
 */
export function rateLimiter(config: RateLimiterConfig = DEFAULT_CONFIG) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = getClientId(req);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = store[clientId];

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      store[clientId] = entry;
    }

    // Increment request count
    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      res.status(429).json({
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          statusCode: 429,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000), // seconds
        },
      });
      return;
    }

    // Continue to next middleware
    next();
  };
}

/**
 * Socket.io rate limiter
 * Limits Socket.io events per connection
 * This is a simple implementation - for production, consider more sophisticated solutions
 */
export class SocketRateLimiter {
  private connections: Map<string, { count: number; resetTime: number }> = new Map();
  private windowMs: number;
  private maxEvents: number;

  constructor(windowMs: number = 60 * 1000, maxEvents: number = 60) {
    this.windowMs = windowMs;
    this.maxEvents = maxEvents;

    // Clean up expired entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [socketId, entry] of this.connections.entries()) {
        if (entry.resetTime < now) {
          this.connections.delete(socketId);
        }
      }
    }, 30 * 1000); // Clean up every 30 seconds
  }

  /**
   * Check if socket is within rate limit
   * @param socketId Socket ID
   * @returns True if within limit, false if exceeded
   */
  checkLimit(socketId: string): boolean {
    const now = Date.now();
    let entry = this.connections.get(socketId);

    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.connections.set(socketId, entry);
    }

    entry.count++;
    return entry.count <= this.maxEvents;
  }

  /**
   * Reset rate limit for a socket (e.g., on disconnect)
   */
  reset(socketId: string): void {
    this.connections.delete(socketId);
  }
}
