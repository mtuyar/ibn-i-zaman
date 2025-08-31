import { collection, getDocs, query, where, orderBy, Timestamp, doc, onSnapshot, addDoc, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Önbellek anahtarları
const CACHE_KEYS = {
  WEEKLY_PROGRAMS: 'cache_weekly_programs',
  WEEKLY_PROGRAMS_VERSION: 'cache_weekly_programs_version'
};

// Önbellekleme süresi (milisaniye cinsinden)
const DEFAULT_CACHE_DURATION = 1000 * 60 * 60; // 1 saat


export interface Program {
  id: string;
  day: string;
  program: string;
  time: string;
  icon: string;
  location?: string;
  lastAttendance?: number;
  responsible?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

// Önbellekleme fonksiyonları
const setCache = async <T>(key: string, data: T, version: number): Promise<void> => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      version
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
    console.log(`Önbellek güncellendi: ${key}, version: ${version}`);
  } catch (error) {
    console.error('Önbelleğe kaydetme hatası:', error);
  }
};

const getCache = async <T>(key: string, maxAge: number = DEFAULT_CACHE_DURATION): Promise<T | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(key);
    
    if (!cachedData) {
      return null;
    }

    const cache = JSON.parse(cachedData);
    const now = Date.now();
    const age = now - cache.timestamp;

    // Önbellek süresi dolmuşsa null döndür
    if (age > maxAge) {
      console.log(`Önbellek süresi doldu: ${key}, yaş: ${Math.round(age / 1000 / 60)} dakika`);
      return null;
    }

    console.log(`Önbellekten alındı: ${key}, yaş: ${Math.round(age / 1000 / 60)} dakika`);
    return cache.data;
  } catch (error) {
    console.error('Önbellekten alma hatası:', error);
    return null;
  }
};

const getVersion = async (key: string): Promise<number> => {
  try {
    const version = await AsyncStorage.getItem(key);
    return version ? parseInt(version, 10) : 0;
  } catch (error) {
    console.error('Sürüm bilgisi alma hatası:', error);
    return 0;
  }
};

const updateVersion = async (key: string): Promise<number> => {
  try {
    const currentVersion = await getVersion(key);
    const newVersion = currentVersion + 1;
    await AsyncStorage.setItem(key, newVersion.toString());
    console.log(`Sürüm güncellendi: ${key}, yeni sürüm: ${newVersion}`);
    return newVersion;
  } catch (error) {
    console.error('Sürüm güncelleme hatası:', error);
    return 0;
  }
};

const clearCache = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`Önbellek temizlendi: ${key}`);
  } catch (error) {
    console.error('Önbellek temizleme hatası:', error);
  }
};

// Günleri sıralamak için yardımcı fonksiyon
export const getDayOrder = (day: string) => {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return days.indexOf(day);
};

// Firestore'dan tüm aktif programları getir
const fetchProgramsFromFirestore = async (): Promise<Program[]> => {
  try {
    const programsQuery = query(
      collection(db, 'weeklyPrograms'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(programsQuery);
    
    if (snapshot.empty) {
      console.log('Aktif program bulunamadı');
      return [];
    }
    
    const programs = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Firestore timestamp'i JavaScript Date nesnesine dönüştür
      let createdAt = new Date();
      if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt.seconds) {
          // Saniye ve nanosaniye içeren Timestamp benzeri obje
          createdAt = new Date(data.createdAt.seconds * 1000);
        }
      }
      
      return {
        id: doc.id,
        ...data,
        createdAt,
      } as Program;
    });
    
    // Günlere göre sırala
    return programs.sort((a, b) => getDayOrder(a.day) - getDayOrder(b.day));
  } catch (error) {
    console.error('Programları getirme hatası:', error);
    // Hata durumunda örnek verileri döndür
    console.log('Örnek program verileri kullanılıyor');
    return [];
  }
};

// Tüm aktif programları getir (önbellekle)
export const getAllPrograms = async (forceRefresh: boolean = false): Promise<Program[]> => {
  try {
    // Önbellekte veri var mı kontrol et
    if (!forceRefresh) {
      const cachedPrograms = await getCache<Program[]>(CACHE_KEYS.WEEKLY_PROGRAMS);
      if (cachedPrograms) {
        console.log('Programlar önbellekten alındı');
        return cachedPrograms;
      }
    }

    // Önbellekte veri yoksa veya forceRefresh ise Firestore'dan verileri çek
    console.log('Programlar Firestore\'dan çekiliyor...');
    const programs = await fetchProgramsFromFirestore();
    
    // Verileri önbelleğe kaydet
    const version = await getVersion(CACHE_KEYS.WEEKLY_PROGRAMS_VERSION);
    await setCache(CACHE_KEYS.WEEKLY_PROGRAMS, programs, version);
    
    return programs;
  } catch (error) {
    console.error('Programları getirme hatası:', error);
    // Hata durumunda örnek verileri döndür
    console.log('Örnek program verileri kullanılıyor (tüm programlar)');
    return [];
  }
};

