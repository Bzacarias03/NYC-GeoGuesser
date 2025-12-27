import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { env } from './config/env';
import { LobbyManager } from './managers/lobby-manager';
import { GameManager } from './managers/game-manager';
import { PlayerManager } from './managers/player-manager';
import { loadStations } from './utils/station-loader';
import { getFilteredStationsWithTrains } from './utils/station-filter';
import { setupSocketHandler } from './socket/socket-handler';
import { setAvailableStations, clearAllTimers } from './socket/handlers/timer-handlers';
import { rateLimiter } from './middleware/rate-limiter';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

/**
 * Main server entry point
 */
async function main() {
  try {
    // Load and filter station data
    const allStations = loadStations();
    const availableStations = getFilteredStationsWithTrains(allStations);

    // Set available stations for timer handlers
    setAvailableStations(availableStations);

    // Initialize managers
    const lobbyManager = new LobbyManager();
    const gameManager = new GameManager();
    const playerManager = new PlayerManager();

    // Create Express app
    const app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Rate limiting (applied to all routes)
    app.use(rateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 requests per window
    }));

    // Health check endpoint (excluded from rate limiting if needed, but included for now)
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        lobbies: lobbyManager.getLobbyCount(),
        environment: env.NODE_ENV,
      });
    });

    // 404 handler for unknown routes (must be before error handler)
    app.use(notFoundHandler);

    // Global error handler (must be last)
    app.use(errorHandler);

    // Create HTTP server
    const server = createServer(app);

    // Create Socket.io server
    const io = new Server(server, {
      cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    // Setup socket handlers
    setupSocketHandler(io, lobbyManager, gameManager, playerManager, availableStations);

    // Start server
    server.listen(env.PORT, () => {
      // Server started successfully
    });

    // Graceful shutdown
    const shutdown = () => {
      // Clear all timers
      clearAllTimers();
      
      // Stop lobby cleanup interval
      lobbyManager.stopCleanupInterval();
      
      // Close server
      server.close(() => {
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      shutdown();
    });

  } catch (error) {
    process.exit(1);
  }
}

// Start server
main();
