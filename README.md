# NYC GeoGuesser

A multiplayer location guessing game where players compete to identify NYC MTA train stations on a map. Test your knowledge of the New York City subway system in fast-paced rounds with friends!

*Heavily inspired by [Ben Musch's](https://github.com/BenMusch) amazing transit guessing game - check it out [here](https://nycguessr.com/)!*

## How to Play

1. **Create or Join a Lobby**: Start a new game or join an existing one with a lobby code
2. **Compete in 5 Rounds**: Each round presents a random NYC MTA station
3. **Make Your Guess**: Click on the map where you think the station is located (30 seconds per round)
4. **Score Points**: Closest guess wins the round - distance determines your score (up to 5000 points per round)
5. **Win the Game**: Player with the highest total score after 5 rounds wins!

## Features

- **Real-time Multiplayer**: Compete with friends in synchronized game sessions
- **Interactive Map**: Custom-styled map focused on NYC with click-to-guess functionality
- **Live Updates**: See other players' guesses and scores in real-time
- **Lobby System**: Create private lobbies or join existing games
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Timer-based Rounds**: Fast-paced 30-second rounds with 5-second countdowns keep the game exciting
- **Distance-based Scoring**: Accuracy matters - get as close as possible!

## Tech Stack

- **Frontend**: Vite + React + TypeScript
  - **UI Libraries**: Tailwind CSS, Material-UI (MUI)
  - **State Management**: Zustand
  - **Maps**: MapLibre GL JS + react-map-gl
  - **Routing**: React Router DOM
  - **Notifications**: React Toastify
- **Backend**: Node.js + Express + TypeScript
  - **Realtime**: Socket.io
  - **Storage**: In-memory (no database required)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <LINK-TO-REPO>
   cd NYC-GeoGuesser
   ```

2. **Install client dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Install server dependencies**
   ```bash
   cd ../server
   npm install
   ```

4. **Set up environment variables**

   **Client** (optional - defaults work for local development):
   - Create `client/.env.local` if needed:
     ```bash
     VITE_SOCKET_URL=http://localhost:8080
     ```
   - You will need to create an API key with <a href="https://www.maptiler.com/">MapTiler</a> for the map to work properly
     ```bash
     VITE_MAPTILER_API_KEY=YOUR_MAPTILER_KEY
     ```

   **Server** (optional - defaults work for local development):
   - Create `server/.env` if needed:
     ```bash
     PORT=8080
     CORS_ORIGIN=http://localhost:5173
     NODE_ENV=development
     ```

5. **Start the development servers**

   **Terminal 1 - Start the server:**
   ```bash
   cd server
   npm run dev
   ```
   Server will run on `http://localhost:8080`

   **Terminal 2 - Start the client:**
   ```bash
   cd client
   npm run dev
   ```
   Client will run on `http://localhost:5173`

6. **Open your browser**
   Navigate to `http://localhost:5173` to start playing!

## Game Configuration

- **Rounds**: 5 rounds per game
- **Round Duration**: 30 seconds per round
- **Countdown**: 5 seconds before each round starts
- **Players**: 2-4 players per lobby
- **Scoring**: Distance-based scoring (0-5000 points per round)
- **Stations**: NYC MTA stations loaded from JSON data file

**Note**: The game uses in-memory storage - no database setup required! All game state is managed in-memory on the server.

## Project Structure

```
NYC-GeoGuesser/
├── client/                    # Frontend application
│   ├── src/
│   │   ├── components/        # React UI components
│   │   │   ├── ui/           # Reusable UI components
│   │   │   ├── features/     # Game-specific components
│   │   │   └── layout/       # Layout components (Router)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── stores/           # Zustand state management
│   │   ├── services/         # Socket.io client services
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript definitions
│   │   └── constants/        # App constants
│   └── package.json
│
└── server/                    # Backend application
    ├── src/
    │   ├── managers/         # Game state managers
    │   │   ├── lobby-manager.ts
    │   │   ├── game-manager.ts
    │   │   └── player-manager.ts
    │   ├── socket/           # Socket.io handlers
    │   ├── utils/            # Utility functions
    │   ├── types/            # TypeScript definitions
    │   ├── config/           # Configuration
    │   └── data/             # MTA station data (JSON)
    └── package.json
```

## Map Features

- **Custom Styling**: Clean map showing only essential geographic features
- **NYC Focus**: Optimized viewport and zoom controls for NYC area
- **Interactive Pins**: Click to place guesses, visual feedback for all players
- **Station Reveals**: Shows actual station location after each round
- **Mobile Optimized**: Touch-friendly interactions for mobile devices

## Real-time Features

- **Live Player Updates**: See when players join/leave lobbies via Socket.io
- **Synchronized Timers**: All players see the same countdown and round timers
- **Instant Guess Display**: Watch other players' guesses appear in real-time on the map
- **Score Updates**: Live scoreboard updates after each round
- **Connection Handling**: Graceful reconnection with exponential backoff for network issues
- **Host Migration**: Automatic host migration if the current host disconnects

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **[Ben Musch](https://github.com/BenMusch)** - Original inspiration from [nycguessr.com](https://nycguessr.com/)

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/your-username/nyc-guesser/issues) on GitHub.
