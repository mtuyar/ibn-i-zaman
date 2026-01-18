// Firebase konfigürasyonu
import { initializeApp } from 'firebase/app';
// Auth'u başlat (React Native için AsyncStorage ile persistence ayarı)
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase konfigürasyon bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyCXEKqxrOdEd0QoxQMhdWr-rSZ6jy04X-4",
  authDomain: "gencsafa-management-app.firebaseapp.com",
  projectId: "gencsafa-management-app",
  storageBucket: "gencsafa-management-app.firebasestorage.app",
  messagingSenderId: "571545558200",
  appId: "1:571545558200:web:bf5ffce77f520129c9684d"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Auth'u başlat (React Native'de persistence otomatik çalışır)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Firestore ve Storage servislerini başlat  
const db = getFirestore(app);
const storage = getStorage(app);

console.log('Firebase bağlantısı başarıyla kuruldu');

export { auth, db, storage };
export default app; 