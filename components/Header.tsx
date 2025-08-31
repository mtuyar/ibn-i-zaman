import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface HeaderProps {
  title: string;
  showNotification?: boolean;
  onNotificationPress?: () => void;
  isProfileScreen?: boolean;
  leftButton?: React.ReactNode;
  onLeftButtonPress?: () => void;
}

const notifications = [
  {
    id: 1,
    title: 'Yeni Program Eklendi',
    description: 'Ahlak Atölyesi programı eklendi.',
    time: '2 saat önce',
    type: 'program',
  },
  {
    id: 2,
    title: 'Program Değişikliği',
    description: 'Hasbihal İstasyonu programı iptal edildi.',
    time: '1 gün önce',
    type: 'warning',
  },
  {
    id: 3,
    title: 'Yeni Duyuru',
    description: 'Yeni bir duyuru eklendi.',
    time: '3 saat önce',
    type: 'announcement',
  },
];

export default function Header({ 
  title, 
  showNotification = true, 
  onNotificationPress, 
  isProfileScreen = false,
  leftButton,
  onLeftButtonPress,
}: HeaderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'program':
        return 'calendar';
      case 'warning':
        return 'alert-circle';
      case 'announcement':
        return 'megaphone';
      default:
        return 'notifications';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'program':
        return '#3498DB';
      case 'warning':
        return '#E74C3C';
      case 'announcement':
        return '#2ECC71';
      default:
        return '#7F8C8D';
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
          {/* Sağ taraf - Bildirim ikon */}
          {showNotification ? (
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setIsModalVisible(true)}>
              <Ionicons name="notifications-outline" size={22} color="#FFF" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{notifications.length}</Text>
              </View>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bildirimler</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <View style={[styles.notificationIcon, { backgroundColor: `${getColor(notification.type)}15` }]}>
                    <Ionicons 
                      name={getIcon(notification.type)} 
                      size={20} 
                      color={getColor(notification.type)} 
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationDescription}>
                      {notification.description}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {notification.time}
                    </Text>
                  </View>
                </View>
              ))}
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
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
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
  notificationTitle: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
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
  analyticsButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 