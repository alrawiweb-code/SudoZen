/**
 * Notification Service — Streak-based Duolingo-style local push notifications.
 *
 * Uses expo-notifications (local only — no FCM/backend required).
 *
 * ── Notification types ────────────────────────────────────────────────────────
 *  1. Daily Reminder     — 7 PM every day (unless already completed today)
 *  2. Streak Warning     — 8 PM every day (only if streak > 0 and not completed)
 *  3. Milestone Instant  — fired immediately after a milestone is unlocked
 *
 * ── IDs used ─────────────────────────────────────────────────────────────────
 *  • 'sudozen-daily-reminder'   → 7 PM daily calendar trigger
 *  • 'sudozen-streak-warning'   → 8 PM daily calendar trigger
 *  (milestone notifications have no fixed ID — they fire & disappear)
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Notification channel IDs ───────────────────────────────────────────────────
const CHANNEL_REMINDER = 'sudozen-reminders';
const CHANNEL_STREAK   = 'sudozen-streak';
const CHANNEL_MILESTONE = 'sudozen-milestone';

// ── Identifier constants (for cancel/replace) ─────────────────────────────────
const ID_DAILY_REMINDER = 'sudozen-daily-reminder';
const ID_STREAK_WARNING = 'sudozen-streak-warning';

// ── Global foreground handler ──────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Milestone messages ─────────────────────────────────────────────────────────
const MILESTONE_MESSAGES: Record<number, { title: string; body: string }> = {
  3:   { title: '⚡ 3-day streak!',     body: "You're building momentum — keep going!" },
  5:   { title: '🔥 5-day streak!',     body: "You're on fire! Half-way to a week!" },
  7:   { title: '🦁 One week strong!',  body: 'Keep roaring — a whole week done!' },
  14:  { title: '🐉 Two-week dragon!',  body: 'Breathing fire — 14 days in a row!' },
  30:  { title: '🌟 Legendary!',        body: '30-day streak — you are unstoppable!' },
  60:  { title: '🏆 Two-month titan!',  body: "Two months straight — you're a titan!" },
  100: { title: '🌈 100-Day GOD!',      body: 'MYTHICAL. 100 consecutive days. Wow.' },
};

// ── Android channels ───────────────────────────────────────────────────────────
export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_REMINDER, {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#a078ff',
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_STREAK, {
      name: 'Streak Warnings',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#f97316',
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_MILESTONE, {
      name: 'Milestone Celebrations',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 100, 300],
      lightColor: '#fbbf24',
    });
  } catch (e) {
    console.log('[Notifications] Channel setup error:', e);
  }
}

// ── Permission request ─────────────────────────────────────────────────────────
export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync() as any;
  if (settings.status === 'granted') return true;
  const result = await Notifications.requestPermissionsAsync() as any;
  return result.status === 'granted';
}

// ── Cancel all scheduled notifications ────────────────────────────────────────
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    // Silent fail
  }
}

// ── Cancel a specific notification by identifier ──────────────────────────────
async function cancelById(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (_) {
    // Not found — that's fine
  }
}

// ── Has the user already completed a puzzle today? ────────────────────────────
function hasCompletedToday(lastPlayedDate: string): boolean {
  if (!lastPlayedDate) return false;
  return new Date(lastPlayedDate).toDateString() === new Date().toDateString();
}

/**
 * scheduleStreakNotifications
 *
 * Call this on every app launch, foreground resume, and immediately after puzzle
 * completion. It reschedules the two daily slots based on current state:
 *
 *  • 7 PM  — reminder (only if not completed today)
 *  • 8 PM  — streak warning (only if streak > 0 and not completed today)
 *
 * @param streakDays      Current win streak from game-context
 * @param lastPlayedDate  ISO string of last puzzle completion (from stats)
 */
export async function scheduleStreakNotifications(
  streakDays: number,
  lastPlayedDate: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  await ensureAndroidChannels();
  const granted = await requestPermissions();
  if (!granted) return;

  const completedToday = hasCompletedToday(lastPlayedDate);

  // ── Cancel both existing slots ──────────────────────────────────────────────
  await cancelById(ID_DAILY_REMINDER);
  await cancelById(ID_STREAK_WARNING);

  if (completedToday) {
    // User has already played today — no nagging needed until tomorrow.
    // Both cancellations above are sufficient.
    console.log('[Notifications] Already completed today — reminders suppressed until tomorrow.');
    return;
  }

  try {
    // ── 7 PM daily reminder ─────────────────────────────────────────────────
    await Notifications.scheduleNotificationAsync({
      identifier: ID_DAILY_REMINDER,
      content: {
        title: '🧘 Stay consistent',
        body: "Your streak is waiting — complete today's puzzle!",
        ...(Platform.OS === 'android' && { channelId: CHANNEL_REMINDER }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 19,
        minute: 0,
        repeats: true,
      },
    });

    // ── 8 PM streak warning (only if streak > 0) ────────────────────────────
    if (streakDays > 0) {
      const warningMessages = [
        { title: '🔥 Streak at risk!',       body: `Don't lose your ${streakDays}-day streak — play now!` },
        { title: '⚠️ Streak in danger!',     body: `Your ${streakDays}-day streak expires at midnight!` },
        { title: `🔥 ${streakDays}-day streak`, body: "Don't let it slip — complete today's puzzle!" },
      ];
      const msg = warningMessages[Math.floor(Math.random() * warningMessages.length)];

      await Notifications.scheduleNotificationAsync({
        identifier: ID_STREAK_WARNING,
        content: {
          title: msg.title,
          body: msg.body,
          ...(Platform.OS === 'android' && { channelId: CHANNEL_STREAK }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 20,
          minute: 0,
          repeats: true,
        },
      });
    }

    console.log(`[Notifications] Streak reminders scheduled (streak=${streakDays}).`);
  } catch (e) {
    console.log('[Notifications] Schedule error:', e);
  }
}

/**
 * fireMillstoneNotification
 *
 * Fires an instant (0-second delay) local notification when the user
 * crosses a streak milestone. Call this immediately after puzzle completion
 * when a new milestone threshold is reached.
 *
 * @param milestoneDays  The milestone day count that was just unlocked (e.g. 7, 30)
 */
export async function fireMilestoneNotification(milestoneDays: number): Promise<void> {
  if (Platform.OS === 'web') return;

  const msg = MILESTONE_MESSAGES[milestoneDays];
  if (!msg) return; // not a tracked milestone

  try {
    await ensureAndroidChannels();
    const granted = await requestPermissions();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        ...(Platform.OS === 'android' && { channelId: CHANNEL_MILESTONE }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1, // near-instant
        repeats: false,
      },
    });

    console.log(`[Notifications] Milestone notification fired for ${milestoneDays} days.`);
  } catch (e) {
    console.log('[Notifications] Milestone notification error:', e);
  }
}

/**
 * @deprecated Use scheduleStreakNotifications instead.
 * Kept for backwards compatibility with existing call-sites.
 */
export async function scheduleReminders(): Promise<void> {
  await scheduleStreakNotifications(0, '');
}
