import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';
import { ChatItem } from '../../components/ChatItem';
import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { Chat, deleteChat, getChats, subscribeToChats } from '../../services/ChatService';

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [chats, setChats] = useState<Chat[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sohbetleri yenileme fonksiyonu
  const refreshChats = useCallback(async () => {
    if (!user) return;
    try {
      setIsRefreshing(true);
      const updatedChats = await getChats(user.uid);
      setChats(updatedChats);
    } catch (error) {
      console.error('Sohbetleri yenileme hatası:', error);
      Alert.alert('Hata', 'Sohbetler yenilenirken bir hata oluştu.');
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // İlk yükleme
    refreshChats();

    // Gerçek zamanlı dinleyici
    const unsubscribe = subscribeToChats(user.uid, (updatedChats) => {
      setChats(updatedChats);
    });

    return () => {
      unsubscribe();
    };
  }, [user, refreshChats]);

  const handleChatSelect = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleChatDelete = async (chatId: string) => {
    if (!user || isDeleting) return;

    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteChat(chatId, user.uid);
              // Silinen sohbeti listeden kaldır
              setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
              // Sohbetleri yenile
              await refreshChats();
            } catch (error) {
              console.error('Sohbet silme hatası:', error);
              Alert.alert('Hata', 'Sohbet silinirken bir hata oluştu. Lütfen tekrar deneyin.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={theme.headerBackground}
        style={styles.header}
      >
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Mesajlar</Text>
      </LinearGradient>

      <FlatList
        data={chats}
        renderItem={({ item }) => (
          <ChatItem
            chat={item}
            onSelect={handleChatSelect}
            onDelete={handleChatDelete}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshChats}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textDim }]}>
              Henüz hiç mesajınız yok.
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
}); 