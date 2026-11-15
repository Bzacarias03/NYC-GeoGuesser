import React, { useEffect, useState } from 'react';
import {
  FULL_CONSENT,
  NO_CONSENT,
  getConsent,
  needsConsentPrompt,
  onOpenPrivacySettings,
  saveConsent,
  type ConsentCategory,
  type ConsentChoices,
} from '../../services/analytics';

const CATEGORIES: Array<{ key: ConsentCategory; title: string; description: string }> = [
  { key: 'usage', title: 'Usage & devices', description: 'Helps us see how many people play and on what devices.' },
  { key: 'gameplay', title: 'Gameplay', description: 'Helps us understand how games are played.' },
  { key: 'errors', title: 'Errors & connection', description: 'Helps us find and fix problems.' },
];

const BUTTON = 'flex-1 rounded-lg py-2 px-3 text-sm font-medium whitespace-nowrap transition-colors hover:cursor-pointer';
const SECONDARY_BUTTON = `${BUTTON} border border-white/40 hover:bg-white/10`;
const PRIMARY_BUTTON = `${BUTTON} bg-blue-600 hover:bg-blue-700`;

/**
 * Opt-in consent for anonymous analytics. Shown on the first visit; "Privacy settings"
 * links reopen it. Reject all and Accept all are equally prominent.
 */
export const ConsentBanner: React.FC = () => {
  const [open, setOpen] = useState(needsConsentPrompt);
  const [customizing, setCustomizing] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>(() => getConsent() ?? NO_CONSENT);

  useEffect(() => onOpenPrivacySettings(() => {
    setChoices(getConsent() ?? NO_CONSENT);
    setCustomizing(true);
    setOpen(true);
  }), []);

  if (!open) return null;

  const finish = (selected: ConsentChoices) => {
    saveConsent(selected);
    setOpen(false);
    setCustomizing(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Privacy choices"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:w-96 z-50 rounded-lg border border-white/30 bg-[#242424] text-white shadow-lg p-4"
    >
      <p className="text-sm text-white/90">
        We'd like to use anonymous analytics to improve the game. We never collect names or personal info.
      </p>

      {customizing && (
        <ul className="mt-3 space-y-2">
          <li className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Strictly necessary</div>
              <div className="text-xs text-white/70">Keeps the game working, like rejoining after a refresh.</div>
            </div>
            <span className="shrink-0 text-xs text-white/60 mt-0.5">Always on</span>
          </li>
          {CATEGORIES.map(({ key, title, description }) => (
            <li key={key}>
              <label className="flex items-start justify-between gap-3 hover:cursor-pointer">
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-white/70">{description}</div>
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={title}
                  checked={choices[key]}
                  onChange={(e) => setChoices(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="shrink-0 mt-1 w-4 h-4 accent-blue-600 hover:cursor-pointer"
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => finish(NO_CONSENT)} className={SECONDARY_BUTTON}>
          Reject all
        </button>
        {customizing ? (
          <button onClick={() => finish(choices)} className={SECONDARY_BUTTON}>
            Save choices
          </button>
        ) : (
          <button onClick={() => setCustomizing(true)} className={SECONDARY_BUTTON}>
            Customize
          </button>
        )}
        <button onClick={() => finish(FULL_CONSENT)} className={PRIMARY_BUTTON}>
          Accept all
        </button>
      </div>
    </div>
  );
};
