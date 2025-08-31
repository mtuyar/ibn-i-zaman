import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatItemProps } from '../../types/chat.types';
import { chatStyles } from '../../styles/chat.styles';
import { UnreadBadge } from './UnreadBadge';
import { Swipeable } from 'react-native-gesture-handler';

export const ChatItem: React.FC<ChatItemProps> = ({ chat, onSelect, onDelete }) => {
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const handleDelete = () => {
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbeti silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => onDelete(chat.id),
        },
      ]
    );
  };

  const renderRightActions = () => {
    return (
      <View style={chatStyles.actionButtons}>
        <TouchableOpacity
          style={chatStyles.actionButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={chatStyles.chatItem}
        onPress={() => onSelect(chat.id)}
        activeOpacity={0.7}
      >
        <View style={chatStyles.chatItemContent}>
          <View style={chatStyles.avatar}>
            <Text style={chatStyles.avatarText}>
              {getInitials(chat.name || '')}
            </Text>
          </View>
          <View style={chatStyles.chatContent}>
            <Text style={chatStyles.chatName}>{chat.name || 'İsimsiz Sohbet'}</Text>
            {chat.lastMessage && (
              <>
                <Text style={chatStyles.lastMessage} numberOfLines={1}>
                  {chat.lastMessage.content}
                </Text>
                <Text style={chatStyles.timeText}>
                  {formatTime(chat.lastMessage.timestamp)}
                </Text>
              </>
            )}
          </View>
          <UnreadBadge count={chat.unreadCount[chat.participants[0].userId] || 0} />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}; 