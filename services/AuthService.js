// Auth servisi
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  getIdToken
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { createOrUpdateUser } from './UserService';
import { Alert, ActivityIndicator } from 'react-native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Firebase hata mesajlarını Türkçe'ye çevir
const getFirebaseErrorMessage = (error) => {
  switch (error.code) {
    // Giriş hataları
    case 'auth/invalid-credential':
      return 'E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
    case 'auth/user-not-found':
      return 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.';
    case 'auth/wrong-password':
      return 'Hatalı şifre. Lütfen şifrenizi kontrol edin.';
    case 'auth/too-many-requests':
      return 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmış.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanımda.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi formatı.';
    case 'auth/weak-password':
      return 'Şifre çok zayıf. En az 6 karakter kullanın.';
    case 'auth/operation-not-allowed':
      return 'Bu işlem şu anda kullanılamıyor.';
    case 'auth/account-exists-with-different-credential':
      return 'Bu e-posta adresi başka bir giriş yöntemiyle kullanılıyor.';
    case 'auth/network-request-failed':
      return 'İnternet bağlantınızı kontrol edin.';
    case 'auth/popup-closed-by-user':
      return 'Giriş penceresi kullanıcı tarafından kapatıldı.';
    case 'auth/popup-blocked':
      return 'Giriş penceresi engellendi. Lütfen pop-up engelleyiciyi kapatın.';
    case 'auth/cancelled-popup-request':
      return 'Giriş işlemi iptal edildi.';
    case 'auth/invalid-verification-code':
      return 'Geçersiz doğrulama kodu.';
    case 'auth/invalid-verification-id':
      return 'Geçersiz doğrulama kimliği.';
    case 'auth/missing-verification-code':
      return 'Doğrulama kodu eksik.';
    case 'auth/missing-verification-id':
      return 'Doğrulama kimliği eksik.';
    case 'auth/quota-exceeded':
      return 'İstek kotası aşıldı. Lütfen daha sonra tekrar deneyin.';
    case 'auth/requires-recent-login':
      return 'Bu işlem için son zamanlarda giriş yapmanız gerekiyor.';
    default:
      return 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
  }
};

// Hata göster
const showError = (error) => {
  const message = getFirebaseErrorMessage(error);
  Alert.alert('Hata', message);
  throw error;
};

// Kayıt olma
export const signUp = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Profil bilgilerini güncelle
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }

    // Firestore'da kullanıcı verisi oluştur
    await createOrUpdateUser(userCredential.user.uid, {
      email,
      displayName,
      fullName: displayName,
      username: email.split('@')[0], // Email'in @ öncesini username olarak kullan
      status: 'offline',
      lastSeen: new Date(),
      createdAt: new Date(),
      role: 'user',
      isActive: true
    });
    
    return userCredential.user;
  } catch (error) {
    console.error("Kayıt olma hatası:", error);
    showError(error);
  }
};

// Giriş yapma
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Kullanıcı durumunu güncelle
    await createOrUpdateUser(userCredential.user.uid, {
      status: 'online',
      lastSeen: new Date(),
    });
    
    return userCredential.user;
  } catch (error) {
    console.error("Giriş yapma hatası:", error);
    showError(error);
  }
};

// Çıkış yapma
export const logOut = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    const userId = currentUser.uid;
    
    // Önce çıkış yap
    await signOut(auth);

    // Sonra güncellemeyi dene, hata olsa bile devam et
    try {
      const userStatusRef = doc(db, 'userStatus', userId);
      await updateDoc(userStatusRef, {
        status: 'offline',
        lastSeen: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    } catch (updateError) {
      // Güncelleme hatasını sessizce geç
      console.log("Kullanıcı durumu güncellenemedi:", updateError);
    }

    return true;

  } catch (error) {
    console.error("Çıkış yapma hatası:", error);
    return false;
  }
};

// Şifre sıfırlama
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Şifre sıfırlama hatası:", error);
    showError(error);
  }
};

// Mevcut kullanıcı bilgisini al
export const getCurrentUser = () => {
  return auth.currentUser;
}; 