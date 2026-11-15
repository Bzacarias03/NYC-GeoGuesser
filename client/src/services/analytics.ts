import posthog, { type CaptureResult } from 'posthog-js';

/**
 * Anonymous product analytics (PostHog), with per-category opt-in consent.
 *
 * - Off entirely when VITE_PUBLIC_POSTHOG_PROJECT_TOKEN isn't set (e.g. local dev)
 * - Nothing is sent and PostHog stores nothing until the player accepts at least one
 *   category in the consent banner (GDPR opt-in)
 * - Each event is checked against the categories the player allowed before it's sent
 * - Players are never identified and no names are sent
 * - Events go to /ingest on our own domain (proxied to PostHog) so ad blockers don't drop them
 */

const TOKEN = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
const CONSENT_KEY = 'nyc-guesser-analytics-consent';
/** The previous opt-out notice; only used to carry over an earlier Decline */
const LEGACY_NOTICE_KEY = 'nyc-guesser-analytics-notice-seen';

export type ConsentCategory = 'usage' | 'gameplay' | 'errors';
export type ConsentChoices = Record<ConsentCategory, boolean>;

export const NO_CONSENT: ConsentChoices = { usage: false, gameplay: false, errors: false };
export const FULL_CONSENT: ConsentChoices = { usage: true, gameplay: true, errors: true };

let enabled = false;
let consent: ConsentChoices | null = null;

// The game this player is currently in (null in the lobby or on the home page), so events
// that can happen at any point in a game (leaving, disconnecting) carry its game_id
let activeGameId: string | null = null;

export function setActiveGameId(gameId: string | null): void {
  activeGameId = gameId || null;
}

export function getActiveGameId(): string | null {
  return activeGameId;
}

// Lobbies that finished a game in this browser, so the next start counts as a rematch
const lobbiesWithCompletedGame = new Set<string>();

export function markGameCompleted(lobbyId: string): void {
  lobbiesWithCompletedGame.add(lobbyId);
}

export function isRematch(lobbyId: string): boolean {
  return lobbiesWithCompletedGame.has(lobbyId);
}

/** Event name -> properties. Every event is also timestamped by PostHog. */
interface AnalyticsEvents {
  lobby_created: Record<string, never>;
  lobby_joined: { method: 'code' | 'invite_link' };
  invite_link_copied: Record<string, never>;
  // game_id is created by the server at game start and is the same for every player,
  // so per-game counts are "unique game_id" (each player sends their own round/game events)
  game_started: { game_id: string; player_count: number; is_rematch: boolean };
  round_completed: { game_id: string; round: number; player_count: number };
  game_completed: { game_id: string; player_count: number };
  game_left_early: { game_id: string | null; round: number };
  game_ended_unexpectedly: { game_id: string | null; reason: 'aborted' | 'server_lost' | 'reconnect_failed' };
  // game_id is null when these happen in the lobby rather than during a game
  player_disconnected: { game_id: string | null; reason: string };
  rejoined_after_disconnect: { game_id: string | null; success: boolean };
}

const ERROR_EVENTS = new Set<string>([
  '$exception',
  'game_ended_unexpectedly',
  'player_disconnected',
  'rejoined_after_disconnect',
]);

/** Which consent category an event belongs to */
function categoryOf(event: string): ConsentCategory {
  if (ERROR_EVENTS.has(event)) return 'errors';
  // PostHog's own events: page views, page leaves, web vitals
  if (event.startsWith('$')) return 'usage';
  return 'gameplay';
}

/** Device, browser and location details PostHog adds to every event */
const DEVICE_PROPERTY_PREFIXES = ['$browser', '$os', '$device', '$screen', '$viewport', '$referr', '$raw_user_agent', '$timezone'];

