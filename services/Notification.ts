// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Bildirimleri planla (her gün sabah 08:00 gibi)
export async function scheduleDailyNotification(hour: number, minute: number) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Bildirim izni verilmedi');
    return;
  }

  // Eski bildirimi temizle (tek bir bildirim için)
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
        title: 'Günlük Vazife',
        body: 'Bugünkü görevlerini tamamlamayı unutma!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Günlük Vazife',
        body: 'Bugünkü görevlerini tamamlamayı unutma!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }

  console.log(`Her gün saat ${hour}:${minute} için bildirim kuruldu.`);
}
