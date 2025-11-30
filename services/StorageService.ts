import { FirebaseError } from 'firebase/app';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage, auth } from '../config/firebase';

const randomSuffix = () => Math.random().toString(36).slice(2, 10);

// Cache key'leri
const CACHE_KEY_PREFIX = 'storage_cache_';
const CACHE_EXPIRY_DAYS = 30; // 30 gün cache süresi

// Cache'den görsel URL'i al
const getCachedImageUrl = async (url: string): Promise<string | null> => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${url}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { url: cachedUrl, timestamp } = JSON.parse(cached);
      const now = Date.now();
      const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      // Cache hala geçerli mi kontrol et
      if (now - timestamp < expiryTime) {
        console.log('📦 [CACHE] Cache\'den alındı:', url);
        return cachedUrl;
      } else {
        // Süresi dolmuş cache'i temizle
        await AsyncStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.error('📦 [CACHE] Cache okuma hatası:', error);
  }
  return null;
};

// Cache'e görsel URL'i kaydet
const setCachedImageUrl = async (originalUrl: string, downloadUrl: string): Promise<void> => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${originalUrl}`;
    const cacheData = {
      url: downloadUrl,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('📦 [CACHE] Cache\'e kaydedildi:', originalUrl);
  } catch (error) {
    console.error('📦 [CACHE] Cache yazma hatası:', error);
  }
};

// Görsel URL'i cache'den kontrol et veya indir
export const getCachedOrDownloadImage = async (url: string): Promise<string> => {
  // Eğer zaten bir HTTP/HTTPS URL'si ise, cache'den kontrol et
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const cached = await getCachedImageUrl(url);
    if (cached) {
      return cached;
    }
    
    // Cache'de yoksa, URL'i cache'e kaydet (aynı URL'i döndür)
    await setCachedImageUrl(url, url);
    return url;
  }
  
  return url;
};

const guessExtension = (uri: string) => {
  const clean = uri.split('?')[0];
  const parts = clean.split('.');
  return parts.length > 1 ? parts.pop() : 'jpg';
};

const guessMimeType = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
};

const mapFirebaseError = (error: unknown): Error => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'storage/unauthorized':
        return new Error('Firebase Storage: Bu işlemi yapmak için yetkin yok (storage/unauthorized).');
      case 'storage/canceled':
        return new Error('Firebase Storage: Yükleme iptal edildi (storage/canceled).');
      case 'storage/retry-limit-exceeded':
        return new Error('Firebase Storage: Çok sayıda başarısız deneme (storage/retry-limit-exceeded).');
      case 'storage/invalid-checksum':
        return new Error('Firebase Storage: Dosya bütünlüğü sağlanamadı (storage/invalid-checksum).');
      case 'storage/quota-exceeded':
        return new Error('Firebase Storage: Kota aşıldı (storage/quota-exceeded).');
      case 'storage/server-file-wrong-size':
        return new Error('Firebase Storage: Sunucuya aktarılan dosya boyutu tutarsız (storage/server-file-wrong-size).');
      case 'storage/unknown': {
        const serverResponse = error.customData?.serverResponse;
        if (serverResponse) {
          try {
            const parsed = JSON.parse(serverResponse);
            if (parsed?.error?.message) {
              return new Error(`Firebase Storage: ${parsed.error.message} (storage/unknown)`);
            }
          } catch {
            return new Error(`Firebase Storage: ${serverResponse} (storage/unknown)`);
          }
        }
        return new Error(`Firebase Storage: ${error.message} (storage/unknown)`);
      }
      default:
        return new Error(`Firebase Storage: ${error.message} (${error.code})`);
    }
  }
  return error instanceof Error ? error : new Error('Görsel yüklenirken bilinmeyen bir hata oluştu.');
};

export const uploadImageFromUri = async (uri: string, folder: string = 'programs'): Promise<string> => {
  console.log('📤 [UPLOAD] Başlangıç - URI:', uri);
  console.log('📤 [UPLOAD] Folder:', folder);
  
  try {
    // Eğer URI zaten bir HTTP/HTTPS URL'si ise, doğrudan kullan
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      console.log('📤 [UPLOAD] HTTP/HTTPS URL tespit edildi');
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Görsel okunamadı');
      }
      const blob = await response.blob();
      console.log('📤 [UPLOAD] Blob oluşturuldu, type:', blob.type, 'size:', blob.size);
      const extension = guessExtension(uri);
      const fileName = `${folder}/${Date.now()}-${randomSuffix()}.${extension}`;
      const storageRef = ref(storage, fileName);
      const metadata = blob.type ? { contentType: blob.type } : undefined;
      console.log('📤 [UPLOAD] Firebase Storage\'a yükleniyor...');
      const snapshot = await uploadBytes(storageRef, blob, metadata);
      console.log('📤 [UPLOAD] Yükleme başarılı');
      return getDownloadURL(snapshot.ref);
    }

    // Yerel dosya için expo-file-system ile base64 okuma ve uploadString kullan
    console.log('📤 [UPLOAD] Yerel dosya tespit edildi');
    const extension = guessExtension(uri);
    const mimeType = guessMimeType(extension);
    const fileName = `${folder}/${Date.now()}-${randomSuffix()}.${extension}`;
    
    console.log('📤 [UPLOAD] Dosya bilgileri:', {
      extension,
      mimeType,
      fileName,
      uri,
    });
    
    // Dosya varlığını kontrol et
    console.log('📤 [UPLOAD] Adım 1: Dosya varlığını kontrol ediyorum...');
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log('📤 [UPLOAD] Dosya bilgisi:', {
      exists: fileInfo.exists,
      size: fileInfo.size,
      isDirectory: fileInfo.isDirectory,
    });
    
    if (!fileInfo.exists) {
      throw new Error('Dosya bulunamadı: ' + uri);
    }
    
    // Dosyayı base64 olarak oku
    console.log('📤 [UPLOAD] Adım 2: Dosyayı base64 olarak okuyorum...');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('📤 [UPLOAD] Base64 okuma sonucu:', {
      base64Length: base64?.length || 0,
      firstChars: base64?.substring(0, 50) || 'boş',
    });

    if (!base64 || base64.length === 0) {
      throw new Error('Dosya okunamadı veya boş');
    }

    // Firebase Storage REST API kullanarak yükle (React Native'de en garantili yöntem)
    console.log('📤 [UPLOAD] Adım 3: Firebase Storage REST API kullanılıyor...');
    
    try {
      // Kullanıcı kontrolü
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Kullanıcı giriş yapmamış');
      }
      console.log('📤 [UPLOAD] Kullanıcı doğrulandı:', user.uid);
      
      // Firebase Auth token al
      console.log('📤 [UPLOAD] Adım 4: Firebase Auth token alınıyor...');
      const token = await user.getIdToken(true);
      console.log('📤 [UPLOAD] Token alındı, uzunluk:', token.length);
      
      // Firebase Storage bucket ve endpoint
      const bucket = 'gencsafa-management-app.firebasestorage.app';
      const encodedPath = encodeURIComponent(fileName);
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedPath}`;
      
      console.log('📤 [UPLOAD] Adım 5: REST API endpoint hazırlanıyor...');
      console.log('📤 [UPLOAD] Upload URL:', uploadUrl);
      
      // Base64'ü binary'ye dönüştür
      console.log('📤 [UPLOAD] Adım 6: Base64 binary\'ye dönüştürülüyor...');
      const Buffer = require('buffer').Buffer;
      const bufferData = Buffer.from(base64, 'base64');
      console.log('📤 [UPLOAD] Binary data boyutu:', bufferData.length);
      
      // REST API'ye POST isteği gönder
      console.log('📤 [UPLOAD] Adım 7: REST API\'ye POST isteği gönderiliyor...');
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': mimeType,
        },
        body: bufferData,
      });
      
      console.log('📤 [UPLOAD] REST API yanıt durumu:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📤 [UPLOAD] REST API hatası:', errorText);
        throw new Error(`Firebase Storage REST API hatası: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📤 [UPLOAD] REST API sonucu:', result);
      
      // Download URL oluştur
      const downloadToken = result.downloadTokens?.[0] || result.downloadTokens;
      const encodedName = encodeURIComponent(fileName);
      
      let downloadURL: string;
      if (downloadToken) {
        downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media&token=${downloadToken}`;
      } else {
        // Token yoksa alternatif URL
        downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media`;
        console.log('📤 [UPLOAD] ⚠️ Download token yok, alternatif URL kullanılıyor');
      }
      
      console.log('📤 [UPLOAD] ✅ Başarılı! Download URL:', downloadURL);
      
      // Cache'e kaydet (orijinal URI'yi key olarak kullan)
      await setCachedImageUrl(uri, downloadURL);
      
      return downloadURL;
    } catch (uploadError: any) {
      // Daha detaylı hata bilgisi için log
      console.error('📤 [UPLOAD] ❌ Firebase Storage REST API hatası:', {
        code: uploadError?.code,
        message: uploadError?.message,
        name: uploadError?.name,
        stack: uploadError?.stack,
      });
      throw uploadError;
    }
  } catch (error) {
    console.error('📤 [UPLOAD] ❌ Genel hata:', error);
    throw mapFirebaseError(error);
  }
};

