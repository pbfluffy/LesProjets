import { useEffect, useRef } from 'react';
import { WATER_GLASSES, WATER_ML_PER_GLASS } from '../data/constants.js';

/** localStorage key for the last-notification timestamp (epoch ms).
 * Kept separate from the main store so it doesn't bloat backup exports. */
const LAST_NOTIFY_KEY = 'nutritions.waterReminder.lastNotify';

/** Return true if the current local hour falls inside [start, end) quiet window.
 * Handles wrap-around (e.g. quiet 22→7 means "10pm to 7am"). */
function isQuietHour(hour, start, end) {
  if (start === end) return false; // no quiet window
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/** Read translator at fire-time so reminders respect the user's current language. */
function fire(t, currentMl, goalMl) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    const remaining = Math.max(0, goalMl - currentMl);
    const body = remaining > 0
      ? t('waterReminder.body', { ml: remaining })
      : t('waterReminder.bodyDone');
    // tag dedupes — if the previous one is still on screen the new replaces it
    new Notification(t('waterReminder.title'), {
      body,
      tag: 'nutritions-water',
      icon: '/nutritions-thailand/icon-192.png',
      badge: '/nutritions-thailand/icon-192.png',
      silent: false,
    });
    localStorage.setItem(LAST_NOTIFY_KEY, String(Date.now()));
  } catch {
    /* notification construction failed — ignore */
  }
}

/** Schedule water-reminder notifications based on user settings.
 *
 * - Permission must be 'granted' and `enabled` true.
 * - Fires only when today's water is below the goal.
 * - Suppressed during the quiet-hours window.
 * - Throttled: never sooner than `interval` minutes since the last fire.
 *
 * Reminders are in-tab only (no service worker push). They fire while the
 * Nutritions Thailand tab/PWA is open in the foreground OR background, but
 * stop when fully closed. This is the acceptable trade for shipping without
 * a backend.
 */
export function useWaterReminder({ stats, water, t }) {
  const tickRef = useRef(null);
  const waterRef = useRef(water);
  const tRef = useRef(t);

  // Keep refs current so the interval callback always reads fresh values.
  waterRef.current = water;
  tRef.current = t;

  const {
    waterReminderEnabled,
    waterReminderInterval, // minutes
    waterReminderQuietStart,
    waterReminderQuietEnd,
  } = stats;

  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    if (!waterReminderEnabled) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const intervalMs = Math.max(5, waterReminderInterval || 90) * 60 * 1000;
    const goalMl = WATER_GLASSES * WATER_ML_PER_GLASS;

    const tick = () => {
      const now = new Date();
      const hour = now.getHours();
      if (isQuietHour(hour, waterReminderQuietStart, waterReminderQuietEnd)) return;

      // Throttle by last-fire timestamp.
      const lastStr = localStorage.getItem(LAST_NOTIFY_KEY);
      const last = lastStr ? Number(lastStr) : 0;
      if (Number.isFinite(last) && Date.now() - last < intervalMs) return;

      if (waterRef.current >= goalMl) return; // already at goal

      fire(tRef.current, waterRef.current, goalMl);
    };

    // Check every minute — keeps the interval cheap and snappy without
    // requiring a fresh timer when the user adjusts settings mid-day.
    tickRef.current = setInterval(tick, 60 * 1000);
    // Don't fire immediately on mount — but do check after a short delay so
    // a freshly enabled reminder feels responsive without being intrusive.
    const initial = setTimeout(tick, 5000);

    return () => {
      clearTimeout(initial);
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [
    waterReminderEnabled,
    waterReminderInterval,
    waterReminderQuietStart,
    waterReminderQuietEnd,
  ]);
}

/** Request permission. Returns the resulting permission string. */
export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Read current permission state. */
export function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}
