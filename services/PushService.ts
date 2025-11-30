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

  // Ensure Android channels exist
  if (Platform.OS === 'android') {
    // Mesaj bildirimleri için channel
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mesaj Bildirimleri',
      description: 'Yeni mesaj bildirimleri',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1976D2',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    
    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Genel Bildirimler',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1976D2',
      sound: 'default',
    });
  }

  try {
    console.log('📱 getDevicePushTokenAsync: Token alınıyor...');
    const nativeToken = await Notifications.getDevicePushTokenAsync();
    // nativeToken.type is usually 'fcm' on Android when FCM is configured
    if (nativeToken) {
      console.log('✅ Native push token alındı - type:', nativeToken.type, 'data:', nativeToken.data?.substring(0, 30) + '...');
    } else {
      console.warn('⚠️ Native push token null döndü');
    }
    return nativeToken as any;
  } catch (e) {
    console.error('❌ getDevicePushTokenAsync error:', e);
    console.error('Error details:', JSON.stringify(e, null, 2));
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
    console.log('🔔 registerDevicePushToken: Başlatılıyor - userId:', userId);
    console.log('📱 Device.isDevice:', Device.isDevice);
    console.log('📱 Platform.OS:', Platform.OS);
    
    // Önce permissions kontrolü
    const { status } = await Notifications.getPermissionsAsync();
    console.log('🔐 Notification permission status:', status);
    
    if (status !== 'granted') {
      console.warn('⚠️ Notification permission verilmemiş!');
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      console.log('🔐 Yeni permission status:', newStatus);
      if (newStatus !== 'granted') {
        console.error('❌ Notification permission reddedildi!');
        return;
      }
    }
    
    // Expo Notifications device push token (Android → FCM, iOS → APNs)
    const token = await getDevicePushTokenAsync();
    console.log('📱 registerDevicePushToken: Token alındı:', token ? `${token.type}: ${token.data?.substring(0, 30)}...` : 'null');
    
    if (!token) {
      console.error('❌ registerDevicePushToken: Token alınamadı!');
      console.log('💡 İpucu: Expo Go\'da native FCM token almak için production build gerekebilir.');
      return;
    }
    
    const userRef = doc(db, 'users', userId);
    
    if (token.type === 'fcm') {
      console.log('💾 registerDevicePushToken: FCM token kaydediliyor...');
      await saveUserFcmToken(userId, token.data);
      console.log('✅ registerDevicePushToken: FCM token başarıyla kaydedildi!');
    } else if (token.type === 'apns' || token.type === 'ios') {
      // iOS için APNs token'ı kaydet
      await setDoc(userRef, { 
        apnsToken: token.data,
        devicePushToken: token.data,
        devicePushType: 'apns'
      }, { merge: true });
      console.log('💾 registerDevicePushToken: APNs token kaydedildi:', token.data.substring(0, 30) + '...');
      // iOS için FCM token olarak da kaydet (Cloud Functions uyumluluğu için)
      // Not: iOS'ta FCM yok ama Cloud Functions APNs token'ı da kullanabilir
      await setDoc(userRef, { 
        fcmToken: token.data // iOS token'ını fcmToken olarak da kaydet
      }, { merge: true });
      console.log('💾 registerDevicePushToken: iOS token fcmToken olarak da kaydedildi (Cloud Functions uyumluluğu için)');
    } else {
      await setDoc(userRef, { 
        devicePushToken: token.data, 
        devicePushType: token.type,
        fcmToken: token.data // Genel token'ı fcmToken olarak da kaydet
      }, { merge: true });
      console.log('💾 registerDevicePushToken: Device push token kaydedildi - type:', token.type);
    }
  } catch (e) {
    console.error('❌ registerDevicePushToken error:', e);
    console.error('Error stack:', (e as Error)?.stack);
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

// Test bildirimi gönder (debug için)
export async function sendTestNotification(userId: string) {
  try {
    const { doc, getDoc, collection, addDoc, getDocs, query, where, Timestamp } = await import('firebase/firestore');
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    const pushToken = userData?.fcmToken || userData?.apnsToken || userData?.devicePushToken;
    if (!pushToken) {
      console.error('❌ Push token bulunamadı! Önce token kaydedilmeli.');
      console.log('📋 Mevcut user data fields:', Object.keys(userData || {}).join(', '));
      return false;
    }
    
    const tokenType = userData?.fcmToken ? 'FCM' : (userData?.apnsToken ? 'APNs' : 'Device');
    console.log(`✅ ${tokenType} token bulundu: ${pushToken.substring(0, 30)}...`);
    
    console.log('🧪 Test bildirimi gönderiliyor...');
    
    // Test chat'i bul veya oluştur (kullanıcının kendisiyle)
    let testChatId: string | null = null;
    
    // Önce mevcut test chat'ini ara
    const testChatQuery = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', userId),
      where('name', '==', 'Test Bildirimi')
    );
    const testChatSnapshot = await getDocs(testChatQuery);
    
    if (!testChatSnapshot.empty) {
      testChatId = testChatSnapshot.docs[0].id;
      console.log('📱 Mevcut test chat bulundu:', testChatId);
    } else {
      // Test chat'i oluştur (kullanıcının kendisiyle)
      const now = Timestamp.now();
      const testChatData = {
        type: 'private',
        name: 'Test Bildirimi',
        photoURL: null,
        participantIds: [userId], // Sadece kendisi (bildirim göndermek için yeterli)
        participants: [{
          userId,
          role: 'member',
          joinedAt: now
        }],
        unreadCount: {},
        createdAt: now,
        updatedAt: now,
      };
      
      const testChatRef = await addDoc(collection(db, 'chats'), testChatData);
      testChatId = testChatRef.id;
      console.log('📱 Yeni test chat oluşturuldu:', testChatId);
    }
    
    if (!testChatId) {
      console.error('❌ Test chat oluşturulamadı!');
      return false;
    }
    
    // Test mesajını gönder
    await addDoc(collection(db, 'messages'), {
      chatId: testChatId,
      senderId: userId,
      content: '🧪 Test bildirimi - Bu bir test mesajıdır',
      type: 'text',
      createdAt: Timestamp.now(),
    });
    
    console.log('✅ Test mesajı gönderildi. Cloud Functions bildirimi gönderecek.');
    console.log('📱 Chat ID:', testChatId);
    return true;
  } catch (e) {
    console.error('sendTestNotification error:', e);
    return false;
  }
}


