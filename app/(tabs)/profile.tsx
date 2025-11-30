import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, SafeAreaView, StatusBar, ActivityIndicator, ScrollView, Switch, Modal, TextInput } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import AdminTaskManagement from '../../components/AdminTaskManagement';
import AdminUserSelectionModal from '../../components/AdminUserSelectionModal';
import { addSampleTasks } from '../../services/TaskService';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { uploadImageFromUri } from '../../services/StorageService';
import { createOrUpdateUser } from '../../services/UserService';
import { registerDevicePushToken, sendTestNotification } from '../../services/PushService';

type UserData = {
  username: string;
  fullName: string;
  email: string;
  bio: string;
  photoURL: string | null;
  role: string;
  isActive: boolean;
};

export default function ProfileScreen() {
  const { user, logOut, isAdmin } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { toggleTheme, isUsingSystem, isReady: isThemeReady, setPreference: setThemePreference, isDarkMode } = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isTasksModalVisible, setIsTasksModalVisible] = useState(false);
  const [isUserSelectionModalVisible, setIsUserSelectionModalVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [cachedPhotoUrl, setCachedPhotoUrl] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sayfa odaklandığında StatusBar rengini güncellemek için
  useFocusEffect(
    React.useCallback(() => {
      // Android için StatusBar rengini arka planla aynı yap
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
        StatusBar.setBarStyle(colorScheme === 'dark' ? 'light-content' : 'dark-content');
      }
      
      return () => {
        // Temizleme işlemi gerekirse burada yapılabilir
      };
    }, [colorScheme])
  );

  // Profil resmi cache'ini yükle
  useEffect(() => {
    const loadCachedPhoto = async () => {
      if (user?.uid) {
        try {
          const cachedPhoto = await AsyncStorage.getItem(`profile_photo_${user.uid}`);
          if (cachedPhoto) {
            setCachedPhotoUrl(cachedPhoto);
          }
        } catch (error) {
          console.error('Cache foto yükleme hatası:', error);
        }
      }
    };
    loadCachedPhoto();
  }, [user]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Önce cache'den kontrol et
          const cachedData = await AsyncStorage.getItem(`userData_${user.uid}`);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            setUserData(parsedData);
            // Cache'den profil resmi URL'ini yükle
            if (parsedData.photoURL) {
              setCachedPhotoUrl(parsedData.photoURL);
              await AsyncStorage.setItem(`profile_photo_${user.uid}`, parsedData.photoURL);
            }
            setLoading(false);
            return;
          }

          // Cache'de yoksa Firestore'dan çek
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            setUserData(data);
            // Veriyi cache'e kaydet
            await AsyncStorage.setItem(`userData_${user.uid}`, JSON.stringify(data));
            // Profil resmi URL'ini cache'e kaydet
            if (data.photoURL) {
              setCachedPhotoUrl(data.photoURL);
              await AsyncStorage.setItem(`profile_photo_${user.uid}`, data.photoURL);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Hata durumunda cache'den yükle
          const cachedData = await AsyncStorage.getItem(`userData_${user.uid}`);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            setUserData(parsedData);
            if (parsedData.photoURL) {
              setCachedPhotoUrl(parsedData.photoURL);
            }
          } else {
            Alert.alert('Hata', 'Kullanıcı bilgileri yüklenirken bir hata oluştu.');
          }
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [user, colorScheme, theme.background]);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      
      // Çıkış yap
      await logOut();
      
      // Cache'i temizle
      if (user) {
        await AsyncStorage.removeItem(`userData_${user.uid}`);
      }
      
    } catch (error) {
      console.error('Çıkış yapma hatası:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAddSampleTasks = async () => {
    try {
      await addSampleTasks();
      Alert.alert(
        'Başarılı',
        'Örnek vazifeler başarıyla eklendi.',
        [{ text: 'Tamam', style: 'default' }]
      );
    } catch (error) {
      console.error('Örnek vazife ekleme hatası:', error);
      Alert.alert(
        'Hata',
        'Örnek vazifeler eklenirken bir hata oluştu.',
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  };

  const handleThemeToggle = async () => {
    try {
      await toggleTheme();
    } catch (error) {
      console.error('Tema güncellenirken hata:', error);
      Alert.alert('Hata', 'Tema değiştirilirken bir sorun oluştu.');
    }
  };

  const handleUseSystemTheme = async () => {
    try {
      await setThemePreference('system');
    } catch (error) {
      console.error('Tema sistem ayarına alınırken hata:', error);
      Alert.alert('Hata', 'Cihaz ayarını kullanırken bir sorun oluştu.');
    }
  };

  const handlePickImage = async () => {
    if (!user) return;

    try {
      // İzin iste
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('İzin gerekli', 'Galeriye erişim izni vermen gerekiyor.');
        return;
      }

      // Resim seç
      const result = await ImagePicker.launchImageLibraryAsync({
        // @ts-ignore - expo-image-picker API değişikliği
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const imageUri = result.assets[0].uri;
      setIsUploadingPhoto(true);

      // Resmi yükle
      const photoURL = await uploadImageFromUri(imageUri, 'profile-pictures');
      
      // Firestore'da güncelle
      await createOrUpdateUser(user.uid, { photoURL });
      
      // Cache'i güncelle
      if (userData) {
        const updatedUserData = { ...userData, photoURL };
        setUserData(updatedUserData);
        setCachedPhotoUrl(photoURL);
        await AsyncStorage.setItem(`userData_${user.uid}`, JSON.stringify(updatedUserData));
        await AsyncStorage.setItem(`profile_photo_${user.uid}`, photoURL);
      }

      Alert.alert('Başarılı', 'Profil resmin güncellendi.');
    } catch (error: any) {
      console.error('Profil resmi yükleme hatası:', error);
      Alert.alert('Hata', error.message || 'Profil resmi yüklenirken bir hata oluştu.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;

    Alert.alert(
      'Profil Resmini Kaldır',
      'Profil resmini kaldırmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              // Firestore'da güncelle
              await createOrUpdateUser(user.uid, { photoURL: undefined });
              
              // Cache'i güncelle
              if (userData) {
                const updatedUserData = { ...userData, photoURL: null };
                setUserData(updatedUserData);
                setCachedPhotoUrl(null);
                await AsyncStorage.setItem(`userData_${user.uid}`, JSON.stringify(updatedUserData));
                await AsyncStorage.removeItem(`profile_photo_${user.uid}`);
              }

              Alert.alert('Başarılı', 'Profil resmin kaldırıldı.');
            } catch (error: any) {
              console.error('Profil resmi kaldırma hatası:', error);
              Alert.alert('Hata', 'Profil resmi kaldırılırken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleSaveProfile = async (fullName: string, username: string) => {
    if (!user || !userData) return;

    setIsSavingProfile(true);
    try {
      // Firestore'da güncelle
      await createOrUpdateUser(user.uid, {
        fullName: fullName.trim(),
        username: username.trim(),
      });
      
      // Cache'i güncelle
      const updatedUserData = { ...userData, fullName: fullName.trim(), username: username.trim() };
      setUserData(updatedUserData);
      await AsyncStorage.setItem(`userData_${user.uid}`, JSON.stringify(updatedUserData));

      setIsEditModalVisible(false);
      Alert.alert('Başarılı', 'Profil bilgilerin güncellendi.');
    } catch (error: any) {
      console.error('Profil güncelleme hatası:', error);
      Alert.alert('Hata', error.message || 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const themeStatusText = isUsingSystem
    ? 'Cihaz ayarlarını otomatik takip ediyor'
    : isDarkMode
      ? 'Uygulama karanlık modda'
      : 'Uygulama aydınlık modda';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {isLoggingOut && (
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutContent}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.logoutText, { color: theme.text }]}>Çıkış yapılıyor...</Text>
          </View>
        </View>
      )}
      
      <View style={[styles.headerSpacer, { height: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0 }]} />
      
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={handlePickImage}
          disabled={isUploadingPhoto}
          activeOpacity={0.8}
        >
          {(cachedPhotoUrl || userData?.photoURL) ? (
            <Image
              source={{ uri: cachedPhotoUrl || userData?.photoURL || '' }}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
              onError={(error) => {
                console.error('Profil resmi yüklenirken hata:', error);
                setCachedPhotoUrl(null);
              }}
            />
          ) : (
            <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '20' }]}>
              <MaterialCommunityIcons name="account" size={32} color={theme.primary} />
            </View>
          )}
          {isUploadingPhoto ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          ) : (
            <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary, borderColor: theme.surface }]}>
              <MaterialCommunityIcons name="camera" size={16} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Text style={[styles.name, { color: theme.text }]}>
            {userData?.fullName || user?.displayName || 'Kullanıcı'}
          </Text>
          <Text style={[styles.username, { color: theme.textDim }]}>
            @{userData?.username || 'kullanici'}
          </Text>
          <Text style={[styles.email, { color: theme.textDim }]}>
            {userData?.email || user?.email}
          </Text>
          
          {/* Admin rozeti */}
          {isAdminLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.adminLoading} />
          ) : isAdmin && (
            <View style={[styles.adminBadge, { backgroundColor: theme.primary + '20' }]}>
              <MaterialCommunityIcons name="shield-check" size={14} color={theme.primary} />
              <Text style={[styles.adminText, { color: theme.primary }]}>Yönetici</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.surface }]}
            onPress={() => setIsEditModalVisible(true)}
          >
            <MaterialCommunityIcons name="account-edit" size={24} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Profil Bilgileri Güncelle</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textDim} />
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Görünüm</Text>

          <View style={[styles.menuItem, styles.themeCard, { backgroundColor: theme.surface }]}>
            <View style={styles.themeInfo}>
              <Text style={[styles.menuText, { color: theme.text, marginBottom: 2 }]}>Karanlık Mod</Text>
              <Text style={[styles.themeDescription, { color: theme.textDim }]}>
                {themeStatusText}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleThemeToggle}
              disabled={!isThemeReady}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={
                Platform.OS === 'android'
                  ? isDarkMode
                    ? theme.primary
                    : '#f4f3f4'
                  : undefined
              }
              ios_backgroundColor={theme.border}
            />
          </View>

          {!isUsingSystem && (
            <TouchableOpacity
              style={[styles.resetThemeButton, { borderColor: theme.border }]}
              onPress={handleUseSystemTheme}
            >
              <MaterialCommunityIcons name="cellphone-settings" size={20} color={theme.text} />
              <Text style={[styles.resetThemeText, { color: theme.text }]}>Telefon ayarını kullan</Text>
            </TouchableOpacity>
          )}

          {/* Admin İşlemleri */}
          {isAdmin && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Yönetim
              </Text>
              
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.surface }]}
                onPress={() => setIsTasksModalVisible(true)}
              >
                <MaterialCommunityIcons name="format-list-checks" size={24} color={theme.accent} />
                <Text style={[styles.menuText, { color: theme.text }]}>
                  Vazifeleri Düzenle
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textDim} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.surface }]}
                onPress={() => setIsUserSelectionModalVisible(true)}
              >
                <MaterialCommunityIcons name="account-group" size={24} color={theme.warning} />
                <Text style={[styles.menuText, { color: theme.text }]}>
                  Yönetici Kullanıcıları Belirle
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textDim} />
              </TouchableOpacity>

              <View style={[styles.infoCard, { backgroundColor: `${theme.primary}15` }]}>
                <View style={styles.infoHeader}>
                  <MaterialCommunityIcons name="information" size={24} color={theme.primary} />
                  <Text style={[styles.infoTitle, { color: theme.primary }]}>
                    Yönetici Bilgileri
                  </Text>
                </View>
                <Text style={[styles.infoText, { color: theme.text }]}>
                  Yönetici olarak tüm kullanıcılar için vazife ekleyebilir, düzenleyebilir veya silebilirsiniz.
                </Text>
                <Text style={[styles.infoText, { color: theme.text, marginTop: 8 }]}>
                  Ayrıca diğer kullanıcılara yönetici yetkisi verebilir veya kaldırabilirsiniz.
                </Text>
                <View style={styles.infoTip}>
                  <MaterialCommunityIcons name="lightbulb-on" size={18} color={theme.warning} />
                  <Text style={[styles.tipText, { color: theme.textDim }]}>
                    Normal kullanıcılar sadece vazifeleri yapıldı/yapılmadı olarak işaretleyebilir.
                  </Text>
                </View>
              </View>

            </>
          )}
          
          {/* Vazifeleri Düzenle Butonu (Admin değilse sadece görüntüler) */}
          {!isAdmin && !isAdminLoading && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Vazifeler
              </Text>
              
              <View style={[styles.menuItem, { backgroundColor: theme.surface }]}>
                <MaterialCommunityIcons name="format-list-checks" size={24} color={theme.textDim} />
                <Text style={[styles.menuText, { color: theme.textDim }]}>
                  Vazifeleri Düzenle (Yönetici erişimi gerekli)
                </Text>
                <MaterialCommunityIcons name="lock" size={24} color={theme.textDim} />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.surface }]}
            onPress={async () => {
              if (user) {
                Alert.alert('Bildirim Testi', 'FCM token kaydediliyor ve test bildirimi gönderiliyor...');
                await registerDevicePushToken(user.uid);
                setTimeout(async () => {
                  const sent = await sendTestNotification(user.uid);
                  if (sent) {
                    Alert.alert('Başarılı', 'Test bildirimi gönderildi. Cloud Functions çalışıyorsa bildirim gelmeli.');
                  } else {
                    Alert.alert('Hata', 'FCM token bulunamadı veya kaydedilemedi. Console loglarını kontrol edin.');
                  }
                }, 2000);
              }
            }}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Bildirim Testi</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textDim} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.surface }]}
            onPress={() => {}}
          >
            <MaterialCommunityIcons name="shield-account" size={24} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Güvenlik</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textDim} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.surface }]}
            onPress={() => {}}
          >
            <MaterialCommunityIcons name="help-circle-outline" size={24} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Yardım</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textDim} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: theme.error + '20' }]}
            onPress={handleSignOut}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator color={theme.error} />
            ) : (
              <>
                <MaterialCommunityIcons name="logout" size={24} color={theme.error} />
                <Text style={[styles.signOutText, { color: theme.error }]}>Çıkış Yap</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Admin Vazife Modal */}
      {isTasksModalVisible && (
        <BlurView style={StyleSheet.absoluteFill} intensity={Platform.OS === 'ios' ? 20 : 100} tint={colorScheme}>
          <AdminTaskManagement
            onClose={() => setIsTasksModalVisible(false)}
            isAdmin={isAdmin}
          />
        </BlurView>
      )}
      
      {/* Admin Kullanıcı Seçimi Modal */}
      {isUserSelectionModalVisible && (
        <BlurView style={StyleSheet.absoluteFill} intensity={Platform.OS === 'ios' ? 20 : 100} tint={colorScheme}>
          <AdminUserSelectionModal
            visible={isUserSelectionModalVisible}
            onClose={() => setIsUserSelectionModalVisible(false)}
          />
        </BlurView>
      )}

      {/* Profil Düzenleme Modal */}
      <ProfileEditModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleSaveProfile}
        initialFullName={userData?.fullName || ''}
        initialUsername={userData?.username || ''}
        isLoading={isSavingProfile}
        theme={theme}
        profilePhotoUrl={cachedPhotoUrl || userData?.photoURL || null}
        onPickImage={handlePickImage}
        onRemovePhoto={handleRemovePhoto}
        isUploadingPhoto={isUploadingPhoto}
      />
    </SafeAreaView>
  );
}

