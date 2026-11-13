import React, { useState } from 'react';
import { acknowledgeAnalytics, declineAnalytics, shouldShowAnalyticsNotice } from '../../services/analytics';

/**
 * One-time notice that anonymous analytics are collected, with a way to opt out.
 * Analytics stay on unless the player declines.
 */
export const AnalyticsNotice: React.FC = () => {
  const [visible, setVisible] = useState(shouldShowAnalyticsNotice);

  if (!visible) return null;

  const handleAcknowledge = () => {
    acknowledgeAnalytics();
    setVisible(false);
  };

  const handleDecline = () => {
    declineAnalytics();
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Analytics notice"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-50 rounded-lg border border-white/30 bg-[#242424] text-white shadow-lg p-4"
    >
      <p className="text-sm text-white/90">
        We use anonymous analytics to see how the game is played. We never collect names or personal info.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleDecline}
          className="flex-1 border border-white/40 hover:bg-white/10 rounded-lg py-2 text-sm font-medium transition-colors hover:cursor-pointer"
        >
          Decline
        </button>
        <button
          onClick={handleAcknowledge}
          className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg py-2 text-sm font-medium transition-colors hover:cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
