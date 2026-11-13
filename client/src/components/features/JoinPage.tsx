import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLobbyStore } from '../../stores/lobbyStore';
import { PAGE_CARD_CLASS } from '../../constants';
import { PageShell } from '../layout/PageShell';

// Error display component
const ErrorDisplay: React.FC<{ error: string | null; onDismiss: () => void }> = ({ 
  error, 
  onDismiss 
}) => {
  if (!error) return null;

  return (
    <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-md">
      <div className="flex items-center justify-between">
        <p className="text-red-200 text-sm">{error}</p>
        <button
          onClick={onDismiss}
          className="text-red-300 hover:text-red-100 ml-4"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const { lobbyCode } = useParams<{ lobbyCode: string }>();
  const { joinLobby, clearError, error } = useLobbyStore();
  
  const [playerName, setPlayerName] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear errors when component mounts or lobby code changes
  useEffect(() => {
    clearError();
    setLocalError(null);
  }, [lobbyCode, clearError]);

  const handleJoinLobby = useCallback(async () => {
    if (!playerName.trim()) {
      setLocalError('Please enter your name to join the game.');
      return;
    }

    if (!lobbyCode) {
      setLocalError('Invalid lobby code.');
      return;
    }

    setIsJoining(true);
    setLocalError(null);
    
    try {
      // Join the lobby using the code from URL
      await joinLobby(lobbyCode, playerName.trim(), 'invite_link');
      
      // Navigate to lobby page
      navigate('/lobby');
    } catch {
      setLocalError('Failed to join the lobby. Please check the lobby code and try again.');
    } finally {
      setIsJoining(false);
    }
  }, [playerName, lobbyCode, joinLobby, navigate]);

  const handleGoHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const currentError = localError || error;

  return (
    <PageShell>
      <div className={PAGE_CARD_CLASS}>
        {/* Error Display */}
        <ErrorDisplay 
          error={currentError} 
          onDismiss={() => {
            setLocalError(null);
            clearError();
          }} 
        />

        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-white text-xl sm:text-2xl font-bold mb-2">Join Game</h2>
          <div className="bg-white/10 rounded-lg p-3">
            <span className="text-white/80 text-sm">
              Lobby Code: <span className="font-mono font-bold">{lobbyCode}</span>
            </span>
          </div>
        </div>

        {/* Username Input */}
        <div className="mb-4 sm:mb-6">
          <label htmlFor="username" className="block text-white/80 text-sm font-medium mb-2">
            Your Name
          </label>
          <input
            id="username"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
            disabled={isJoining}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isJoining) {
                handleJoinLobby();
              }
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleGoHome}
            disabled={isJoining}
            className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium whitespace-nowrap transition-colors hover:cursor-pointer"
          >
            Back to Home
          </button>
          <button
            onClick={handleJoinLobby}
            disabled={isJoining || !playerName.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium whitespace-nowrap transition-colors hover:cursor-pointer"
          >
            {isJoining ? 'Joining...' : 'Join Lobby'}
          </button>
        </div>
      </div>
    </PageShell>
  );
};

export default React.memo(JoinPage); 