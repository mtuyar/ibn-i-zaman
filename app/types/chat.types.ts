export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  fileURL?: string;
  fileType?: string;
  fileSize?: number;
  readBy: {
    userId: string;
    readAt: Date;
  }[];
  status: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string;
  photoURL?: string | null;
  participants: {
    userId: string;
    role: 'admin' | 'member';
    joinedAt: any;
  }[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: any;
    type: 'text' | 'image' | 'file';
  };
  unreadCount: {
    [userId: string]: number;
  };
  createdAt: any;
  updatedAt: any;
}

export interface ChatListProps {
  chats: Chat[];
  onChatSelect: (chatId: string) => void;
}

export interface ChatItemProps {
  chat: Chat;
  onSelect: (chatId: string) => void;
  onDelete: (chatId: string) => void;
}

export interface ChatHeaderProps {
  onSearch: (query: string) => void;
  onNewMessage: () => void;
} 