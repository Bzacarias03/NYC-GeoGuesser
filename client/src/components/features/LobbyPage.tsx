import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore, type GameLobby } from '../../stores/lobbyStore';
import { PAGE_CARD_CLASS, PLAYER_COLORS } from '../../constants';
import { PageShell } from '../layout/PageShell';
import { Lock, ContentCopy, ArrowBack, Person } from '@mui/icons-material';
import { Slide, toast } from 'react-toastify';
import { syncLobbyState, realtimeManager, syncGameSession } from '../../services/realtimeService';
import { track } from '../../services/analytics';

// Fallback color for a player without a server-assigned one
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

const LoadingState: React.FC = () => (
  <div className={PAGE_CARD_CLASS}>
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
    <div className={PAGE_CARD_CLASS}>
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
  
  // Download the game page (and the map library) while players wait, so the
  // map is ready to go when the host starts
  useEffect(() => {
    void import('./GamePage');
  }, []);

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
      track('invite_link_copied', {});
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
    <div className={PAGE_CARD_CLASS}>
      {/* Lobby Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-white text-xl sm:text-2xl font-bold">Game Lobby</h2>
        <span
          data-testid="player-count"
          aria-label={`${lobby.players.length} of ${lobby.maxPlayers} players`}
          className="flex items-center gap-1 text-white/70 text-sm"
        >
          <Person sx={{ fontSize: 18 }} />
          {lobby.players.length}/{lobby.maxPlayers}
          {lobby.isPrivate && <Lock sx={{ fontSize: 16 }} />}
        </span>
      </div>

      {/* Game code + invite link */}
      <div className="bg-white/10 rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white/60 text-xs">Game Code</div>
          <div data-testid="lobby-code" className="text-white font-mono font-bold text-2xl tracking-widest">
            {lobby.code}
          </div>
        </div>
        <button
          onClick={handleCopyShareLink}
          className="shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 rounded-lg px-3 py-2 text-white text-sm font-medium whitespace-nowrap transition-colors hover:cursor-pointer"
        >
          <ContentCopy sx={{ fontSize: 16 }} />
          Copy invite link
        </button>
      </div>

      {/* Players List */}
      <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-2">Players</h3>
      <ul className="space-y-1.5 mb-4">
        {lobby.players.map((player) => (
          <li
            key={player.id}
            className="bg-white/10 rounded-lg px-3 py-2 flex items-center gap-2 min-w-0"
          >
            <span
              className="w-5 h-5 rounded shrink-0"
              style={{ backgroundColor: player.color ?? getPlayerColor(player.id) }}
            />
            <span className="text-white truncate min-w-0 flex-1">{player.name}</span>
            {player.isHost && (
              <span className="shrink-0 bg-gray-800 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded">
                Host
              </span>
            )}
            <span
              role="img"
              aria-label={player.isReady ? 'Connected' : 'Reconnecting'}
              title={player.isReady ? 'Connected' : 'Reconnecting...'}
              className={`shrink-0 w-2.5 h-2.5 rounded-full ${player.isReady ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}
            />
          </li>
        ))}

        {/* Empty slots */}
        {Array.from({ length: lobby.maxPlayers - lobby.players.length }).map((_, index) => (
          <li
            key={`empty-${index}`}
            className="border border-white/10 border-dashed rounded-lg px-3 py-2 text-center text-white/40 text-sm"
          >
            Waiting for player...
          </li>
        ))}
      </ul>

      {/* Game Status Message */}
      <div className="mb-3 text-center text-xs sm:text-sm">
        {isHost ? (
          lobby.players.length < 2 ? (
            <p className="text-yellow-400">Need at least 2 players to start</p>
          ) : (
            <p className="text-green-400">Ready to start!</p>
          )
        ) : (
          <p className="text-white/80">Waiting for host to start the game...</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={handleLeaveLobby}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium whitespace-nowrap transition-colors hover:cursor-pointer"
        >
          Leave Lobby
        </button>
        
        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={!canStartGame}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium whitespace-nowrap transition-colors hover:cursor-pointer"
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
  const { currentLobby, isJoining, isCreating, isRejoining, error, clearError } = useLobbyStore();

  // Redirect to home if no lobby and not in a loading state
  useEffect(() => {
    if (!currentLobby && !isJoining && !isCreating && !isRejoining && !error) {
      navigate('/', { replace: true });
    }
  }, [currentLobby, isJoining, isCreating, isRejoining, error, navigate]);

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
    if (isCreating || isJoining || isRejoining) {
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

  return <PageShell>{renderContent()}</PageShell>;
};

export default React.memo(LobbyPage);