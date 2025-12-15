import { collection, addDoc, getDocs, query, orderBy, limit, where, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface GameScore {
  id?: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  score: number;
  level?: string; // Nefs Mertebesi
  timestamp: number;
}

export const saveGameScore = async (
  userId: string, 
  displayName: string, 
  photoURL: string | null, 
  score: number,
  levelName?: string
) => {
  try {
    // Önce kullanıcının en yüksek skorunu kontrol et
    const userScoreRef = doc(db, 'game_high_scores', userId);
    const userScoreSnap = await getDoc(userScoreRef);

    if (userScoreSnap.exists()) {
      const currentHighScore = userScoreSnap.data().score;
      if (score > currentHighScore) {
        await setDoc(userScoreRef, {
          userId,
          displayName,
          photoURL,
          score,
          level: levelName,
          timestamp: Date.now()
        }, { merge: true });
        return true; // Yeni rekor
      }
    } else {
      await setDoc(userScoreRef, {
        userId,
        displayName,
        photoURL,
        score,
        level: levelName,
        timestamp: Date.now()
      });
      return true; // İlk skor
    }
    
    // Ayrıca tarihçeye de ekleyebiliriz (opsiyonel, şimdilik sadece high score tutalım)
    return false;
  } catch (error) {
    console.error('Skor kaydedilemedi:', error);
    return false;
  }
};

export const getLeaderboard = async (limitCount = 10): Promise<GameScore[]> => {
  try {
    const q = query(
      collection(db, 'game_high_scores'),
      orderBy('score', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as GameScore));
  } catch (error) {
    console.error('Liderlik tablosu alınamadı:', error);
    return [];
  }
};

export const getUserHighScore = async (userId: string): Promise<GameScore | null> => {
  try {
    const docRef = doc(db, 'game_high_scores', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as GameScore;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Kullanıcı skoru alınamadı:', error);
    return null;
  }
};

