import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Colors from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { Chat } from '../services/ChatService';

interface ChatItemProps {
  chat: Chat;
  onSelect: (chatId: string) => void;
  onDelete: (chatId: string) => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({ chat, onSelect, onDelete }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();
  const lastMessage = chat.lastMessage;
  const unread = user ? (chat.unreadCount?.[user.uid] || 0) : 0;
  // const isOnline = chat.type === 'private' && chat.participants?.some(p => p.userId !== user?.uid && p.status === 'online');

  // Swipe ile silme butonu
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => onDelete(chat.id)}
      >
        <Animated.View style={[styles.deleteActionContent, { transform: [{ scale }] }]}> 
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.deleteActionText}>Sil</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Upwork tarzı: Tarih sağda küçük ve gri, isim kalın, alt satırda açıklama gri
  return (
    <Swipeable
      renderRightActions={renderRightActions}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
        onPress={() => onSelect(chat.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {chat.photoURL ? (
            <Image source={{ uri: chat.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
              <Text style={[styles.avatarText, { color: theme.text }]}>{chat.name?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
          )}
          {/* {isOnline && <View style={styles.onlineDot} />} */}
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.topRow}>
            <Text style={[styles.name, { color: theme.text }]}>{chat.name || 'İsimsiz Sohbet'}</Text>
            {lastMessage?.timestamp && (
              <Text style={[styles.time, { color: theme.textDim }]}>{formatDate(lastMessage.timestamp)}</Text>
            )}
          </View>
          <Text style={[styles.subtitle, { color: theme.textDim }]} numberOfLines={1}>
            {lastMessage?.content ? lastMessage.content : 'Henüz mesaj yok'}
          </Text>
        </View>
        {unread > 0 && (
          <View style={{ minWidth: 22, paddingHorizontal: 6, height: 22, borderRadius: 11, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};

function formatDate(ts: any) {
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#333',
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    left: 2,
    bottom: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    flex: 1,
  },
  time: {
    fontSize: 13,
    color: '#A0A0A0',
    marginLeft: 8,
    minWidth: 60,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    color: '#7C7C7C',
    marginTop: 2,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '90%',
    marginVertical: 6,
    borderRadius: 16,
  },
  deleteActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
}); 