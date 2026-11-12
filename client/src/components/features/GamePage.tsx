import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type { Coordinates } from '../../types';
import { API_CONFIG, MAP_CONFIG, MAP_LABEL_CLASS, PLAYER_COLORS } from '../../constants';
import { isWithinNYCBounds, formatDistance } from '../../utils';
import { edgePosition, EDGE_INSET } from '../../utils/edgePosition';
import { useGameLogic } from '../../hooks';
import { useLobbyStore } from '../../stores/lobbyStore';
import { EmojiEvents, ArrowBack } from '@mui/icons-material';
import staticMap from '../../assets/static_map.webp';
import { GameSidebar } from '../ui/GameSidebar';
import { OffscreenGuessIndicator } from '../ui/OffscreenGuessIndicator';
import { MobileGameCard } from '../ui/MobileGameCard';

/** Render at most 2x density: 3x phone screens cost ~2x the GPU work for no visible gain */
const MAP_PIXEL_RATIO = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2);

/** Width of the area (meters) framed around the station when a round ends */
const REVEAL_VIEW_METERS = 5000;
const METERS_PER_DEGREE_LAT = 111320;

const GameTimer: React.FC<{ timeRemaining: number; isActive: boolean }> = ({ 
  timeRemaining, 
  isActive 
}) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return (
    <div 
      className={`px-6 py-3 rounded-lg border border-white text-white font-bold ${
        isActive && timeRemaining <= 5 ? 'animate-pulse' : ''
      }`}
      style={{ 
        backgroundColor: 'rgba(36, 36, 36, 0.9)',
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
      className="px-6 py-3 rounded-lg border border-yellow-400 text-yellow-400 font-bold animate-pulse"
      style={{ 
        backgroundColor: 'rgba(36, 36, 36, 0.9)',
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
      {/* Own pin says "Your guess"; other players' pins (shown at round end) show their name */}
      {(isCurrentPlayer || playerName) && (
        <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 ${isCurrentPlayer ? 'bg-blue-500' : 'bg-black/70'} ${MAP_LABEL_CLASS}`}>
          {isCurrentPlayer ? 'Your guess' : playerName}
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
    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-red-600 ${MAP_LABEL_CLASS}`}>
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
    myGuess,
    guessedPlayerIds,
    timeRemaining,
    isRoundActive,
    isCountdown,
    countdownTime,
    roundResults,
    gameResults,
    error,
    submitGuess,
    hasCurrentPlayerGuessed,
    currentRoundNumber,
    totalRounds,
    isGameComplete,
    isShowingResults
  } = useGameLogic(lobbyId, currentPlayerId || null);

  // A phone keyboard left open from the lobby can leave the page scrolled after it
  // closes, pushing the card under the browser UI. Close it and keep the page at the top.
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const resetScroll = () => window.scrollTo(0, 0);
    resetScroll();
    window.visualViewport?.addEventListener('resize', resetScroll);
    return () => window.visualViewport?.removeEventListener('resize', resetScroll);
  }, []);

  // The map manages its own camera (uncontrolled), so panning/zooming doesn't
  // re-render this page every frame. During the reveal we re-render at most once
  // per animation frame so off-screen guess markers follow the map.
  const [, setRevealFrame] = useState(0);

  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const mapRef = useRef<MapRef>(null);
  // Phone-only card over the top of the map (display:none on wider screens, so 0 height)
  const mobileCardRef = useRef<HTMLDivElement>(null);
  const getMobileCardBottom = () => {
    const card = mobileCardRef.current;
    return card && card.offsetHeight > 0 ? card.offsetTop + card.offsetHeight : 0;
  };

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!isShowingResults || !map) return;

    let frame = 0;
    const onMove = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setRevealFrame(n => n + 1);
      });
    };
    map.on('move', onMove);
    return () => {
      map.off('move', onMove);
      cancelAnimationFrame(frame);
    };
  }, [isShowingResults]);

  // Round over: fly everyone to the station, framing ~5km around it
  useEffect(() => {
    if (!roundResults) return;
    const { latitude, longitude } = roundResults.station;
    const halfLat = REVEAL_VIEW_METERS / 2 / METERS_PER_DEGREE_LAT;
    const halfLng = halfLat / Math.cos((latitude * Math.PI) / 180);
    // On phones, center the station in the part of the map below the card
    mapRef.current?.fitBounds(
      [[longitude - halfLng, latitude - halfLat], [longitude + halfLng, latitude + halfLat]],
      { padding: { top: 20 + getMobileCardBottom(), right: 20, bottom: 20, left: 20 }, maxZoom: MAP_CONFIG.MAX_ZOOM, duration: 1500 }
    );
  }, [roundResults]);

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

  // During the reveal, split guesses into ones inside the map view (drawn as pins)
  // and ones outside it (drawn at the map edge). Recomputed on every render; during
  // the reveal the move listener above re-renders once per frame.
  const map = mapRef.current;
  const mobileCardBottom = getMobileCardBottom();
  const edgeInset = mobileCardBottom ? { ...EDGE_INSET, top: mobileCardBottom + 16 } : EDGE_INSET;
  const revealedGuesses = isShowingResults && roundResults && map
    ? roundResults.guesses.map((guess, index) => {
        const onScreen = map.getBounds().contains([guess.lng, guess.lat]);
        const { clientWidth, clientHeight } = map.getContainer();
        return {
          guess,
          color: getPlayerColorById(guess.playerId, index),
          edge: onScreen ? null : edgePosition(map.project([guess.lng, guess.lat]), clientWidth, clientHeight, edgeInset),
        };
      })
    : [];

  // Guess pins: only our own during the round, on-screen guesses once it ends
  const renderGuessMarkers = () => {
    if (isShowingResults && roundResults) {
      return revealedGuesses
        .filter(({ edge }) => edge === null)
        .map(({ guess, color }) => (
          <Marker
            key={`guess-${guess.playerId}`}
            longitude={guess.lng}
            latitude={guess.lat}
            anchor="center"
          >
            <GuessPin
              color={color}
              isCurrentPlayer={guess.playerId === currentPlayerId}
              playerName={guess.playerName}
              size={guess.playerId === currentPlayerId ? 'large' : 'medium'}
            />
          </Marker>
        ));
    }

    if (!myGuess || !currentPlayerId) return [];
    return [
      <Marker
        key="current-player-guess"
        longitude={myGuess.lng}
        latitude={myGuess.lat}
        anchor="center"
      >
        <GuessPin
          color={getPlayerColorById(currentPlayerId, 0)}
          isCurrentPlayer={true}
          size="large"
        />
      </Marker>
    ];
  };

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

  // Get players for scoreboard from lobby store
  const players = useMemo(() => {
    return (currentLobby?.players ?? [])
      .map(player => ({
        id: player.id,
        name: player.name,
        score: player.score ?? 0,
        color: player.color
      }))
      .sort((a, b) => b.score - a.score);
  }, [currentLobby]);

  // Sidebar data: who has guessed during the round, each player's result once it ends
  const playersWithGuessStatus = useMemo(() => {
    return players.map(player => {
      const result = roundResults?.guesses.find(guess => guess.playerId === player.id);
      return {
        ...player,
        hasGuessed: guessedPlayerIds.includes(player.id),
        roundResult: result ? { points: result.points, distance: result.distance } : null,
      };
    });
  }, [players, guessedPlayerIds, roundResults]);

  const me = playersWithGuessStatus.find(player => player.id === currentPlayerId);

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

  if (isGameComplete && gameResults) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center relative"
        style={{ backgroundImage: `url(${staticMap})` }}
      >
        <div className="absolute inset-0 bg-black/75"></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-8">
          <div 
            className="rounded-lg p-6 sm:p-8 max-w-md w-full text-center border"
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
    // Pinned to the viewport so page scroll (e.g. from a phone keyboard) can't shift the game
    <div className="fixed inset-0 flex overflow-hidden" style={{ backgroundColor: '#242424' }}>
      {/* Sidebar (tablet/desktop; phones use the card over the map) */}
      <div className="hidden md:block h-full">
        <GameSidebar
          players={playersWithGuessStatus}
          currentPlayerId={currentPlayerId || null}
          currentRound={currentRoundNumber}
          stationName={currentStation?.station_name}
          stationLines={currentStation?.line}
          isRoundActive={isRoundActive}
          showRoundResults={isShowingResults}
          isFinalRound={currentRoundNumber >= totalRounds}
        />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 min-w-0 relative">
        {/* Phone: round, timer, station and your own status over the map */}
        <MobileGameCard
          cardRef={mobileCardRef}
          onBack={handleBackClick}
          currentRound={currentRoundNumber}
          totalRounds={totalRounds}
          stationName={currentStation?.station_name}
          stationLines={currentStation?.line}
          isCountdown={isCountdown}
          countdownTime={countdownTime}
          isRoundActive={isRoundActive}
          timeRemaining={timeRemaining}
          myScore={me?.score ?? 0}
          hasGuessed={hasCurrentPlayerGuessed()}
          showRoundResults={isShowingResults}
          myRoundResult={me?.roundResult ?? null}
        />

        {/* Header with Back Button and Timer (tablet/desktop). The container spans the
            map's width, so it ignores the pointer; only the back button takes clicks */}
        <div className="hidden md:block absolute top-4 left-4 right-4 z-10 pointer-events-none">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackClick}
              className="pointer-events-auto bg-white/90 rounded-lg p-3 shadow-lg hover:bg-white transition-colors"
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
          ref={mapRef}
          initialViewState={MAP_CONFIG.INITIAL_VIEWPORT}
          pixelRatio={MAP_PIXEL_RATIO}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
          mapStyle={`https://api.maptiler.com/maps/0197eb34-bcc7-7eed-b35a-396c93f1b7ad/style.json?key=${API_CONFIG.MAPTILER_API_KEY}`}
          maxZoom={MAP_CONFIG.MAX_ZOOM}
          minZoom={MAP_CONFIG.MIN_ZOOM}
          maxBounds={[
            [MAP_CONFIG.NYC_BOUNDS.west, MAP_CONFIG.NYC_BOUNDS.south],
            [MAP_CONFIG.NYC_BOUNDS.east, MAP_CONFIG.NYC_BOUNDS.north]
          ]}
          cursor={isRoundActive && !hasCurrentPlayerGuessed() ? 'crosshair' : 'grab'}
        >
          {/* Player guess markers */}
          {renderGuessMarkers()}
          
          {/* Station marker */}
          {stationMarker}
        </Map>

        {/* Guesses outside the view, shown at the map edge in their direction */}
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {revealedGuesses
            .filter(({ edge }) => edge !== null)
            .map(({ guess, color, edge }) => (
              <OffscreenGuessIndicator
                key={`offscreen-${guess.playerId}`}
                x={edge!.x}
                y={edge!.y}
                color={color}
                label={`${guess.playerId === currentPlayerId ? 'You' : guess.playerName} · ${formatDistance(guess.distance)}`}
              />
            ))}
        </div>
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

    </div>
  );
};

export default React.memo(GamePage);