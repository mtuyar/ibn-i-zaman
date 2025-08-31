import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthService from '../services/AuthService';
import { initializeGlobalMessageListener } from '../services/ChatService';
import { isUserAdmin } from '../services/AdminService';

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
    const loadRememberMeSetting = async () => {
      try {
        const remembered = await AsyncStorage.getItem('remember_me');
        if (remembered !== null) {
          setRememberMe(remembered === 'true');
        }
      } catch (error) {
        console.error('Remember me ayarı yüklenirken hata:', error);
      }
    };

    loadRememberMeSetting();

    // Firebase Auth değişikliklerini doğrudan dinle
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      setIsLoading(false);
      
      // Kullanıcı bilgilerini önbelleğe kaydet
      if (authUser) {
        const userData = {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
        };
        AsyncStorage.setItem('user_data', JSON.stringify(userData)).catch(console.error);
        
        // Kullanıcı giriş yaptığında global mesaj dinleyiciyi başlat
        messageListenerCleanupRef.current = initializeGlobalMessageListener(authUser.uid);

        const adminStatus = await isUserAdmin(authUser.uid);
        setIsAdmin(adminStatus);
      } else {
        // Kullanıcı çıkış yaptığında dinleyiciyi temizle
        messageListenerCleanupRef.current();
        setIsAdmin(false);
      }
    });

    // Component kaldırıldığında dinleyiciyi temizle
    return () => {
      unsubscribe();
      messageListenerCleanupRef.current();
    };
  }, []);

  // Oturum açma
  const signIn = async (email: string, password: string, remember: boolean = true) => {
    setError(null);
    setIsSigningIn(true);
    
    try {
      // AuthService'deki signIn metodunu kullan
      await AuthService.signIn(email, password);
      // Beni hatırla durumu için
      if (remember) {
        await AsyncStorage.setItem('remember_me', 'true');
      } else {
        await AsyncStorage.removeItem('remember_me');
      }
    } catch (error: any) {
      console.error('Oturum açma hatası:', error);
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
      await AuthService.logOut();
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