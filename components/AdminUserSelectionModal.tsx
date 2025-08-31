import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { 
  collection, 
  getDocs, 
  query, 
  doc, 
  setDoc, 
  deleteDoc, 
  where,
  getFirestore
} from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Haptics from 'expo-haptics';
import { getAdminUsers, toggleAdminStatus } from '../services/AdminService';

// Kullanıcı tipi
interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface AdminUserSelectionModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminUserSelectionModal({ visible, onClose }: AdminUserSelectionModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [users, setUsers] = useState<User[]>([]);
  const [adminUsers, setAdminUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Kullanıcıları ve admin kullanıcıları getir
  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible]);

  // Kullanıcıları getir
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Kullanıcıları getir
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersList: User[] = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          displayName: userData.displayName || 'İsimsiz Kullanıcı',
          email: userData.email || 'Email yok',
          photoURL: userData.photoURL
        });
      });
      
      setUsers(usersList);
      
      // Admin kullanıcıları getir
      const adminIds = await getAdminUsers();
      setAdminUsers(adminIds);
      
    } catch (error) {
      console.error('Kullanıcı yükleme hatası:', error);
      Alert.alert('Hata', 'Kullanıcılar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Admin yetkisi ver/al
  const handleToggleAdminStatus = async (userId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);
      
      const success = await toggleAdminStatus(userId);
      
      if (success) {
        // UI'ı güncelle
        const isAdmin = adminUsers.includes(userId);
        
        if (isAdmin) {
          // Admin yetkisini kaldır
          setAdminUsers(prev => prev.filter(id => id !== userId));
          Alert.alert('Başarılı', 'Yönetici yetkisi kaldırıldı.');
        } else {
          // Admin yetkisi ver
          setAdminUsers(prev => [...prev, userId]);
          Alert.alert('Başarılı', 'Yönetici yetkisi verildi.');
        }
      } else {
        Alert.alert('Hata', 'Yönetici yetkisi değiştirilirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Yönetici yetkisi değiştirme hatası:', error);
      Alert.alert('Hata', 'Yönetici yetkisi değiştirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrelenmiş kullanıcıları göster
  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Kullanıcı listesi item render
  const renderUserItem = ({ item }: { item: User }) => {
    const isAdmin = adminUsers.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.userItem, 
          { backgroundColor: theme.surface }
        ]}
        onPress={() => handleToggleAdminStatus(item.id)}
      >
        <View style={styles.userInfo}>
          <View style={[
            styles.avatarContainer, 
            { backgroundColor: isAdmin ? `${theme.primary}25` : `${theme.textDim}15` }
          ]}>
            <Text style={[
              styles.avatarText, 
              { color: isAdmin ? theme.primary : theme.text }
            ]}>
              {item.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.displayName}
            </Text>
            <Text style={[styles.userEmail, { color: theme.textDim }]}>
              {item.email}
            </Text>
          </View>
        </View>
        
        <View style={[
          styles.adminBadge, 
          { 
            backgroundColor: isAdmin ? `${theme.primary}20` : `${theme.textDim}10`,
            borderColor: isAdmin ? theme.primary : 'transparent'
          }
        ]}>
          <Ionicons 
            name={isAdmin ? "shield-checkmark" : "shield-outline"} 
            size={18} 
            color={isAdmin ? theme.primary : theme.textDim} 
          />
          <Text style={[
            styles.adminText,
            { color: isAdmin ? theme.primary : theme.textDim }
          ]}>
            {isAdmin ? 'Yönetici' : 'Normal Kullanıcı'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar 
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
          backgroundColor={theme.background}
        />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Yönetici Kullanıcılar
          </Text>
          
          <View style={styles.headerRight}>
            {loading && <ActivityIndicator size="small" color={theme.primary} />}
          </View>
        </View>
        
        {/* Arama barı */}
        <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
          <Ionicons name="search" size={20} color={theme.textDim} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Kullanıcı ara..."
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Açıklama */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textDim }]}>
            Yönetici kullanıcılar tüm vazifeleri düzenleyebilir ve yeni vazifeler ekleyebilir.
          </Text>
        </View>
        
        {/* Kullanıcı listesi */}
        {loading && users.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textDim }]}>
              Kullanıcılar yükleniyor...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={48} color={theme.textDim} />
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  {searchQuery.length > 0
                    ? 'Aramanızla eşleşen kullanıcı bulunamadı'
                    : 'Henüz kullanıcı bulunmuyor'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 32,
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 8,
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 120, 255, 0.1)',
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  adminText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
}); 