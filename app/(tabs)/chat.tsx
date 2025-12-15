import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatItem } from '../../components/ChatItem';
import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { Chat, deleteChat, getChats, subscribeToChats } from '../../services/ChatService';
import { sendTestNotification } from '../../services/PushService';
import { getUser } from '../../services/UserService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const filteredChats = chats.filter(chat =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadChats = useCallback(async () => {
    if (!user) return;
    try {
      setIsRefreshing(true);
      const userChats = await getChats(user.uid);
      setChats(userChats);
    } catch (error) {
      console.error('Sohbetleri yükleme hatası:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    
    // İlk yükleme
    loadChats();
    
    // Gerçek zamanlı dinleme
    const unsubscribe = subscribeToChats(user.uid, (updatedChats) => {
      setChats(updatedChats);
    });
    
    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  // Profil resmini yükle
  useEffect(() => {
    const loadProfilePhoto = async () => {
      if (!user?.uid) return;
      
      try {
        // Önce cache'den kontrol et
        const cachedPhoto = await AsyncStorage.getItem(`profile_photo_${user.uid}`);
        if (cachedPhoto) {
          setProfilePhotoUrl(cachedPhoto);
          return;
        }
        
        // Cache'de yoksa Firestore'dan çek
        const userData = await getUser(user.uid);
        if (userData?.photoURL) {
          setProfilePhotoUrl(userData.photoURL);
          await AsyncStorage.setItem(`profile_photo_${user.uid}`, userData.photoURL);
        } else if (user?.photoURL) {
          // Firestore'da yoksa Firebase Auth'dan al
          setProfilePhotoUrl(user.photoURL);
        }
      } catch (error) {
        console.error('Profil resmi yükleme hatası:', error);
        // Hata durumunda Firebase Auth'dan al
        if (user?.photoURL) {
          setProfilePhotoUrl(user.photoURL);
        }
      }
    };
    
    loadProfilePhoto();
  }, [user]);

  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };

  const handleChatSelect = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleNewMessage = () => {
    router.push('/chat/new');
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!user) return;
    try {
      await deleteChat(chatId, user.uid);
      setChats(chats.filter(chat => chat.id !== chatId));
    } catch (error) {
      console.error('Sohbet silme hatası:', error);
    }
  };

  const handleTestNotification = async () => {
    if (!user?.uid) return;
    
    try {
      Alert.alert('Bildirim Testi', 'Firebase üzerinden test bildirimi gönderiliyor...');
      const success = await sendTestNotification(user.uid);
      
      if (success) {
        Alert.alert('Başarılı', 'Test mesajı gönderildi. Birkaç saniye içinde bildirim gelmeli.');
      } else {
        Alert.alert('Hata', 'Test bildirimi gönderilemedi. Token bulunamamış olabilir.');
      }
    } catch (error) {
      console.error('Test bildirimi hatası:', error);
      Alert.alert('Hata', 'Bir hata oluştu.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <TouchableOpacity 
        style={{ backgroundColor: theme.primary, padding: 8, alignItems: 'center', marginHorizontal: 16, marginTop: 8, borderRadius: 8 }}
        onPress={handleTestNotification}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔥 Firebase Bildirim Testi</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Platform.OS === 'ios' ? 8 : StatusBar.currentHeight }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
                <Text style={[styles.avatarText, { color: theme.text }]}>{user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Mesajlar</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleNewMessage}>
            <Ionicons name="add" size={28} color={theme.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.searchBox, { backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#F5F5F5' }]}>
          <Ionicons name="search" size={20} color={theme.placeholder} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Sohbetlerde ara..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Sohbet Listesi */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatItem
            chat={item}
            onSelect={handleChatSelect}
            onDelete={handleDeleteChat}
          />
        )}
        contentContainerStyle={[styles.listContent]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadChats}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={theme.placeholder} />
            <Text style={[styles.emptyText, { color: theme.textDim }]}>
              {searchQuery
                ? 'Arama sonucu bulunamadı'
                : 'Henüz hiç mesajınız yok'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={[styles.startChatButton, { backgroundColor: theme.primary }]}
                onPress={handleNewMessage}
              >
                <Text style={styles.startChatButtonText}>Yeni Mesaj Başlat</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#E5E5E5',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    paddingVertical: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  startChatButton: {
    marginTop: 24,
    backgroundColor: '#2E7DFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 