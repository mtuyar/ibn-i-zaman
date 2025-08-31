import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { isUserAdmin } from '../services/AdminService';
import AdminTasksModal from '../components/AdminTasksModal';
import AdminUserSelectionModal from '../components/AdminUserSelectionModal';
import { BlurView } from 'expo-blur';
import AdminTaskManagement from '../components/AdminTaskManagement';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [isTasksModalVisible, setIsTasksModalVisible] = useState(false);
  const [isUserSelectionModalVisible, setIsUserSelectionModalVisible] = useState(false);
  const { width } = useWindowDimensions();
  const [showTaskManagement, setShowTaskManagement] = useState(false);

  // Admin kontrolü
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const adminStatus = await isUserAdmin(user.uid);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('Admin kontrolü hatası:', error);
        } finally {
          setIsAdminLoading(false);
        }
      } else {
        setIsAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Çıkış işlemi
  const handleSignOut = async () => {
    try {
      // This method is handled by useAuth
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
      console.error('Çıkış hatası:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Oturumunuzu kapatmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleSignOut();
          } 
        }
      ]
    );
  };

  const handleManageTasks = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTaskManagement(true);
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.text, { color: theme.text }]}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={theme.headerBackground}
        style={styles.header}
      >
        <View style={styles.userInfoContainer}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.displayName || 'Kullanıcı'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || 'Kullanıcı e-postası'}
            </Text>
            
            {/* Admin rozeti */}
            {isAdminLoading ? (
              <ActivityIndicator size="small" color="#FFF" style={styles.adminLoading} />
            ) : isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                <Text style={styles.adminText}>Yönetici</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
      
      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Hesap Bilgileri
        </Text>
        
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="person" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>
              Profil Bilgilerini Düzenle
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </TouchableOpacity>
          
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="notifications" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>
              Bildirim Ayarları
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </TouchableOpacity>
          
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="lock-closed" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>
              Şifre Değiştir
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </TouchableOpacity>
        </View>
        
        {/* Admin İşlemleri */}
        {isAdmin && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Yönetim
            </Text>
            
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleManageTasks}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: `${theme.accent}20` }]}>
                  <Ionicons name="list" size={20} color={theme.accent} />
                </View>
                <Text style={[styles.menuText, { color: theme.text }]}>
                  Vazifeleri Düzenle
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
              </TouchableOpacity>
              
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setIsUserSelectionModalVisible(true)}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: `${theme.warning}20` }]}>
                  <Ionicons name="people" size={20} color={theme.warning} />
                </View>
                <Text style={[styles.menuText, { color: theme.text }]}>
                  Yönetici Kullanıcıları Belirle
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          </>
        )}
        
        {/* Vazifeleri Düzenle Butonu (Admin değilse sadece görüntüler) */}
        {!isAdmin && !isAdminLoading && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Vazifeler
            </Text>
            
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.menuItem}>
                <View style={[styles.menuIconContainer, { backgroundColor: `${theme.textDim}20` }]}>
                  <Ionicons name="list" size={20} color={theme.textDim} />
                </View>
                <Text style={[styles.menuText, { color: theme.textDim }]}>
                  Vazifeleri Düzenle (Yönetici erişimi gerekli)
                </Text>
                <Ionicons name="lock-closed" size={20} color={theme.textDim} />
              </View>
            </View>
          </>
        )}
        
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Diğer
        </Text>
        
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="help-circle" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>
              Yardım ve Destek
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </TouchableOpacity>
          
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="information-circle" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>
              Hakkında
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </TouchableOpacity>
          
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={[styles.menuIconContainer, { backgroundColor: `${theme.error}20` }]}>
              <Ionicons name="log-out" size={20} color={theme.error} />
            </View>
            <Text style={[styles.menuText, { color: theme.error }]}>
              Çıkış Yap
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Admin Vazife Modal */}
      <AdminTasksModal 
        visible={isTasksModalVisible}
        onClose={() => setIsTasksModalVisible(false)}
      />
      
      {/* Admin Kullanıcı Seçimi Modal */}
      <AdminUserSelectionModal
        visible={isUserSelectionModalVisible}
        onClose={() => setIsUserSelectionModalVisible(false)}
      />

      {/* Admin Task Management Modal */}
      {showTaskManagement && (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={Platform.OS === 'ios' ? 20 : 100}
          tint={colorScheme}
        >
          <AdminTaskManagement 
            onClose={() => setShowTaskManagement(false)} 
            isAdmin={isAdmin}
          />
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfo: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  adminText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  adminLoading: {
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
  },
  separator: {
    height: 1,
    width: '100%',
  },
  text: {
    fontSize: 16,
  }
}); 