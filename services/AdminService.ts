import { collection, getDocs, query, where, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';

const ADMIN_USERS_COLLECTION = 'adminUsers';

// Admin kullanıcıları kontrol etme
export const isUserAdmin = async (userId?: string): Promise<boolean> => {
  try {
    // Eğer userId belirtilmemişse, mevcut oturum açmış kullanıcıyı kullan
    const auth = getAuth();
    const currentUserId = userId || auth.currentUser?.uid;

    if (!currentUserId) {
      return false;
    }

    const adminRef = query(
      collection(db, ADMIN_USERS_COLLECTION),
      where('userId', '==', currentUserId)
    );

    const querySnapshot = await getDocs(adminRef);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Admin kontrolü hatası:', error);
    return false;
  }
};

// Admin kullanıcıları getirme
export const getAdminUsers = async (): Promise<string[]> => {
  try {
    const adminRef = collection(db, ADMIN_USERS_COLLECTION);
    const querySnapshot = await getDocs(adminRef);
    
    const adminIds: string[] = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.userId) {
        adminIds.push(userData.userId);
      }
    });
    
    return adminIds;
  } catch (error) {
    console.error('Admin kullanıcıları getirme hatası:', error);
    return [];
  }
};

// Yeni admin kullanıcı ekleme
export const addAdminUser = async (userId: string): Promise<boolean> => {
  try {
    const adminRef = doc(db, ADMIN_USERS_COLLECTION, userId);
    
    await setDoc(adminRef, {
      userId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Admin kullanıcı ekleme hatası:', error);
    return false;
  }
};

// Admin kullanıcıyı kaldırma
export const removeAdminUser = async (userId: string): Promise<boolean> => {
  try {
    const adminRef = doc(db, ADMIN_USERS_COLLECTION, userId);
    await deleteDoc(adminRef);
    return true;
  } catch (error) {
    console.error('Admin kullanıcı kaldırma hatası:', error);
    return false;
  }
};

// Admin kullanıcı durumunu değiştirme (admin ise kaldır, değilse ekle)
export const toggleAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const isAdmin = await isUserAdmin(userId);
    
    if (isAdmin) {
      return await removeAdminUser(userId);
    } else {
      return await addAdminUser(userId);
    }
  } catch (error) {
    console.error('Admin durumu değiştirme hatası:', error);
    return false;
  }
}; 