# NYC GeoGuesser

A multiplayer location guessing game where players compete to identify NYC MTA train stations on a map. Test your knowledge of the New York City subway system in fast-paced rounds with friends!

*Heavily inspired by [Ben Musch's](https://github.com/BenMusch) amazing transit guessing game - check it out [here](https://nycguessr.com/)!*

## How to Play

1. **Create or Join a Lobby**: Start a new game or join an existing one with a lobby code
2. **Compete in 5 Rounds**: Each round presents a random NYC MTA station
3. **Make Your Guess**: Click on the map where you think the station is located (15 seconds per round)
4. **Score Points**: Closest guess wins the round - distance determines your score
5. **Win the Game**: Player with the highest total score after 5 rounds wins!

## Features

- **Real-time Multiplayer**: Compete with friends in synchronized game sessions
- **Interactive Map**: Custom-styled map focused on NYC with click-to-guess functionality
- **Live Updates**: See other players' guesses and scores in real-time
- **Lobby System**: Create private lobbies or join existing games
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Timer-based Rounds**: Fast-paced 15-second rounds keep the game exciting
- **Distance-based Scoring**: Accuracy matters - get as close as possible!

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Supabase (Database + Realtime subscriptions)
- **Database**: PostgreSQL (via Supabase)
- **Maps**: MapLibre GL JS
- **Styling**: CSS3 with modern responsive design
- **Realtime**: Supabase realtime subscriptions

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <LINK-TO-REPO>
   cd nyc-guesser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your credentials in the `.env` file

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` to start playing!

## Database Setup

The game requires several database tables. See the development guide for the complete schema:

- `lobbies` - Game lobbies and settings
- `players` - Player information and scores  
- `game_sessions` - Active game state
- `rounds` - Individual round data
- `player_guesses` - Player guess submissions
- `mta_stations` - NYC MTA station coordinates

## Game Architecture

```
src/
├── components/          # React UI components
│   ├── ui/             # Reusable UI components
│   ├── features/       # Game-specific components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── stores/             # State management
├── utils/              # Utility functions
├── services/           # Supabase API services
├── assets/             # Static assets
├── types/              # TypeScript definitions
└── constants/          # App constants
```

## Map Features

- **Custom Styling**: Clean map showing only essential geographic features
- **NYC Focus**: Optimized viewport and zoom controls for NYC area
- **Interactive Pins**: Click to place guesses, visual feedback for all players
- **Station Reveals**: Shows actual station location after each round
- **Mobile Optimized**: Touch-friendly interactions for mobile devices

## Real-time Features

- **Live Player Updates**: See when players join/leave lobbies
- **Synchronized Timers**: All players see the same countdown
- **Instant Guess Display**: Watch other players' guesses appear in real-time
- **Score Updates**: Live scoreboard updates after each round
- **Connection Handling**: Graceful reconnection for network issues

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the GNU GENERAL PUBLIC License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **[Ben Musch](https://github.com/BenMusch)** - Original inspiration from [nycguessr.com](https://nycguessr.com/)

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/your-username/nyc-guesser/issues) on GitHub.
