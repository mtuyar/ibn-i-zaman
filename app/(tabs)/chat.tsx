import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { ChatItem } from '../../components/ChatItem';
import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { Chat, deleteChat, getChats, subscribeToChats } from '../../services/ChatService';
import { getUser } from '../../services/UserService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
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

    loadChats();

    const unsubscribe = subscribeToChats(user.uid, (updatedChats) => {
      setChats(updatedChats);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  useEffect(() => {
    const loadProfilePhoto = async () => {
      if (!user?.uid) return;

      try {
        const cachedPhoto = await AsyncStorage.getItem(`profile_photo_${user.uid}`);
        if (cachedPhoto) {
          setProfilePhotoUrl(cachedPhoto);
          return;
        }

        const userData = await getUser(user.uid);
        if (userData?.photoURL) {
          setProfilePhotoUrl(userData.photoURL);
          await AsyncStorage.setItem(`profile_photo_${user.uid}`, userData.photoURL);
        } else if (user?.photoURL) {
          setProfilePhotoUrl(user.photoURL);
        }
      } catch (error) {
        console.error('Profil resmi yükleme hatası:', error);
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
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbeti silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(chatId, user.uid);
              setChats(chats.filter(chat => chat.id !== chatId));
            } catch (error) {
              console.error('Sohbet silme hatası:', error);
            }
          },
        },
      ]
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const renderChatItem = useCallback(({ item, index }: { item: Chat; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <ChatItem
        chat={item}
        onSelect={handleChatSelect}
        onDelete={handleDeleteChat}
      />
    </Animated.View>
  ), [handleChatSelect, handleDeleteChat]);

  const totalUnread = chats.reduce((acc, chat) =>
    acc + (user ? (chat.unreadCount?.[user.uid] || 0) : 0)
    , 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.backgroundGradient} />}

      {/* Modern Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7} style={styles.profileButton}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.avatarGradient}>
                <Text style={styles.avatarText}>
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.greeting, { color: theme.tabIconDefault }]}>{getGreeting()}</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Mesajlar</Text>
          </View>

          <View style={styles.headerActions}>
            {totalUnread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Search Box */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0' }]}
        >
          <Ionicons name="search" size={20} color={theme.tabIconDefault} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Sohbetlerde ara..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.tabIconDefault} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: isDark ? 'rgba(79, 172, 254, 0.15)' : '#e3f2fd' }]}>
            <Ionicons name="chatbubbles" size={16} color="#4facfe" />
            <Text style={[styles.statChipText, { color: '#4facfe' }]}>{chats.length} Sohbet</Text>
          </View>
          {totalUnread > 0 && (
            <View style={[styles.statChip, { backgroundColor: isDark ? 'rgba(250, 112, 154, 0.15)' : '#fce4ec' }]}>
              <Ionicons name="mail-unread" size={16} color="#fa709a" />
              <Text style={[styles.statChipText, { color: '#fa709a' }]}>{totalUnread} Okunmamış</Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadChats}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={() => (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.emptyIconCircle}>
              <Ionicons name="chatbubbles-outline" size={48} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery ? 'Sonuç bulunamadı' : 'Henüz mesaj yok'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textDim }]}>
              {searchQuery
                ? 'Farklı anahtar kelimeler deneyin'
                : 'Yeni bir sohbet başlatarak iletişime geçin'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleNewMessage}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.emptyButtonGradient}>
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.emptyButtonText}>Yeni Sohbet Başlat</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - New Message */}
      <TouchableOpacity
        style={[styles.fab]}
        onPress={handleNewMessage}
        activeOpacity={0.9}
      >
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.fabGradient}>
          <MaterialCommunityIcons name="message-plus" size={26} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileButton: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerCenter: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#fa709a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});