function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event || !consent || !consent[categoryOf(event.event)]) return null;

  // Without "Usage & devices", other categories still go out but without device/location details
  if (!consent.usage && event.properties) {
    for (const key of Object.keys(event.properties)) {
      if (DEVICE_PROPERTY_PREFIXES.some(prefix => key.startsWith(prefix))) {
        delete event.properties[key];
      }
    }
    event.properties.$geoip_disable = true;
  }
  return event;
}

function readConsent(): ConsentChoices | null {
  try {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<ConsentChoices>;
      return { usage: !!parsed.usage, gameplay: !!parsed.gameplay, errors: !!parsed.errors };
    }
  } catch {
    // Unreadable or storage blocked - ask again
  }
  return null;
}

function writeConsent(choices: ConsentChoices): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...choices, decidedAt: new Date().toISOString() }));
    localStorage.removeItem(LEGACY_NOTICE_KEY);
  } catch {
    // Storage blocked - the choice applies to this visit only
  }
}

/**
 * Did this browser click Decline on the old opt-out notice? Reads the opt-out PostHog
 * saved at the time, since has_opted_out_capturing() is now true for anyone who hasn't chosen.
 */
function declinedLegacyNotice(): boolean {
  try {
    if (localStorage.getItem(LEGACY_NOTICE_KEY) === null) return false;
    const optOutKey = `__ph_opt_in_out_${TOKEN}`;
    const stored = localStorage.getItem(optOutKey)
      ?? document.cookie.split('; ').find(c => c.startsWith(`${optOutKey}=`))?.split('=')[1];
    return stored === '0';
  } catch {
    return false;
  }
}

function hasAnyConsent(choices: ConsentChoices): boolean {
  return choices.usage || choices.gameplay || choices.errors;
}

export function initAnalytics(): void {
  if (!TOKEN || enabled) return;

  posthog.init(TOKEN, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    // Opt-in: no capturing and no PostHog cookie/storage until consent is given
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    // Anonymous only: we never call identify(), so no person profiles are created
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    // Only page views, our events and errors; no click autocapture, replays or surveys
    autocapture: false,
    disable_session_recording: true,
    disable_surveys: true,
    capture_exceptions: true,
    before_send: beforeSend,
  });
  posthog.register({ environment: import.meta.env.MODE });
  enabled = true;

  consent = readConsent();
  if (!consent) {
    // Someone who declined the old opt-out notice stays opted out without being asked again
    if (declinedLegacyNotice()) {
      saveConsent(NO_CONSENT);
    }
  } else if (hasAnyConsent(consent)) {
    posthog.opt_in_capturing({ captureEventName: false });
  }
}

/** Analytics is configured for this build (controls whether the banner/settings appear) */
export function isAnalyticsAvailable(): boolean {
  return enabled;
}

export function getConsent(): ConsentChoices | null {
  return consent;
}

/** First visit (or the choice couldn't be stored): ask before tracking anything */
export function needsConsentPrompt(): boolean {
  return enabled && consent === null;
}

export function saveConsent(choices: ConsentChoices): void {
  if (!enabled) return;
  const hadUsage = consent?.usage ?? false;
  consent = choices;
  writeConsent(choices);

  if (hasAnyConsent(choices)) {
    posthog.opt_in_capturing({ captureEventName: false });
    // The page view for the current page was skipped while waiting for consent
    if (choices.usage && !hadUsage) {
      posthog.capture('$pageview');
    }
  } else {
    // Persisted by PostHog in this browser; nothing is sent from now on
    posthog.opt_out_capturing();
  }
}

export function track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]): void {
  if (!enabled) return;
  // Dropped by PostHog before opt-in, and by beforeSend if its category wasn't allowed
  posthog.capture(event, properties);
}

// "Privacy settings" links reopen the consent banner
type Listener = () => void;
const privacySettingsListeners = new Set<Listener>();

export function onOpenPrivacySettings(listener: Listener): () => void {
  privacySettingsListeners.add(listener);
  return () => privacySettingsListeners.delete(listener);
}

export function openPrivacySettings(): void {
  privacySettingsListeners.forEach(listener => listener());
}
