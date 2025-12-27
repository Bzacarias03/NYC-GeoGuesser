import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocationOn } from '@mui/icons-material';
import { ERROR_MESSAGES } from '../../constants';
import { useLobbyStore } from '../../stores/lobbyStore';
import staticMap from '../../assets/static_map.webp';

interface FormData {
  username: string;
  lobbyId: string;
}

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

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { createLobby, joinLobby } = useLobbyStore();
  
  const [formData, setFormData] = useState<FormData>({
    username: '',
    lobbyId: '',
  });
  
  const [isLoading, setIsLoading] = useState({
    startGame: false,
    joinGame: false,
  });

  const [localError, setLocalError] = useState<string | null>(null);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear errors when user starts typing
    if (localError) setLocalError(null);
  }, [localError]);

  const validateForm = useCallback((type: 'start' | 'join'): boolean => {
    if (!formData.username.trim()) {
      setLocalError(ERROR_MESSAGES.INVALID_PLAYER_NAME);
      return false;
    }

    if (type === 'join' && !formData.lobbyId.trim()) {
      setLocalError('Please enter a valid lobby ID.');
      return false;
    }

    return true;
  }, [formData]);

  const handleStartGame = useCallback(async () => {
    if (!validateForm('start')) return;

    setIsLoading(prev => ({ ...prev, startGame: true }));
    
    try {
      // Create a new lobby and navigate to it
      await createLobby(formData.username.trim(), false);
      
      // Navigate to lobby page - the lobby store will handle showing the created lobby
      navigate('/lobby');
    } catch {
      setLocalError('Failed to start game. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, startGame: false }));
    }
  }, [formData.username, validateForm, createLobby, navigate]);

  const handleJoinGame = useCallback(async () => {
    if (!validateForm('join')) return;

    setIsLoading(prev => ({ ...prev, joinGame: true }));
    
    try {
      // Join the lobby
      await joinLobby(formData.lobbyId.trim(), formData.username.trim());
      
      // Navigate to lobby page - the lobby store will handle showing the joined lobby
      navigate('/lobby');
    } catch {
      setLocalError('Failed to join game. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, joinGame: false }));
    }
  }, [formData, validateForm, joinLobby, navigate]);

  const currentError = localError || null;

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
      
      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-8">
        {/* Central Card - matching LobbyPage styling */}
        <div className="bg-[#242424] border border-white rounded-lg p-8 w-full max-w-lg mx-auto">

          {/* Error Display */}
          <ErrorDisplay 
            error={currentError} 
            onDismiss={() => {
              setLocalError(null);
            }} 
          />

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-white text-2xl font-bold">Join or Start Game</h2>
          </div>

          {/* Username Input - Shared */}
          <div className="mb-6">
            <label htmlFor="username" className="block text-white/80 text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              disabled={isLoading.startGame || isLoading.joinGame}
            />
          </div>

          {/* Lobby ID Input - For Join Game */}
          <div className="mb-6">
            <label htmlFor="lobby-id" className="block text-white/80 text-sm font-medium mb-2">
              Lobby ID
            </label>
            <input
              id="lobby-id"
              type="text"
              value={formData.lobbyId}
              onChange={(e) => handleInputChange('lobbyId', e.target.value)}
              placeholder="Enter lobby ID to join existing game"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              disabled={isLoading.startGame || isLoading.joinGame}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-10">
            <button
              onClick={handleStartGame}
              disabled={isLoading.startGame || !formData.username.trim() || !!formData.lobbyId.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium transition-colors hover:cursor-pointer"
            >
              {isLoading.startGame ? 'Starting...' : 'Start New Game'}
            </button>
            <button
              onClick={handleJoinGame}
              disabled={isLoading.joinGame || !formData.username.trim() || !formData.lobbyId.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium transition-colors hover:cursor-pointer"
            >
              {isLoading.joinGame ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(HomePage);
