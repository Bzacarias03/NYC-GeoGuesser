import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapMouseEvent, ViewState } from 'react-map-gl/maplibre';
import type { Coordinates } from '../../types';
import { API_CONFIG, MAP_CONFIG, PLAYER_COLORS } from '../../constants';
import { isWithinNYCBounds } from '../../utils';
import { useGameLogic } from '../../hooks';
import { useLobbyStore } from '../../stores/lobbyStore';
import { EmojiEvents, ArrowBack } from '@mui/icons-material';
import staticMap from '../../assets/static_map.webp';
import { GameSidebar } from '../ui/GameSidebar';

const GameTimer: React.FC<{ timeRemaining: number; isActive: boolean }> = ({ 
  timeRemaining, 
  isActive 
}) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return (
    <div 
      className={`px-6 py-3 rounded-lg border border-white text-white font-bold backdrop-blur-sm ${
        isActive && timeRemaining <= 5 ? 'animate-pulse' : ''
      }`}
      style={{ 
        backgroundColor: 'rgba(36, 36, 36, 0.75)',
        minWidth: '120px'
      }}
    >
      <div className="text-center">
        <div className="text-sm opacity-75 mb-1">Time Left</div>
        <div className="text-2xl font-mono tracking-wider">
          {timeDisplay}
        </div>
      </div>
    </div>
  );
};

// Countdown component
const CountdownTimer: React.FC<{ countdownTime: number }> = ({ 
  countdownTime 
}) => {
  return (
    <div 
      className="px-6 py-3 rounded-lg border border-yellow-400 text-yellow-400 font-bold backdrop-blur-sm animate-pulse"
      style={{ 
        backgroundColor: 'rgba(36, 36, 36, 0.75)',
        minWidth: '120px'
      }}
    >
      <div className="text-center">
        <div className="text-sm opacity-75 mb-1">Starting in</div>
        <div className="text-2xl font-mono tracking-wider">
          {countdownTime}
        </div>
      </div>
    </div>
  );
};



// Pin component for player guesses
const GuessPin: React.FC<{ 
  color: string; 
  isCurrentPlayer?: boolean; 
  playerName?: string;
  size?: 'small' | 'medium' | 'large';
}> = ({ 
  color, 
  isCurrentPlayer = false, 
  playerName = '', 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-10 h-10'
  };

  return (
    <div className="relative">
      <div 
        className={`${sizeClasses[size]} rounded-full border-2 border-white shadow-lg cursor-pointer transform transition-transform hover:scale-110 ${
          isCurrentPlayer ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        style={{ backgroundColor: color }}
        title={playerName ? `${playerName}'s guess` : 'Player guess'}
      >
        {isCurrentPlayer && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
        )}
      </div>
      {isCurrentPlayer && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded whitespace-nowrap">
          Your guess
        </div>
      )}
    </div>
  );
};

// Station marker component
const StationMarker: React.FC<{ stationName: string }> = ({ stationName }) => (
  <div className="relative">
    <div className="w-8 h-8 bg-yellow-400 border-2 border-red-600 rounded-full shadow-lg animate-pulse">
      <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-75"></div>
    </div>
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-red-600 text-white text-xs rounded whitespace-nowrap font-semibold">
      {stationName}
    </div>
  </div>
);

