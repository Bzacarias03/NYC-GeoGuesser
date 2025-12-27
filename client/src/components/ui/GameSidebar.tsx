import React, { useMemo } from 'react';
import { LocationOn, CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { PLAYER_COLORS, UI_CONFIG } from '../../constants';
import "../../subway-icons.scss";

interface Player {
  id: string;
  name: string;
  score: number;
  hasGuessed?: boolean;
  color?: string;
}

interface GameSidebarProps {
  players: Player[];
  currentPlayerId: string | null;
  currentRound: number;
  stationName?: string;
  stationLines?: string;
  isRoundActive: boolean;
}

/**
 * Maps MTA line letters/numbers to their corresponding color class
 */
const getLineColorClass = (line: string): string => {
  const trimmedLine = line.trim().toUpperCase();
  
  // Numbered lines
  if (['1', '2', '3'].includes(trimmedLine)) {
    return 'mta-red';
  }
  if (['4', '5', '6'].includes(trimmedLine)) {
    return 'mta-green';
  }
  if (trimmedLine === '7') {
    return 'mta-purple';
  }
  
  // Letter lines
  if (['A', 'C', 'E'].includes(trimmedLine)) {
    return 'mta-blue';
  }
  if (['B', 'D', 'F', 'M'].includes(trimmedLine)) {
    return 'mta-orange';
  }
  if (trimmedLine === 'G') {
    return 'mta-green-2';
  }
  if (['J', 'Z'].includes(trimmedLine)) {
    return 'mta-brown';
  }
  if (trimmedLine === 'L') {
    return 'mta-gray';
  }
  if (['N', 'Q', 'R', 'W'].includes(trimmedLine)) {
    return 'mta-yellow';
  }
  if (trimmedLine === 'S') {
    return 'mta-gray';
  }
  
  // Default to gray for unknown lines
  return 'mta-gray';
};

export const GameSidebar: React.FC<GameSidebarProps> = ({
  players,
  currentPlayerId,
  currentRound,
  stationName,
  stationLines,
  isRoundActive
}) => {
  const stationLinesArray = useMemo(() => {
    if (!stationLines) return [];
    return stationLines.split(',').map(line => line.trim()).filter(Boolean);
  }, [stationLines]);
  
  return (
    <div 
      className="h-full flex flex-col text-white"
      style={{ 
        backgroundColor: UI_CONFIG.DARK_BACKGROUND,
        width: UI_CONFIG.SIDEBAR_WIDTH
      }}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/20">
        <div className="text-center mb-4">
          <div className="text-sm opacity-75 mb-1">Round {currentRound}</div>
        </div>
        
        {stationName && (
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <LocationOn className="text-red-400" fontSize="small" />
              <span className="text-sm opacity-75">Find Station:</span>
            </div>
            <div className="font-semibold text-sm mb-2">{stationName}</div>
            {stationLinesArray.length > 0 && (
              <div className="flex items-center justify-center flex-wrap gap-1 mt-2">
                {stationLinesArray.map((line, index) => {
                  const colorClass = getLineColorClass(line);
                  return (
                    <span
                      key={`${line}-${index}`}
                      className={`subway-icon ${colorClass}`}
                    >
                      {line}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Player List */}
      <div className="flex-1 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3">Players</h3>
          <div className="space-y-3">
            {players.map((player, index) => {
              const isCurrentPlayer = player.id === currentPlayerId;
              const playerColor = player.color || PLAYER_COLORS[index % PLAYER_COLORS.length];
              
              return (
                <div 
                  key={player.id}
                  className={`p-3 rounded-lg border ${
                    isCurrentPlayer 
                      ? 'bg-white/20 border-white/40' 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  {/* Player Info */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: playerColor }}
                      />
                      <div>
                        <div className="font-medium text-sm">
                          {player.name}
                          {isCurrentPlayer && ' (You)'}
                        </div>
                        <div className="text-xs opacity-75">
                          Player {index + 1}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-yellow-400">
                        {player.score}
                      </div>
                      <div className="text-xs opacity-75">points</div>
                    </div>
                  </div>

                  {/* Guess Status */}
                  {isRoundActive && (
                    <div className="flex items-center gap-2 text-xs">
                      {player.hasGuessed ? (
                        <>
                          <CheckCircle className="text-green-400" fontSize="small" />
                          <span className="text-green-400">Guessed</span>
                        </>
                      ) : (
                        <>
                          <RadioButtonUnchecked className="text-gray-400" fontSize="small" />
                          <span className="text-gray-400">Waiting...</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Game Status */}
        {isRoundActive && (
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-sm opacity-75 mb-1">Game Status</div>
            <div className="text-lg font-semibold text-blue-400">
              Round in Progress
            </div>
            <div className="text-xs opacity-75 mt-1">
              Click on the map to place your guess
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(GameSidebar); 