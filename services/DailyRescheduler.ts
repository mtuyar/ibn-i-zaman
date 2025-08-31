import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@task_reminder_time'; // used by NotificationService

export async function rescheduleDailyIfNeeded(): Promise<void> {
  try {
    const timeString = await AsyncStorage.getItem(STORAGE_KEY);
    if (!timeString) return;

    const { hour, minute } = JSON.parse(timeString) as { hour: number; minute: number };

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });

      // cancel existing to avoid duplicates
      await Notifications.cancelAllScheduledNotificationsAsync();

      const now = new Date();
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const seconds = Math.max(1, Math.floor((next.getTime() - Date.now()) / 1000));

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Günlük Vazife Hatırlatması',
          body: 'Bugünkü vazifelerinizi tamamlamayı unutmayın!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
    }
    // iOS tarafında calendar+repeats zaten sistem tarafından sürer; burada ekstra işlem yok
  } catch (e) {
    console.warn('DailyRescheduler error', e);
  }
} 