// Profil Düzenleme Modal Component
const ProfileEditModal = ({
  visible,
  onClose,
  onSave,
  initialFullName,
  initialUsername,
  isLoading,
  theme,
  profilePhotoUrl,
  onPickImage,
  onRemovePhoto,
  isUploadingPhoto,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (fullName: string, username: string) => void;
  initialFullName: string;
  initialUsername: string;
  isLoading: boolean;
  theme: typeof Colors.light;
  profilePhotoUrl: string | null;
  onPickImage: () => void;
  onRemovePhoto: () => void;
  isUploadingPhoto: boolean;
}) => {
  const [fullName, setFullName] = useState(initialFullName);
  const [username, setUsername] = useState(initialUsername);

  useEffect(() => {
    if (visible) {
      setFullName(initialFullName);
      setUsername(initialUsername);
    }
  }, [visible, initialFullName, initialUsername]);

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert('Hata', 'Ad ve soyad boş bırakılamaz.');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Hata', 'Kullanıcı adı boş bırakılamaz.');
      return;
    }
    onSave(fullName, username);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Profili Düzenle</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalForm}>
              {/* Profil Resmi Bölümü */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Profil Resmi</Text>
                <View style={styles.profilePhotoSection}>
                  <View style={styles.profilePhotoContainer}>
                    {profilePhotoUrl ? (
                      <Image
                        source={{ uri: profilePhotoUrl }}
                        style={styles.modalAvatarImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                        onError={(error) => {
                          console.error('Modal profil resmi yüklenirken hata:', error);
                        }}
                      />
                    ) : (
                      <View style={[styles.modalAvatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                        <MaterialCommunityIcons name="account" size={32} color={theme.primary} />
                      </View>
                    )}
                    {isUploadingPhoto && (
                      <View style={styles.modalAvatarOverlay}>
                        <ActivityIndicator size="small" color="#FFF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.profilePhotoActions}>
                    <TouchableOpacity
                      style={[styles.profilePhotoButton, { backgroundColor: theme.primary }]}
                      onPress={onPickImage}
                      disabled={isUploadingPhoto}
                    >
                      <MaterialCommunityIcons name="camera" size={18} color="#FFF" />
                      <Text style={styles.profilePhotoButtonText}>
                        {isUploadingPhoto ? 'Yükleniyor...' : 'Değiştir'}
                      </Text>
                    </TouchableOpacity>
                    {profilePhotoUrl && (
                      <TouchableOpacity
                        style={[styles.profilePhotoButton, styles.profilePhotoButtonRemove, { borderColor: theme.error }]}
                        onPress={onRemovePhoto}
                        disabled={isUploadingPhoto}
                      >
                        <MaterialCommunityIcons name="delete-outline" size={18} color={theme.error} />
                        <Text style={[styles.profilePhotoButtonText, { color: theme.error }]}>Kaldır</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Ad ve Soyad</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="Ad ve Soyad"
                  placeholderTextColor={theme.textDim}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Kullanıcı Adı</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="kullanici_adi"
                  placeholderTextColor={theme.textDim}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.inputHint, { color: theme.textDim }]}>
                  Sadece küçük harf, rakam ve alt çizgi kullanılabilir
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSpacer: {
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginTop: 8,
  },
  avatarWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  adminText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  adminLoading: {
    marginTop: 8,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: {
    marginLeft: 16,
    flex: 1,
    fontSize: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  signOutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  logoutContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    marginTop: 10,
    fontSize: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  tipText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  themeCard: {
    alignItems: 'center',
    gap: 4,
  },
  themeInfo: {
    flex: 1,
    marginRight: 12,
  },
  themeDescription: {
    fontSize: 14,
  },
  resetThemeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  resetThemeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalForm: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonSave: {
    backgroundColor: '#2E7DFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profilePhotoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  modalAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  modalAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  profilePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  profilePhotoButtonRemove: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  profilePhotoButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 