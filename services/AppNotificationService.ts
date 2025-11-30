import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAllUsers } from './UserService';
import { sendExpoPush } from './PushService';

export type NotificationType = 'message' | 'program' | 'announcement' | 'urgent_announcement';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  userId: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  relatedId?: string; // Mesaj ID, program ID, duyuru ID vs.
}

interface NotificationDocument {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  userId: string;
  read: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
  relatedId?: string;
}

const NOTIFICATIONS_COLLECTION = 'notifications';

const mapDocToNotification = (id: string, data: NotificationDocument): Notification => {
  // Güvenli tarih dönüştürme
  const toDateSafe = (value: Timestamp | undefined | null, fallback: Date = new Date()): Date => {
    if (!value) return fallback;
    try {
      return value.toDate();
    } catch (err) {
      console.warn('Timestamp parse error for notification', id, err);
      return fallback;
    }
  };

  return {
    id,
    type: data.type,
    title: data.title,
    body: data.body,
    data: data.data,
    userId: data.userId,
    read: data.read,
    readAt: data.readAt ? toDateSafe(data.readAt) : undefined,
    createdAt: toDateSafe(data.createdAt),
    relatedId: data.relatedId,
  };
};

// Bildirim oluştur
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>,
  relatedId?: string
): Promise<string> => {
  try {
    const notificationRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      type,
      title,
      body,
      data: data || {},
      userId,
      read: false,
      createdAt: serverTimestamp(),
      relatedId,
    } satisfies NotificationDocument);

    return notificationRef.id;
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
    throw error;
  }
};

// Tüm kullanıcılara bildirim gönder
export const broadcastNotification = async (
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>,
  relatedId?: string
): Promise<void> => {
  try {
    const users = await getAllUsers();
    const batch = writeBatch(db);
    const notifications: string[] = [];

    // Her kullanıcı için bildirim oluştur
    users.forEach((user) => {
      const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
      batch.set(notificationRef, {
        type,
        title,
        body,
        data: data || {},
        userId: user.id,
        read: false,
        createdAt: serverTimestamp(),
        relatedId,
      } satisfies NotificationDocument);
      notifications.push(notificationRef.id);
    });

    await batch.commit();

    // Push notification gönder (her kullanıcının token'ı varsa)
    for (const user of users) {
      if (user.fcmToken) {
        // FCM token varsa Cloud Functions üzerinden gönderilecek
        // Burada sadece log yapıyoruz, gerçek push Cloud Functions'da yapılacak
        console.log(`Push notification will be sent to user ${user.id}`);
      }
    }
  } catch (error) {
    console.error('Toplu bildirim gönderme hatası:', error);
    throw error;
  }
};

// Kullanıcının bildirimlerini getir
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as NotificationDocument;
      return mapDocToNotification(docSnap.id, data);
    });
    
    // Okunmamışları önce göster
    return notifications.sort((a, b) => {
      if (a.read === b.read) return 0;
      return a.read ? 1 : -1;
    });
  } catch (error) {
    console.error('Bildirimleri getirme hatası:', error);
    return [];
  }
};

// Kullanıcının bildirimlerini dinle
export const subscribeToUserNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
): (() => void) => {
  try {
    // Önce sadece userId ile filtrele, sonra client-side'da sırala
    // Bu şekilde index gerektirmez
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        console.log(`AppNotificationService: Bildirim snapshot alındı - ${snapshot.docs.length} bildirim`);
        const notifications = snapshot.docs
          .map((docSnap) => {
            try {
              const data = docSnap.data() as NotificationDocument;
              const notification = mapDocToNotification(docSnap.id, data);
              console.log(`AppNotificationService: Bildirim eşlendi - id: ${notification.id}, type: ${notification.type}, read: ${notification.read}`);
              return notification;
            } catch (error) {
              console.error(`AppNotificationService: Bildirim eşleme hatası - docId: ${docSnap.id}`, error);
              return null;
            }
          })
          .filter((n): n is Notification => n !== null)
          .sort((a, b) => {
            // Okunmamışları önce göster, sonra tarihe göre sırala
            if (a.read !== b.read) {
              return a.read ? 1 : -1;
            }
            return b.createdAt.getTime() - a.createdAt.getTime();
          });
        console.log(`AppNotificationService: Toplam ${notifications.length} bildirim callback'e gönderiliyor`);
        callback(notifications);
      },
      (error) => {
        console.error('AppNotificationService: Bildirim dinleme hatası:', error);
        // Hata durumunda da callback çağır (boş liste ile)
        callback([]);
      }
    );
  } catch (error) {
    console.error('Bildirim aboneliği hatası:', error);
    return () => {};
  }
};

// Bildirimi okundu olarak işaretle
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Bildirim okundu işaretleme hatası:', error);
    throw error;
  }
};

// Tüm bildirimleri okundu olarak işaretle
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        read: true,
        readAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Tüm bildirimleri okundu işaretleme hatası:', error);
    throw error;
  }
};

// Bildirimi sil
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error('Bildirim silme hatası:', error);
    throw error;
  }
};

// Okunmamış bildirim sayısını getir
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Okunmamış bildirim sayısı getirme hatası:', error);
    return 0;
  }
};

// Mesaj bildirimi oluştur
export const createMessageNotification = async (
  recipientId: string,
  senderName: string,
  messageContent: string,
  chatId: string
): Promise<void> => {
  await createNotification(
    recipientId,
    'message',
    'Yeni Mesaj',
    `${senderName}: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
    { chatId, type: 'message' },
    chatId
  );
};

// Program bildirimi oluştur
export const createProgramNotification = async (
  programName: string,
  programId: string
): Promise<void> => {
  await broadcastNotification(
    'program',
    'Yeni Program Eklendi',
    `${programName} programı eklendi.`,
    { programId, type: 'program' },
    programId
  );
};

// Duyuru bildirimi oluştur
export const createAnnouncementNotification = async (
  announcementTitle: string,
  announcementId: string,
  isUrgent: boolean = false
): Promise<void> => {
  await broadcastNotification(
    isUrgent ? 'urgent_announcement' : 'announcement',
    isUrgent ? 'Acil Duyuru' : 'Yeni Duyuru',
    announcementTitle,
    { announcementId, type: isUrgent ? 'urgent_announcement' : 'announcement' },
    announcementId
  );
};

