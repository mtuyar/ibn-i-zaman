import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  status?: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  fcmToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
  role?: 'user' | 'admin';
  isActive?: boolean;
  username?: string;
  fullName?: string;
  bio?: string;
}

// Kullanıcı oluştur/güncelle
export const createOrUpdateUser = async (
  userId: string,
  userData: Partial<User>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const existingUser = await getDoc(userRef);
    
    if (existingUser.exists()) {
      // Mevcut kullanıcıyı güncelle
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
    } else {
      // Yeni kullanıcı oluştur
      await setDoc(userRef, {
        ...userData,
        status: 'offline',
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        role: 'user',
        isActive: true
      });
    }
  } catch (error) {
    console.error('Kullanıcı oluşturma/güncelleme hatası:', error);
    throw error;
  }
};

// Kullanıcı bilgilerini getir
export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data()
      } as User;
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı bilgilerini getirme hatası:', error);
    throw error;
  }
};

// Tüm kullanıcıları getir
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));
  } catch (error) {
    console.error('Kullanıcıları getirme hatası:', error);
    throw error;
  }
};

// Kullanıcı ara
export const searchUsers = async (searchTerm: string): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    
    // Arama terimini küçük harfe çevir
    const searchTermLower = searchTerm.toLowerCase();
    
    // Tüm kullanıcıları getir
    const querySnapshot = await getDocs(usersRef);
    
    // Kullanıcıları filtrele
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User))
      .filter(user => 
        user.displayName?.toLowerCase().includes(searchTermLower) ||
        user.email.toLowerCase().includes(searchTermLower)
      );
  } catch (error) {
    console.error('Kullanıcı arama hatası:', error);
    throw error;
  }
};

// Kullanıcı durumunu güncelle
export const updateUserStatus = async (
  userId: string,
  status: 'online' | 'offline' | 'away'
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Kullanıcı durumu güncelleme hatası:', error);
    throw error;
  }
}; 