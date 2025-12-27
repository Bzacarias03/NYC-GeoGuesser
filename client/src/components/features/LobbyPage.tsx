import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore, type GameLobby } from '../../stores/lobbyStore';
import { PLAYER_COLORS } from '../../constants';
import staticMap from '../../assets/static_map.webp';
import { LocationOn, Lock, ContentCopy, ArrowBack, Person } from '@mui/icons-material';
import { Slide, toast } from 'react-toastify';
import { syncLobbyState, realtimeManager, syncGameSession } from '../../services/realtimeService';

// Helper function to get consistent color for a player
const getPlayerColor = (playerId: string): string => {
  // Simple hash function to get consistent color based on player ID
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const colorIndex = Math.abs(hash) % PLAYER_COLORS.length;
  return PLAYER_COLORS[colorIndex];
};

// Player Avatar Component
const PlayerAvatar: React.FC<{ 
  playerId: string; 
  size?: 'sm' | 'md' | 'lg' 
}> = ({ playerId, size = 'md' }) => {
  const color = getPlayerColor(playerId);
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center text-white font-semibold`}
      style={{ backgroundColor: color }}
    >
    </div>
  );
};

const LoadingState: React.FC = () => (
  <div className="bg-[#242424] border border-white rounded-lg p-8 w-full max-w-lg mx-auto">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
      <h2 className="text-white text-xl font-bold mb-2">Setting up your game...</h2>
      <p className="text-white/80">Please wait a moment</p>
    </div>
  </div>
);

const ErrorState: React.FC<{ error: string; onRetry: () => void; onBack: () => void }> = ({ 
  error, 
  onRetry, 
  onBack 
}) => {
  // Auto-redirect to home for certain error types after showing brief message
  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      onBack();
    }, 3000); // Redirect after 3 seconds

    return () => clearTimeout(redirectTimer);
  }, [onBack]);

  return (
    <div className="bg-[#242424] border border-white rounded-lg p-8 w-full max-w-lg mx-auto">
      <div className="text-center">
        <h2 className="text-white text-xl font-bold mb-4">Unable to access lobby</h2>
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
        <p className="text-white/60 text-sm mb-4">
          Redirecting you back to home in 3 seconds...
        </p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowBack fontSize="small" />
            Go Back Now
          </button>
          <button
            onClick={onRetry}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

const LobbyView: React.FC<{ lobby: GameLobby }> = ({ 
  lobby 
}) => {
  const { leaveLobby, startGame, updateLobbyFromServer, isCurrentPlayerHost } = useLobbyStore();
  const navigate = useNavigate();
  const lobbyRef = useRef(lobby);
  
  // Keep the ref updated with the current lobby state
  useEffect(() => {
    lobbyRef.current = lobby;
  }, [lobby]);

  // Set up real-time subscriptions for lobby updates
  useEffect(() => {
    // Handle lobby updates (players joining/leaving)
    const subscriptionKey = syncLobbyState((serverLobby) => {
      // Update lobby state using the store's conversion function
      updateLobbyFromServer(serverLobby);
    });
    
    // Cleanup function
    return () => {
      realtimeManager.unsubscribe(subscriptionKey);
    };
  }, [lobby.id, updateLobbyFromServer]);

  // Set up game start navigation (listen for countdownStart event)
  useEffect(() => {
    // Listen for countdown start - this means game is starting
    const handleCountdownStart = () => {
      // Navigate to game page using lobby ID
      navigate(`/game/${lobby.id}`);
    };
    
    // Subscribe to countdown start event
    const subscriptionKeys = syncGameSession(
      handleCountdownStart,
      undefined, // onRoundStart
      undefined, // onRoundEnd
      undefined  // onGameEnd
    );
    
    // Cleanup function
    return () => {
      subscriptionKeys.forEach(key => realtimeManager.unsubscribe(key));
    };
  }, [lobby.id, navigate]);

  const handleCopyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(lobby.shareLink);
      // You could add a toast notification here
      toast.success('Share link copied to clipboard!', {
        position: "bottom-center",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        progress: undefined,
        theme: "dark",
        transition: Slide,
      });
    } catch (err) {
      // Failed to copy link - silently fail
      console.error('Failed to copy share link', err)
    }
  }, [lobby.shareLink]);

  const handleLeaveLobby = useCallback(() => {
    leaveLobby();
    navigate('/');
  }, [leaveLobby, navigate]);

  const handleStartGame = useCallback(async () => {
    try {
      await startGame();
      // Navigation will happen automatically when countdownStart event is received
      // (handled in the useEffect above)
    } catch (error) {
      console.error('Failed to start game', error)
      toast.error('Failed to start game. Please try again.', {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: false,
        progress: undefined,
        theme: "dark",
        transition: Slide,
      });
    }
  }, [startGame]);

  // Get current player info
  const isHost = isCurrentPlayerHost();
  // With Socket.io, players are ready when connected (no explicit ready system)
  // Game can start with 2+ players
  const canStartGame = isHost && lobby.players.length >= 2;

  return (
    <div className="bg-[#242424] border border-white rounded-lg p-8 w-full max-w-lg mx-auto">
      {/* Lobby Header */}
      <div className="text-center mb-6">
        <h2 className="text-white text-2xl font-bold mb-2">Game Lobby</h2>
        <div className="bg-white/10 rounded-lg p-3 mb-4">
          <span className="text-white/80 text-sm">Game Code: <span className="font-mono font-bold">{lobby.code}</span></span>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={lobby.shareLink}
              readOnly
              className="bg-white/5 border border-white/20 rounded px-3 py-2 text-white text-sm flex-1"
            />
            <button
              onClick={handleCopyShareLink}
              className="bg-white/20 hover:bg-white/30 border border-white/40 rounded px-3 py-2 text-white transition-colors hover:cursor-pointer"
            >
              <ContentCopy fontSize="small" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-white/80">
          <Person fontSize="small" />
          <span>{lobby.players.length}/{lobby.maxPlayers} Players</span>
          {lobby.isPrivate && <Lock fontSize="small" />}
        </div>
      </div>

      {/* Players List */}
      <div className="mb-6">
        <h3 className="text-white text-lg font-semibold mb-3">Players</h3>
        <div className="space-y-2">
          {lobby.players.map((player) => (
            <div
              key={player.id}
              className="bg-white/10 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <PlayerAvatar playerId={player.id} size="sm" />
                <span className="text-white">{player.name}</span>
                {player.isHost && (
                  <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                    Host
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400">
                  Connected
                </span>
              </div>
            </div>
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: lobby.maxPlayers - lobby.players.length }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-white/5 border border-white/10 border-dashed rounded-lg p-3 flex items-center justify-center"
            >
              <span className="text-white/40 text-sm">Waiting for player...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Game Status Message */}
      <div className="mb-4 text-center">
        {isHost ? (
          <>
            {lobby.players.length < 2 ? (
              <p className="text-yellow-400 text-sm">Need at least 2 players to start</p>
            ) : (
              <p className="text-green-400 text-sm">Ready to start! Click "Start Game" to begin.</p>
            )}
          </>
        ) : (
          <p className="text-white/80 text-sm">
            Waiting for host to start the game...
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleLeaveLobby}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium transition-colors hover:cursor-pointer"
        >
          Leave Lobby
        </button>
        
        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={!canStartGame}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium transition-colors hover:cursor-pointer"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
};

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLobby, isJoining, isCreating, error, clearError } = useLobbyStore();

  // Redirect to home if no lobby and not in a loading state
  useEffect(() => {
    if (!currentLobby && !isJoining && !isCreating && !error) {
      navigate('/', { replace: true });
    }
  }, [currentLobby, isJoining, isCreating, error, navigate]);

  const handleRetry = useCallback(() => {
    clearError();
    // Could potentially retry the last action
  }, [clearError]);

  const handleGoBack = useCallback(() => {
    clearError();
    navigate('/', { replace: true });
  }, [clearError, navigate]);

  // Determine what to render based on state
  const renderContent = () => {
    // Show loading state while creating or joining
    if (isCreating || isJoining) {
      return <LoadingState />;
    }

    // Show error state if there's an error and no lobby
    if (error && !currentLobby) {
      return <ErrorState error={error} onRetry={handleRetry} onBack={handleGoBack} />;
    }

    // Show lobby if it exists
    if (currentLobby) {
      return <LobbyView lobby={currentLobby} />;
    }

    // If we reach here, redirect to home (this should be handled by useEffect above)
    return <LoadingState />;
  };

  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${staticMap})`,
      }}
    >
      {/* Dark overlay - needed for text visibility */}
      <div className="absolute inset-0 bg-black/75"></div>

      {/* Header with Logo and Title */}
      <div className="relative z-10 px-8 pt-8 pb-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <LocationOn 
            style={{ 
              fontSize: 48,
              color: '#FF0000'
            }} 
          />
          <h1 style={{color: 'white'}} className="text-3xl font-bold tracking-wide">
            NYC GeoGuesser
          </h1>
        </div>
      </div>

      {/* Main Content - Centered Modal */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default React.memo(LobbyPage);