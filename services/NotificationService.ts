import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFICATION_STORAGE_KEY = '@task_reminder_time';

// Configure notification handler once
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('🔔 Notification handler çağrıldı:', notification.request.content.title);
    return {
      shouldShowAlert: true, // Deprecated but keep for compat
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true, // New way
      shouldShowList: true,
    };
  },
});

export async function initialize() {
  // Ask permission and ensure Android channels exist
  await NotificationService.requestPermissions();
    if (Platform.OS === 'android') {
      // Günlük hatırlatmalar için channel
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Günlük Hatırlatmalar',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976D2',
        sound: 'default',
      });
      
      // Mesaj bildirimleri için channel (v2: kesinlikle sesli)
      await Notifications.setNotificationChannelAsync('messages_v2', {
        name: 'Mesaj Bildirimleri',
        description: 'Yeni mesaj bildirimleri',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976D2',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      
      // Default channel (diğer bildirimler için)
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Genel Bildirimler',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976D2',
        sound: 'default',
      });
    }
}

export class NotificationService {
  static async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  static async scheduleDailyReminder(hour: number = 8, minute: number = 0) {
    // Cancel any existing reminders when user updates time
    await this.cancelAllReminders();

    // Save the reminder time
    await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({ hour, minute }));

    if (Platform.OS === 'android') {
      // Ensure channel
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Günlük Hatırlatmalar',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976D2',
        sound: 'default',
      });

      // Schedule next occurrence as a one-shot time interval
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
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          channelId: 'daily-reminders',
        },
      });
    } else {
      // iOS supports calendar-style repeating
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Günlük Vazife Hatırlatması',
          body: 'Bugünkü vazifelerinizi tamamlamayı unutmayın!',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour,
          minute,
          repeats: true,
        },
      });
    }
  }

  static async cancelAllReminders() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
  }

  static async getReminderTime(): Promise<{ hour: number; minute: number } | null> {
    const timeString = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!timeString) return null;
    return JSON.parse(timeString);
  }

  static async isReminderSet(): Promise<boolean> {
    const time = await this.getReminderTime();
    return time !== null;
  }
} 