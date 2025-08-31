import React from 'react';
import { View, Text } from 'react-native';
import { chatStyles } from '../../styles/chat.styles';

interface UnreadBadgeProps {
  count: number;
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({ count }) => {
  if (count === 0) return null;

  return (
    <View style={chatStyles.unreadBadge}>
      <Text style={chatStyles.unreadCount}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}; 