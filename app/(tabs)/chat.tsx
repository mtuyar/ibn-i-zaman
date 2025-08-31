import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ChatItem } from '../../components/ChatItem';
import { Chat, getChats, deleteChat } from '../../services/ChatService';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    loadChats();
  }, [loadChats]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.displayName?.charAt(0) || '?'}</Text>
            </View>
          )}
          <Text style={styles.headerTitle}>Mesajlar</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleNewMessage}>
            <Ionicons name="add" size={28} color="#2E7DFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#A0A0A0" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Sohbetlerde ara..."
            placeholderTextColor="#A0A0A0"
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
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadChats}
            colors={['#2E7DFF']}
            tintColor="#2E7DFF"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Arama sonucu bulunamadı'
                : 'Henüz hiç mesajınız yok'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.startChatButton}
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
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 8 : StatusBar.currentHeight,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
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
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5EFFF',
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
    color: '#666666',
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