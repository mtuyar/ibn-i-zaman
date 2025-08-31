import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatHeaderProps } from '../app/types/chat.types';
import { chatStyles } from '../app/styles/chat.styles';

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onSearch, onNewMessage }) => {
  return (
    <View style={chatStyles.header}>
      <View style={chatStyles.searchContainer}>
        <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
        <TextInput
          style={chatStyles.searchInput}
          placeholder="Sohbet ara..."
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
          onChangeText={onSearch}
        />
      </View>
      <TouchableOpacity
        style={chatStyles.newMessageButton}
        onPress={onNewMessage}
      >
        <Ionicons name="add" size={24} color="#2F80ED" />
      </TouchableOpacity>
    </View>
  );
}; 