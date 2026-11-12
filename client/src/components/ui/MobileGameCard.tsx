import React from 'react';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { formatDistance } from '../../utils';
import { getLineColorClass } from '../../utils/subwayLines';
import "../../subway-icons.scss";

interface MobileGameCardProps {
  /** Measured by the game page so the map can keep the reveal clear of the card */
  cardRef: React.Ref<HTMLDivElement>;
  onBack: () => void;
  currentRound: number;
  totalRounds: number;
  stationName?: string;
  stationLines?: string;
  isCountdown: boolean;
  countdownTime: number;
  isRoundActive: boolean;
  timeRemaining: number;
  /** This player's total score */
  myScore: number;
  hasGuessed: boolean;
  /** Round has ended and the map is showing everyone's guesses */
  showRoundResults: boolean;
  /** This player's result for the round (null = didn't guess) */
  myRoundResult: { points: number; distance: number } | null;
}

/**
 * Phone layout: one compact card over the top of a full-screen map with
 * the round, timer, station and this player's own score/status.
 */
export const MobileGameCard: React.FC<MobileGameCardProps> = ({
  cardRef,
  onBack,
  currentRound,
  totalRounds,
  stationName,
  stationLines,
  isCountdown,
  countdownTime,
  isRoundActive,
  timeRemaining,
  myScore,
  hasGuessed,
  showRoundResults,
  myRoundResult,
}) => {
  const lines = stationLines ? stationLines.split(',').map(line => line.trim()).filter(Boolean) : [];
  const timer = `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`;

  return (
    <div
      ref={cardRef}
      className="md:hidden absolute top-2 left-2 right-2 z-10 rounded-lg border border-white/30 text-white shadow-lg px-3 py-2"
      style={{ backgroundColor: 'rgba(36, 36, 36, 0.95)' }}
    >
      {/* Back button | station (centered) | timer. Side columns share a width so the station is truly centered */}
      <div className="flex items-center gap-2">
        <div className="w-14 shrink-0">
          <button
            onClick={onBack}
            aria-label="Leave game"
            className="bg-white/90 text-black rounded-md p-1"
          >
            <ArrowBack fontSize="small" />
          </button>
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-center">
          {stationName && <span className="font-bold text-base leading-tight">{stationName}</span>}
          {lines.length > 0 && (
            <span className="flex items-center gap-1">
              {lines.map((line, index) => (
                <span key={`${line}-${index}`} className={`subway-icon ${getLineColorClass(line)}`}>
                  {line}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="w-14 shrink-0 text-right">
          {isCountdown && (
            <div className="text-yellow-400 font-bold animate-pulse leading-tight">
              <div className="text-[10px] font-semibold opacity-80">Starts in</div>
              <div className="text-lg">{countdownTime}</div>
            </div>
          )}
          {isRoundActive && !isCountdown && (
            <div className={`text-lg font-mono font-bold ${timeRemaining <= 5 ? 'text-red-400 animate-pulse' : ''}`}>
              {timer}
            </div>
          )}
        </div>
      </div>

      {/* Round */}
      <div className="text-xs font-semibold opacity-75 mt-1">
        Round {currentRound}/{totalRounds}
      </div>

      {/* This player's status */}
      <div className="flex items-center gap-2 mt-1 text-xs">
        <span className="opacity-75">You</span>
        <span className="font-bold text-yellow-400">{myScore} pts</span>
        {showRoundResults ? (
          myRoundResult ? (
            <span className="font-semibold text-blue-400">
              +{myRoundResult.points} · {formatDistance(myRoundResult.distance)}
            </span>
          ) : (
            <span className="text-gray-400">No guess</span>
          )
        ) : isRoundActive && (
          hasGuessed ? (
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle sx={{ fontSize: 14 }} /> Guessed
            </span>
          ) : (
            <span className="opacity-75">Tap the map to guess</span>
          )
        )}
      </div>
    </div>
  );
};