// Main GamePage component
const GamePage: React.FC = () => {
  const { gameSessionId } = useParams<{ gameSessionId: string }>();
  const navigate = useNavigate();
  const { currentPlayerId, currentLobby } = useLobbyStore();
  
  // Use lobbyId from params (which is actually the lobby ID now, not gameSessionId)
  const lobbyId = gameSessionId || currentLobby?.id || null;
  
  const {
    currentStation,
    guesses,
    players: gamePlayers,
    timeRemaining,
    isRoundActive,
    isCountdown,
    countdownTime,
    roundResults,
    gameResults,
    isLoading,
    error,
    submitGuess,
    hasCurrentPlayerGuessed,
    currentRoundNumber,
    totalRounds,
    isGameComplete,
    isShowingResults
  } = useGameLogic(lobbyId, currentPlayerId || null);

  const [viewState, setViewState] = useState<ViewState>({
    ...MAP_CONFIG.INITIAL_VIEWPORT,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  // Handle map clicks for placing guess pins
  // Allow multiple guesses - players can update their guess during the round
  const handleMapClick = useCallback((event: MapMouseEvent) => {
    if (!isRoundActive) return;

    const { lng, lat } = event.lngLat;
    const coordinates: Coordinates = { lat, lng };

    if (!isWithinNYCBounds(coordinates)) {
      return;
    }

    submitGuess(lat, lng);
  }, [isRoundActive, submitGuess]);

  // Handle back button click - show confirmation if game is active
  const handleBackClick = useCallback(() => {
    const isGameActive = isRoundActive || isCountdown || isShowingResults;
    
    if (isGameActive) {
      setShowLeaveConfirmation(true);
    } else {
      navigate('/');
    }
  }, [isRoundActive, isCountdown, isShowingResults, navigate]);

  // Handle confirmation to leave game
  const handleConfirmLeave = useCallback(() => {
    setShowLeaveConfirmation(false);
    navigate('/');
  }, [navigate]);

  // Handle cancel leaving game
  const handleCancelLeave = useCallback(() => {
    setShowLeaveConfirmation(false);
  }, []);

  // Server handles round starts automatically via Socket.io events
  // No need for manual round starting

  // Helper function to get player color from lobby or fallback to index-based
  const getPlayerColorById = useCallback((playerId: string, fallbackIndex: number): string => {
    const player = currentLobby?.players?.find(p => p.id === playerId);
    if (player?.color) {
      return player.color;
    }
    // Fallback to index-based if color not available
    return PLAYER_COLORS[fallbackIndex % PLAYER_COLORS.length];
  }, [currentLobby]);

  // Create player guess markers
  const playerGuessMarkers = useMemo(() => {
    const markers: React.ReactElement[] = [];
    if (!guesses || guesses.length === 0) return markers;

    const currentPlayerGuess = guesses.find(g => g.playerId === currentPlayerId);

    // Add current player's guess
    if (currentPlayerGuess) {
      const currentPlayerColor = getPlayerColorById(currentPlayerGuess.playerId, 0);
      markers.push(
        <Marker
          key="current-player-guess"
          longitude={currentPlayerGuess.lng}
          latitude={currentPlayerGuess.lat}
          anchor="center"
        >
          <GuessPin 
            color={currentPlayerColor} 
            isCurrentPlayer={true}
            size="large"
            playerName={currentPlayerGuess.playerName}
          />
        </Marker>
      );
    }

    // Add other players' guesses
    guesses
      .filter(g => g.playerId !== currentPlayerId)
      .forEach((guess, index) => {
        const otherPlayerColor = getPlayerColorById(guess.playerId, index + 1);
        markers.push(
          <Marker
            key={`guess-${guess.playerId}-${guess.submittedAt}`}
            longitude={guess.lng}
            latitude={guess.lat}
            anchor="center"
          >
            <GuessPin 
              color={otherPlayerColor}
              playerName={guess.playerName}
              size="medium"
            />
          </Marker>
        );
      });

    return markers;
  }, [guesses, currentPlayerId, getPlayerColorById]);

  // Station location marker (shown after round ends)
  const stationMarker = useMemo(() => {
    if (!isShowingResults || !roundResults?.station) return null;

    return (
      <Marker
        key="station-location"
        longitude={roundResults.station.longitude}
        latitude={roundResults.station.latitude}
        anchor="center"
      >
        <StationMarker stationName={roundResults.station.station_name} />
      </Marker>
    );
  }, [isShowingResults, roundResults]);

  // Get players for scoreboard from lobby store (more up-to-date)
  const players = useMemo(() => {
    if (currentLobby?.players && currentLobby.players.length > 0) {
      return currentLobby.players
        .map(player => ({
          id: player.id,
          name: player.name,
          score: player.score ?? 0, // Use actual score from lobby, fallback to 0
          color: player.color // Preserve color from lobby
        }))
        .sort((a, b) => b.score - a.score);
    }
    // Fallback to gamePlayers from useGameLogic
    return gamePlayers
      .map(player => ({
        id: player.id,
        name: player.name,
        score: player.score,
        color: undefined // No color available from gamePlayers
      }))
      .sort((a, b) => b.score - a.score);
  }, [currentLobby, gamePlayers]);

  // Enhanced players data with guess status for sidebar
  const playersWithGuessStatus = useMemo(() => {
    return players.map(player => ({
      ...player,
      hasGuessed: guesses.some(guess => guess.playerId === player.id)
    }));
  }, [players, guesses]);

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Game Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/lobby')}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && currentRoundNumber === 0 && !isCountdown) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Game...</h2>
        </div>
      </div>
    );
  }

  if (isGameComplete && gameResults) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center relative"
        style={{ backgroundImage: `url(${staticMap})` }}
      >
        <div className="absolute inset-0 bg-black/75"></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
          <div 
            className="rounded-lg p-8 max-w-md w-full text-center border"
            style={{ 
              backgroundColor: '#242424',
              borderColor: 'white',
              borderWidth: '1px'
            }}
          >
            <EmojiEvents className="text-yellow-500 text-6xl mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Game Complete!</h1>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-blue-400 mb-2">Winner</h2>
              <div className="border-2 border-yellow-400 rounded-lg p-4" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
                <p className="text-lg font-bold text-white">{gameResults.winner.playerName}</p>
                <p className="text-2xl font-bold text-yellow-400">{gameResults.winner.totalScore} points</p>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-white">Final Scores</h3>
              <div className="space-y-2">
                {gameResults.finalScores.map((player, index) => (
                  <div key={player.playerId} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <span className="text-white">#{index + 1} {player.playerName}</span>
                    <span className="font-bold text-white">{player.totalScore}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate('/lobby')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 w-full"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen" style={{ backgroundColor: '#242424' }}>
      {/* Sidebar */}
      <GameSidebar
        players={playersWithGuessStatus}
        currentPlayerId={currentPlayerId || null}
        currentRound={currentRoundNumber}
        stationName={currentStation?.station_name}
        stationLines={currentStation?.line}
        isRoundActive={isRoundActive}
      />

      {/* Main Game Area */}
      <div className="flex-1 relative">
        {/* Header with Back Button and Timer */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackClick}
              className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg hover:bg-white transition-colors"
            >
              <ArrowBack />
            </button>
            
            {isCountdown && (
              <CountdownTimer countdownTime={countdownTime} />
            )}
            {isRoundActive && !isCountdown && (
              <GameTimer 
                timeRemaining={timeRemaining}
                isActive={isRoundActive}
              />
            )}
          </div>
        </div>

        {/* Map */}
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
          mapStyle={`https://api.maptiler.com/maps/0197eb34-bcc7-7eed-b35a-396c93f1b7ad/style.json?key=${API_CONFIG.MAPTILER_API_KEY}`}
          maxZoom={13.5}
          minZoom={10}
          maxBounds={[
            [MAP_CONFIG.NYC_BOUNDS.west, MAP_CONFIG.NYC_BOUNDS.south],
            [MAP_CONFIG.NYC_BOUNDS.east, MAP_CONFIG.NYC_BOUNDS.north]
          ]}
          cursor={isRoundActive && !hasCurrentPlayerGuessed() ? 'crosshair' : 'grab'}
        >
          {/* Player guess markers */}
          {playerGuessMarkers}
          
          {/* Station marker */}
          {stationMarker}
        </Map>
      </div>

      {/* Leave Game Confirmation Dialog */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 bg-black/75 z-30 flex items-center justify-center">
          <div 
            className="rounded-lg p-8 max-w-md w-full mx-4 border"
            style={{ 
              backgroundColor: '#242424',
              borderColor: 'white',
              borderWidth: '1px'
            }}
          >
            <h2 className="text-2xl font-bold text-center mb-4 text-white">Leave Game?</h2>
            <p className="text-center text-gray-300 mb-6">
              Are you sure you want to leave the active game? Your progress will be lost and you will not be able to join the game again.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleCancelLeave}
                className="flex-1 px-6 py-3 rounded-lg font-medium border border-white text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 px-6 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Leave Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round Results Overlay */}
      {isShowingResults && roundResults && (
        <div className="absolute inset-0 bg-black/75 z-20 flex items-start justify-center pt-8">
          <div 
            className="rounded-lg p-8 max-w-md w-full mx-4 border"
            style={{ 
              backgroundColor: '#242424',
              borderColor: 'white',
              borderWidth: '1px'
            }}
          >
            <h2 className="text-2xl font-bold text-center mb-4 text-white">Round {roundResults.roundNumber} Results</h2>
            <div className="space-y-3">
              {roundResults.guesses.map((guess, index) => {
                const resultColor = getPlayerColorById(guess.playerId, index);
                return (
                  <div key={`${guess.playerId}-${guess.submittedAt}`} className="flex justify-between items-center p-3 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: resultColor }}
                      />
                      <span className="font-medium text-white">{guess.playerName}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-400">+{guess.points} pts</div>
                      <div className="text-sm text-gray-300">{Math.round(guess.distance)}m away</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-sm text-gray-300 mt-4">
              {roundResults.roundNumber < totalRounds ? 'Next round starting soon...' : 'Calculating final results...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(GamePage);