import { 
  doc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  setDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserStatus {
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  isTyping?: boolean;
  lastActive?: Date;
}

// Kullanıcı durumunu güncelle
export const updateUserStatus = async (userId: string, status: 'online' | 'offline' | 'away') => {
  if (!userId) {
    console.log('Kullanıcı ID bulunamadı, durum güncellenemedi');
    return;
  }

  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    const userStatusDoc = await getDoc(userStatusRef);

    const statusData = {
      status,
      lastSeen: status === 'offline' ? Timestamp.now() : null,
      lastActive: serverTimestamp(),
      updatedAt: Timestamp.now()
    };

    if (!userStatusDoc.exists()) {
      await setDoc(userStatusRef, statusData);
    } else {
      await updateDoc(userStatusRef, statusData);
    }
  } catch (error) {
    console.log('Kullanıcı durumu güncelleme hatası:', error);
  }
};

// Kullanıcı yazıyor durumunu güncelle
export const updateTypingStatus = async (userId: string, isTyping: boolean) => {
  if (!userId) {
    console.log('Kullanıcı ID bulunamadı, yazma durumu güncellenemedi');
    return;
  }

  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    await updateDoc(userStatusRef, {
      isTyping,
      lastActive: serverTimestamp(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.log('Yazma durumu güncelleme hatası:', error);
  }
};

// Kullanıcı durumunu dinle
export const subscribeToUserStatus = (userId: string, callback: (status: UserStatus) => void) => {
  if (!userId) {
    console.log('Kullanıcı ID bulunamadı, durum dinleyicisi başlatılamıyor');
    return () => {};
  }

  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    
    return onSnapshot(userStatusRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          status: data.status || 'offline',
          lastSeen: data.lastSeen?.toDate() || null,
          isTyping: data.isTyping || false,
          lastActive: data.lastActive?.toDate()
        });
      } else {
        callback({ status: 'offline' });
      }
    }, (error) => {
      console.log('Kullanıcı durumu dinleme hatası:', error);
    });
  } catch (error) {
    console.log('Kullanıcı durumu dinleyicisi başlatma hatası:', error);
    return () => {};
  }
};

// Kullanıcı çevrimiçi olduğunda otomatik olarak durumu güncelle
export const initializeUserStatus = async (userId: string) => {
  if (!userId) {
    console.log('Kullanıcı ID bulunamadı, durum başlatılamadı');
    return;
  }

  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    const userStatusDoc = await getDoc(userStatusRef);

    const statusData = {
      status: 'online',
      lastSeen: null,
      isTyping: false,
      lastActive: serverTimestamp(),
      updatedAt: Timestamp.now()
    };

    if (!userStatusDoc.exists()) {
      await setDoc(userStatusRef, statusData);
    } else {
      await updateDoc(userStatusRef, statusData);
    }
  } catch (error) {
    console.log('Kullanıcı durumu başlatma hatası:', error);
  }
};

// Kullanıcının son görülme zamanını güncelle
export const updateLastSeen = async (userId: string) => {
  if (!userId) {
    console.log('Kullanıcı ID bulunamadı, son görülme zamanı güncellenemedi');
    return;
  }

  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    await updateDoc(userStatusRef, {
      lastSeen: Timestamp.now(),
      lastActive: serverTimestamp(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.log('Son görülme zamanı güncelleme hatası:', error);
  }
}; 