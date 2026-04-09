/**
 * Notification Service
 * Schedules local Expo notifications — no backend involved.
 *
 * Strategy: Continuous loop every 12 hours.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_MESSAGES = [
  { title: '🧠 Your brain workout is waiting', body: 'A quick Sudoku session will sharpen your focus. Tap to play!' },
  { title: '🔥 Don’t break your streak', body: "Come back and solve today's puzzle. You've got this!" },
  { title: '🧩 A new puzzle is ready for you', body: 'Your daily Sudoku puzzle is waiting. Let\'s keep that streak going!' },
];

function randomMessage() {
  return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    // Silent fail in production
  }
}

export async function scheduleReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const granted = await requestPermissions();
    if (!granted) {
      return;
    }

    // Cancel existing reminders before re-scheduling to avoid duplicates
    await cancelAllNotifications();

    const msg = randomMessage();

    // Schedule repeating 12-hour notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 43200, // 12 hours
        repeats: true,
      },
    });
  } catch (error) {
    // Silent fail in production
  }
}
