import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, SafeAreaView, StatusBar, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import AdminTaskManagement from '../../components/AdminTaskManagement';
import AdminUserSelectionModal from '../../components/AdminUserSelectionModal';
import { addSampleTasks } from '../../services/TaskService';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';

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

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Önce cache'den kontrol et
          const cachedData = await AsyncStorage.getItem(`userData_${user.uid}`);
          if (cachedData) {
            setUserData(JSON.parse(cachedData));
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
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Hata durumunda cache'den yükle
          const cachedData = await AsyncStorage.getItem(`userData_${user.uid}`);
          if (cachedData) {
            setUserData(JSON.parse(cachedData));
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
        <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '20' }]}>
          <MaterialCommunityIcons name="account" size={32} color={theme.primary} />
        </View>
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
            onPress={() => {}}
          >
            <MaterialCommunityIcons name="account-edit" size={24} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Profili Düzenle</Text>
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
            onPress={() => {}}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Bildirimler</Text>
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
    </SafeAreaView>
  );
}

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
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
}); 