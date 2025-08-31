// Firebase konfigürasyonu
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase konfigürasyon bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyCXEKqxrOdEd0QoxQMhdWr-rSZ6jy04X-4",
  authDomain: "gencsafa-management-app.firebaseapp.com",
  projectId: "gencsafa-management-app",
  storageBucket: "gencsafa-management-app.appspot.com",
  messagingSenderId: "571545558200",
  appId: "1:571545558200:web:bf5ffce77f520129c9684d"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Auth'u React Native persistence ile başlat
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Firestore ve Storage servislerini başlat  
const db = getFirestore(app);
const storage = getStorage(app);

console.log('Firebase bağlantısı başarıyla kuruldu');

export { auth, db, storage };
export default app; 