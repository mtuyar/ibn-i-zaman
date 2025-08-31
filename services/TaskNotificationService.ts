import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bildirim ayarlarını yapılandır
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Bildirim izinlerini kontrol et ve iste
export const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return false;
  }
  
  return true;
};

// Günlük bildirim zamanını kaydet
export const saveDailyNotificationTime = async (hour: number, minute: number) => {
  try {
    await AsyncStorage.setItem('dailyNotificationTime', JSON.stringify({ hour, minute }));
    return true;
  } catch (error) {
    console.error('Bildirim zamanı kaydedilemedi:', error);
    return false;
  }
};

// Günlük bildirim zamanını getir
export const getDailyNotificationTime = async () => {
  try {
    const timeString = await AsyncStorage.getItem('dailyNotificationTime');
    if (timeString) {
      return JSON.parse(timeString);
    }
    return null;
  } catch (error) {
    console.error('Bildirim zamanı alınamadı:', error);
    return null;
  }
};

// Günlük bildirimi planla
export const scheduleDailyNotification = async (hour: number, minute: number) => {
  try {
    // Önceki bildirimleri iptal et
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });

      const now = new Date();
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);

      const seconds = Math.max(1, Math.floor((next.getTime() - Date.now()) / 1000));
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Günlük Vazife Hatırlatması',
          body: 'Bugünkü vazifelerinizi kontrol etmeyi unutmayın!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
    } else {
      const trigger: Notifications.CalendarTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Günlük Vazife Hatırlatması',
          body: 'Bugünkü vazifelerinizi kontrol etmeyi unutmayın!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });
    }

    return true;
  } catch (error) {
    console.error('Bildirim planlanamadı:', error);
    return false;
  }
};

// Bildirimleri kapat
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem('dailyNotificationTime');
    return true;
  } catch (error) {
    console.error('Bildirimler kapatılamadı:', error);
    return false;
  }
}; 