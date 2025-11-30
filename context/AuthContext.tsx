import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, onAuthStateChanged } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { auth } from '../config/firebase';
import { isUserAdmin } from '../services/AdminService';
import * as AuthService from '../services/AuthService';
import { initializeGlobalMessageListener } from '../services/ChatService';
import { registerDevicePushToken } from '../services/PushService';

interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  isLoggedIn: boolean;
  rememberMe: boolean;
  isAdmin: boolean;
  setRememberMe: (value: boolean) => void;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Context için varsayılan değerler
const defaultAuthContext: AuthContextProps = {
  user: null,
  isLoading: true,
  isSigningIn: false,
  error: null,
  isLoggedIn: false,
  rememberMe: true,
  isAdmin: false,
  setRememberMe: () => {},
  signIn: async () => {},
  signUp: async () => {},
  logOut: async () => {},
  resetPassword: async () => {},
};

// Auth Context'i oluştur
const AuthContext = createContext<AuthContextProps>(defaultAuthContext);

// Context'i kullanmak için hook
export const useAuth = () => useContext(AuthContext);

// Auth Provider bileşeni
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const messageListenerCleanupRef = useRef<() => void>(() => {});

  // Kullanıcı durumunu dinle
  useEffect(() => {
    let isInitialized = false;

    // Remember me state'ini hemen yükle (paralel)
    AsyncStorage.getItem('remember_me').then((remembered) => {
      const shouldRemember = remembered === null || remembered === 'true';
      setRememberMe(shouldRemember);
    }).catch(console.error);

    // Auth state listener'ı hemen başlat (Firebase'in cached user'ını hemen alır)
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!isInitialized) {
        isInitialized = true;
        
        // İlk yüklemede otomatik girişi dene (eğer kullanıcı yoksa)
        if (!authUser) {
          try {
            // Paralel olarak remember_me ve credentials'ı al
            const [remembered, savedEmail, savedPassword] = await Promise.all([
              AsyncStorage.getItem('remember_me'),
              AsyncStorage.getItem('saved_email'),
              AsyncStorage.getItem('saved_password'),
            ]);
            
            const shouldRemember = remembered === null || remembered === 'true';
            setRememberMe(shouldRemember);

            // Eğer remember_me true ise ve kayıtlı email/password varsa otomatik giriş yap
            if (shouldRemember && savedEmail && savedPassword) {
              console.log('🔄 Attempting auto-login with saved credentials...');
              // Otomatik girişi arka planda yap, await etme (hızlı yükleme için)
              AuthService.signIn(savedEmail, savedPassword).catch((error: any) => {
                console.log('⚠️ Auto-login failed, clearing saved credentials:', error.message);
                AsyncStorage.removeItem('saved_email');
                AsyncStorage.removeItem('saved_password');
              });
              // Otomatik giriş başarılı olursa onAuthStateChanged tekrar çağrılacak
              return;
            }
          } catch (error) {
            console.error('Auto-login hatası:', error);
          }
        }
      }

      console.log('Auth state changed:', authUser ? `User logged in: ${authUser.email}` : 'User logged out');
      setUser(authUser);
      // isLoading'i hemen false yap (blocking işlemlerden önce)
      setIsLoading(false);
      
      // Kullanıcı bilgilerini önbelleğe kaydet (async, blocking yapma)
      if (authUser) {
        // AsyncStorage işlemlerini paralel yap
        Promise.all([
          AsyncStorage.setItem('user_data', JSON.stringify({
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
          })),
          // Admin kontrolünü arka planda yap
          isUserAdmin(authUser.uid).then(setIsAdmin).catch(() => setIsAdmin(false)),
        ]).catch(console.error);
        
        // Kullanıcı giriş yaptığında global mesaj dinleyiciyi başlat (async, blocking yapma)
        messageListenerCleanupRef.current = initializeGlobalMessageListener(authUser.uid);
        // FCM cihaz tokenını kaydet (async, blocking yapma)
        // Token kaydını birkaç kez dene (permissions hazır olana kadar)
        const registerToken = async () => {
          try {
            console.log('🔔 FCM token kaydı başlatılıyor...');
            await registerDevicePushToken(authUser.uid);
            console.log('✅ FCM token başarıyla kaydedildi');
            
            // Token'ın gerçekten kaydedildiğini kontrol et
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../config/firebase');
            const userDoc = await getDoc(doc(db, 'users', authUser.uid));
            const userData = userDoc.data();
            if (userData?.fcmToken) {
              console.log('✅ FCM token Firestore\'da mevcut:', userData.fcmToken.substring(0, 20) + '...');
            } else {
              console.warn('⚠️ FCM token Firestore\'da bulunamadı!');
            }
          } catch (error) {
            console.error('❌ FCM token kayıt hatası:', error);
            // 3 saniye sonra tekrar dene
            setTimeout(registerToken, 3000);
          }
        };
        
        // İlk deneme
        setTimeout(registerToken, 2000);
        // Yedek deneme (5 saniye sonra)
        setTimeout(registerToken, 5000);
      } else {
        // Kullanıcı çıkış yaptığında dinleyiciyi temizle ve cache'i temizle
        messageListenerCleanupRef.current();
        setIsAdmin(false);
        AsyncStorage.removeItem('user_data').catch(console.error);
      }
    });

    // Component kaldırıldığında dinleyiciyi temizle
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      messageListenerCleanupRef.current();
    };
  }, []);

  // Oturum açma
  const signIn = async (email: string, password: string, remember: boolean = true) => {
    setError(null);
    setIsSigningIn(true);
    
    try {
      // Giriş yap
      await AuthService.signIn(email, password);
      
      // Beni hatırla durumunu kaydet
      if (remember) {
        await AsyncStorage.setItem('remember_me', 'true');
        // Email ve password'u kaydet (otomatik giriş için)
        await AsyncStorage.setItem('saved_email', email);
        await AsyncStorage.setItem('saved_password', password);
        setRememberMe(true);
        console.log('✅ Login successful, credentials saved for auto-login');
      } else {
        // Remember false ise, kayıtlı bilgileri temizle
        await AsyncStorage.setItem('remember_me', 'false');
        await AsyncStorage.removeItem('saved_email');
        await AsyncStorage.removeItem('saved_password');
        setRememberMe(false);
        console.log('✅ Login successful, credentials not saved');
      }
    } catch (error: any) {
      console.error('Oturum açma hatası:', error);
      // Hata durumunda kayıtlı bilgileri temizle
      await AsyncStorage.removeItem('saved_email');
      await AsyncStorage.removeItem('saved_password');
      setError(error.message || 'Oturum açma sırasında bir hata oluştu.');
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  // Kayıt olma
  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    setError(null);
    setIsSigningIn(true);
    
    try {
      // AuthService'deki signUp metodunu kullan
      const user = await AuthService.signUp(email, password, fullName);
      
      // Kayıt sonrası kullanıcı bilgilerini Firestore'a ekle
      if (user) {
        const userData = {
          uid: user.uid,
          email: user.email,
          username: username,
          fullName: fullName,
          createdAt: new Date().toISOString(),
          photoURL: null,
          role: 'user',
          isActive: true
        };
        
        // Kullanıcı veritabanına kaydetme işlemi burada yapılabilir
        // await setDoc(doc(db, 'users', user.uid), userData);
      }
    } catch (error: any) {
      console.error('Kayıt olma hatası:', error);
      setError(error.message || 'Kayıt olma sırasında bir hata oluştu.');
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  // Oturumu kapat
  const logOut = async () => {
    setError(null);
    
    try {
      // Mesaj dinleyiciyi temizle
      messageListenerCleanupRef.current();
      // Kayıtlı bilgileri temizle
      await AsyncStorage.removeItem('remember_me');
      await AsyncStorage.removeItem('saved_email');
      await AsyncStorage.removeItem('saved_password');
      setRememberMe(true);
      // Firebase Auth'dan çıkış yap
      await AuthService.logOut();
      console.log('✅ Logout successful, all credentials cleared');
    } catch (error: any) {
      console.error('Oturum kapatma hatası:', error);
      setError(error.message || 'Oturum kapatma sırasında bir hata oluştu.');
    }
  };

  // Şifre sıfırlama
  const resetPassword = async (email: string) => {
    setError(null);
    
    try {
      await AuthService.resetPassword(email);
    } catch (error: any) {
      console.error('Şifre sıfırlama hatası:', error);
      setError(error.message || 'Şifre sıfırlama sırasında bir hata oluştu.');
    }
  };

  // Context değerleri
  const value = {
    user,
    isLoading,
    isSigningIn,
    error,
    isLoggedIn: !!user,
    rememberMe,
    isAdmin,
    setRememberMe,
    signIn,
    signUp,
    logOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 