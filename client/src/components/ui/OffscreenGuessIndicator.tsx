import React from 'react';
import { MAP_LABEL_CLASS } from '../../constants';

/**
 * A guess that's outside the current map view: the player's colored circle
 * at the map edge (toward their guess) with their name and distance.
 */
export const OffscreenGuessIndicator: React.FC<{
  x: number;
  y: number;
  color: string;
  label: string;
}> = ({ x, y, color, label }) => (
  <div
    className="absolute flex flex-col items-center"
    style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
  >
    <div
      className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
      style={{ backgroundColor: color }}
    />
    <div className={`mt-1 bg-black/70 ${MAP_LABEL_CLASS}`}>
      {label}
    </div>
  </div>
);
