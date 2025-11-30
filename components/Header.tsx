import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import {
  Notification,
  deleteNotification,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToUserNotifications,
} from '../services/AppNotificationService';

const { width } = Dimensions.get('window');

interface HeaderProps {
  title: string;
  showNotification?: boolean;
  onNotificationPress?: () => void;
  isProfileScreen?: boolean;
  leftButton?: React.ReactNode;
  onLeftButtonPress?: () => void;
  rightButton?: React.ReactNode;
  onRightButtonPress?: () => void;
}

// Zaman formatı
const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

export default function Header({ 
  title, 
  showNotification = true, 
  onNotificationPress, 
  isProfileScreen = false,
  leftButton,
  onLeftButtonPress,
  rightButton,
  onRightButtonPress,
}: HeaderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Android için StatusBar rengini ayarla
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isProfileScreen) {
        // Profil sayfası için arka plan rengi
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
        StatusBar.setBarStyle(colorScheme === 'dark' ? 'light-content' : 'dark-content');
      } else {
        // Diğer sayfalar için statusBar'ı transparan yap ve LinearGradient ile kaplayacağız
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
        StatusBar.setBarStyle('light-content');
      }
    }
  }, [colorScheme, isProfileScreen]);

  // Bildirimleri dinle
  useEffect(() => {
    if (!user?.uid || !showNotification) {
      console.log('Header: Bildirim dinleme atlandı - user:', user?.uid, 'showNotification:', showNotification);
      return;
    }

    console.log('Header: Bildirim dinleme başlatılıyor - userId:', user.uid);
    setIsLoading(true);
    const unsubscribe = subscribeToUserNotifications(user.uid, (notifs) => {
      console.log('Header: Bildirimler güncellendi:', notifs.length, 'bildirim, okunmamış:', notifs.filter(n => !n.read).length);
      console.log('Header: Bildirim detayları:', notifs.map(n => ({ id: n.id, type: n.type, read: n.read, title: n.title })));
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.read).length;
      console.log('Header: Unread count:', unread);
      setUnreadCount(unread);
      setIsLoading(false);
    });

    return () => {
      console.log('Header: Bildirim dinleme temizleniyor');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, showNotification]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'program':
        return 'calendar';
      case 'message':
        return 'chatbubble';
      case 'announcement':
        return 'megaphone';
      case 'urgent_announcement':
        return 'alert-circle';
      default:
        return 'notifications';
    }
  };

  const getColor = (type: Notification['type']) => {
    switch (type) {
      case 'program':
        return '#3498DB';
      case 'message':
        return '#2E7DFF';
      case 'announcement':
        return '#2ECC71';
      case 'urgent_announcement':
        return '#E74C3C';
      default:
        return '#7F8C8D';
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
      } catch (error) {
        console.error('Bildirim okundu işaretleme hatası:', error);
      }
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Bildirimi Sil',
      'Bu bildirimi silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotification(notificationId);
            } catch (error) {
              Alert.alert('Hata', 'Bildirim silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (error) {
      Alert.alert('Hata', 'Bildirimler okundu olarak işaretlenirken bir hata oluştu.');
    }
  };

  return (
    <>
      {!isProfileScreen && Platform.OS === 'android' && (
        <LinearGradient
          colors={Colors[colorScheme].headerBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: StatusBar.currentHeight || 24,
            zIndex: 100
          }}
        />
      )}
      {isProfileScreen && Platform.OS === 'android' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: StatusBar.currentHeight || 24,
            backgroundColor: Colors[colorScheme].background,
            zIndex: 100
          }}
        />
      )}
      <LinearGradient
        colors={Colors[colorScheme].headerBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.container, 
          { 
            paddingTop: insets.top,
          }
        ]}>
        <View style={styles.content}>
          {/* Sol taraf - leftButton */}
          {leftButton ? (
            <TouchableOpacity style={styles.sideContainer} onPress={onLeftButtonPress}>
              {leftButton}
            </TouchableOpacity>
          ) : (
            <View style={styles.sideContainer} />
          )}
          {/* Orta - Başlık */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </View>
          {/* Sağ taraf - Özel buton veya bildirim ikon */}
          {rightButton ? (
            <TouchableOpacity
              style={styles.analyticsButton}
              onPress={onRightButtonPress}
              accessibilityRole="button"
            >
              {rightButton}
            </TouchableOpacity>
          ) : showNotification ? (
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setIsModalVisible(true)}>
              <Ionicons name="notifications-outline" size={22} color="#FFF" />
              {unreadCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: theme.error, borderColor: theme.surface }]}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount.toString()}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.sideContainer} />
          )}
        </View>
      </LinearGradient>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Bildirimler</Text>
              <View style={styles.modalHeaderActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    style={styles.markAllReadButton}
                  >
                    <Text style={[styles.markAllReadText, { color: theme.primary }]}>
                      Tümünü Okundu İşaretle
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.modalScroll}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={48} color={theme.placeholder} />
                  <Text style={[styles.emptyText, { color: theme.textDim }]}>
                    Henüz bildiriminiz yok
                  </Text>
                </View>
              ) : (
                notifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      { 
                        borderBottomColor: theme.border,
                        backgroundColor: notification.read ? 'transparent' : theme.primary + '08',
                      }
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.notificationIcon, { backgroundColor: `${getColor(notification.type)}15` }]}>
                      <Ionicons 
                        name={getIcon(notification.type) as any} 
                        size={20} 
                        color={getColor(notification.type)} 
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={[
                          styles.notificationTitle,
                          { color: theme.text },
                          !notification.read && styles.notificationTitleUnread
                        ]}>
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                        )}
                      </View>
                      <Text style={[styles.notificationDescription, { color: theme.textDim }]}>
                        {notification.body}
                      </Text>
                      <Text style={[styles.notificationTime, { color: theme.placeholder }]}>
                        {formatTime(notification.createdAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteNotification(notification.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.textDim} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44, // Instagram/Twitter benzeri sabit header yüksekliği
  },
  sideContainer: {
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center', // Başlık metni yatay olarak ortalanır
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center', // Metin ortalanmış olacak
  },
  notificationButton: {
    position: 'relative',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllReadButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllReadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationDescription: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    color: '#7F8C8D',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: Platform.OS === 'ios' ? 12 : 11,
    color: '#95A5A6',
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  analyticsButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 