// Sınırlı sayıda program getir (ör: ana sayfa için)
export const getLimitedPrograms = async (limit: number = 4, forceRefresh: boolean = false): Promise<Program[]> => {
  try {
    const allPrograms = await getAllPrograms(forceRefresh);
    return allPrograms.slice(0, limit);
  } catch (error) {
    console.error('Sınırlı programları getirme hatası:', error);
    // Hata durumunda örnek verilerden sınırlı döndür
    console.log('Örnek program verileri kullanılıyor (sınırlı)');
    return [];
  }
};

// Programların sürümünü yükselt (yeni veri eklendiğinde/güncellendiğinde çağrılır)
export const updateProgramsVersion = async (): Promise<void> => {
  try {
    await updateVersion(CACHE_KEYS.WEEKLY_PROGRAMS_VERSION);
    // Önbelleği temizle, böylece bir sonraki çağrıda yeni veriler alınır
    await clearCache(CACHE_KEYS.WEEKLY_PROGRAMS);
  } catch (error) {
    console.error('Program sürümü güncelleme hatası:', error);
  }
};

// Programlarda yapılan değişiklikleri dinle
export const subscribeToProgramUpdates = (callback: () => void) => {
  try {
    const programsRef = collection(db, 'weeklyPrograms');
    
    // Gerçek zamanlı olarak koleksiyondaki değişiklikleri dinle
    return onSnapshot(programsRef, (snapshot) => {
      // Değişiklik varsa
      if (!snapshot.empty && snapshot.docChanges().length > 0) {
        console.log('Programlarda değişiklik tespit edildi');
        // Önbellek sürümünü güncelle ve geri çağırma işlevini çağır
        updateProgramsVersion().then(() => {
          callback();
        });
      }
    }, (error) => {
      console.error('Program dinleme hatası:', error);
      // Hata durumunda yine de geri çağırma işlevini çağır
      callback();
    });
  } catch (error) {
    console.error('Program aboneliği ayarlama hatası:', error);
    // Hata durumunda sahte bir unsubscribe fonksiyonu döndür
    return () => {};
  }
};

// Programları Firestore'a ekle
export const addProgram = async (programData: Omit<Program, 'id' | 'createdAt'>): Promise<Program> => {
  try {
    // Firestore'a program ekle
    const programsRef = collection(db, 'weeklyPrograms');
    
    const docRef = await addDoc(programsRef, {
      ...programData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('Program başarıyla eklendi:', docRef.id);
    
    // Önbellek sürümünü güncelle
    await updateProgramsVersion();
    
    // Yeni eklenen programı döndür
    return {
      id: docRef.id,
      ...programData,
      createdAt: new Date(),
    } as Program;
  } catch (error) {
    console.error('Program ekleme hatası:', error);
    throw new Error('Program eklenirken bir hata oluştu');
  }
};

// Programı sil
export const deleteProgram = async (programId: string): Promise<void> => {
  try {
    const programRef = doc(db, 'weeklyPrograms', programId);
    await deleteDoc(programRef);
    
    console.log('Program başarıyla silindi:', programId);
    
    // Önbellek sürümünü güncelle
    await updateProgramsVersion();
  } catch (error) {
    console.error('Program silme hatası:', error);
    throw new Error('Program silinirken bir hata oluştu');
  }
};

// Programı güncelle
export const updateProgram = async (programId: string, programData: Partial<Program>): Promise<void> => {
  try {
    const programRef = doc(db, 'weeklyPrograms', programId);
    await updateDoc(programRef, {
      ...programData,
      updatedAt: serverTimestamp()
    });
    
    console.log('Program başarıyla güncellendi:', programId);
    
    // Önbellek sürümünü güncelle
    await updateProgramsVersion();
  } catch (error) {
    console.error('Program güncelleme hatası:', error);
    throw new Error('Program güncellenirken bir hata oluştu');
  }
}; 