import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../config/firebase';

export async function getExpoPushTokenAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Push permission not granted');
    return null;
  }

  // Android channel safety
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1976D2',
      sound: 'default',
    });
  }

  // Some build contexts require an explicit projectId
  const projectId =
    (Constants as any)?.easConfig?.projectId ||
    (Constants?.expoConfig?.extra as any)?.eas?.projectId ||
    (Constants as any)?.manifest?.extra?.eas?.projectId ||
    'da5826aa-089a-4973-9f1d-a9150051f57a'; // fallback to your EAS projectId
  console.log('Using projectId for push token:', projectId);

  const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId } as any);
  console.log('Expo push token response:', tokenResp?.data);
  return tokenResp?.data ?? null;
}

// Register for native device push (FCM on Android). This is NOT Expo push.
export async function getDevicePushTokenAsync(): Promise<{ type: string; data: string } | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Push permission not granted');
    return null;
  }

  // Ensure Android channel exists
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1976D2',
      sound: 'default',
    });
  }

  try {
    const nativeToken = await Notifications.getDevicePushTokenAsync();
    // nativeToken.type is usually 'fcm' on Android when FCM is configured
    return nativeToken as any;
  } catch (e) {
    console.error('getDevicePushTokenAsync error:', e);
    return null;
  }
}

export async function saveUserPushToken(userId: string, expoPushToken: string | null) {
  try {
    if (!userId) return;
    if (!expoPushToken) {
      console.log('Skipping save: expoPushToken is null');
      return;
    }
    const userRef = doc(db, 'users', userId);
    // Upsert to ensure token is saved even if the user doc doesn't exist yet
    console.log('Saving expoPushToken for user:', userId, expoPushToken);
    await setDoc(userRef, { expoPushToken }, { merge: true });
    console.log('Saved expoPushToken successfully');
  } catch (e) {
    console.error('saveUserPushToken error:', e);
  }
}

export async function saveUserFcmToken(userId: string, fcmToken: string | null) {
  try {
    if (!userId) return;
    if (!fcmToken) {
      console.log('Skipping save: fcmToken is null');
      return;
    }
    const userRef = doc(db, 'users', userId);
    console.log('Saving fcmToken for user:', userId, fcmToken);
    await setDoc(userRef, { fcmToken }, { merge: true });
    console.log('Saved fcmToken successfully');
  } catch (e) {
    console.error('saveUserFcmToken error:', e);
  }
}

// Helper: request permissions, fetch native token, and save if FCM
export async function registerDevicePushToken(userId: string) {
  try {
    // Expo Notifications device push token (Android → FCM, iOS → APNs)
    const token = await getDevicePushTokenAsync();
    console.log('Device push token acquired:', token);
    if (!token) return;
    if (token.type === 'fcm') {
      await saveUserFcmToken(userId, token.data);
    } else if (token.type === 'apns') {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { apnsToken: token.data }, { merge: true });
      console.log('Saved APNs token. Note: Cloud Functions need FCM token to deliver.');
    } else {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { devicePushToken: token.data, devicePushType: token.type }, { merge: true });
    }
  } catch (e) {
    console.error('registerDevicePushToken error:', e);
  }
}

export async function sendExpoPush(expoPushToken: string, title: string, body: string, data?: Record<string, any>) {
  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (e) {
    console.error('sendExpoPush error:', e);
  }
}


