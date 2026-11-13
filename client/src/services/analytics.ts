import posthog from 'posthog-js';

/**
 * Anonymous product analytics (PostHog).
 *
 * - Off entirely when VITE_PUBLIC_POSTHOG_PROJECT_TOKEN isn't set (e.g. local dev)
 * - Players are never identified and no names are sent; PostHog only sees a random
 *   anonymous id plus the browser's device/OS/country details
 * - Tracking is on by default; declining in the notice turns it off for good in that browser
 * - Events go to /ingest on our own domain (proxied to PostHog) so ad blockers don't drop them
 */

const TOKEN = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
const NOTICE_SEEN_KEY = 'nyc-guesser-analytics-notice-seen';

let enabled = false;

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

export function initAnalytics(): void {
  if (!TOKEN || enabled) return;

  posthog.init(TOKEN, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    // Anonymous only: we never call identify(), so no person profiles are created
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    // Only the events below plus page views; no click autocapture or replays
    autocapture: false,
    disable_session_recording: true,
    disable_surveys: true,
    // Front-end crashes count toward the error rate
    capture_exceptions: true,
  });
  posthog.register({ environment: import.meta.env.MODE });
  enabled = true;
}

export function track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]): void {
  if (!enabled) return;
  // PostHog drops captures on its own after opt-out
  posthog.capture(event, properties);
}

/** Show the analytics notice? Only when analytics is on and the player hasn't answered it yet. */
export function shouldShowAnalyticsNotice(): boolean {
  if (!enabled) return false;
  try {
    return localStorage.getItem(NOTICE_SEEN_KEY) === null && !posthog.has_opted_out_capturing();
  } catch {
    return false;
  }
}

function markNoticeSeen(): void {
  try {
    localStorage.setItem(NOTICE_SEEN_KEY, '1');
  } catch {
    // Storage unavailable - the notice may show again next visit
  }
}

export function acknowledgeAnalytics(): void {
  markNoticeSeen();
}

export function declineAnalytics(): void {
  if (enabled) {
    // Persisted by PostHog in this browser; nothing is sent from now on
    posthog.opt_out_capturing();
  }
  markNoticeSeen();
}
