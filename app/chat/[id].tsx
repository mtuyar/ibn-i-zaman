import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import {
    Chat,
    deleteChat,
    getChat,
    markMessageAsRead,
    Message,
    sendMessage,
    subscribeToMessages
} from '../../services/ChatService';
import { getUser } from '../../services/UserService';
import {
    subscribeToUserStatus,
    UserStatus
} from '../../services/UserStatusService';
import { chatDetailStyles } from '../styles/chatDetail.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ChatDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const lastMessageRef = useRef<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const appState = useRef(AppState.currentState);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const unsubscribeMessagesRef = useRef<() => void>(() => {});
  const unsubscribeStatusRef = useRef<() => void>(() => {});
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [senderPhotos, setSenderPhotos] = useState<Record<string, string | null>>({});

  // chat ID'si değiştiğinde çalışacak ana yükleme fonksiyonu
  useEffect(() => {
    if (!user || !id) return;

    let isMounted = true;

    // Sohbet mesajlarını dinle
    unsubscribeMessagesRef.current = subscribeToMessages(id as string, async (newMessages) => {
      if (isMounted) {
        setMessages(newMessages);
        setIsLoading(false);

        // Mesaj gönderen kullanıcıların profil resimlerini yükle
        const uniqueSenderIds = Array.from(new Set(newMessages.map(m => m.senderId)));
        const photos: Record<string, string | null> = {};
        
        for (const senderId of uniqueSenderIds) {
          if (senderId === user.uid) {
            // Kendi profil resmini cache'den al
            try {
              const cachedPhoto = await AsyncStorage.getItem(`profile_photo_${senderId}`);
              if (cachedPhoto) {
                photos[senderId] = cachedPhoto;
              } else {
                // Cache'de yoksa Firestore'dan çek
                const senderData = await getUser(senderId);
                if (senderData?.photoURL) {
                  photos[senderId] = senderData.photoURL;
                  await AsyncStorage.setItem(`profile_photo_${senderId}`, senderData.photoURL);
                } else {
                  photos[senderId] = null;
                }
              }
            } catch (error) {
              photos[senderId] = null;
            }
          } else {
            // Diğer kullanıcıların profil resimlerini cache'den veya Firestore'dan al
            try {
              const cachedPhoto = await AsyncStorage.getItem(`profile_photo_${senderId}`);
              if (cachedPhoto) {
                photos[senderId] = cachedPhoto;
              } else {
                const senderData = await getUser(senderId);
                if (senderData?.photoURL) {
                  photos[senderId] = senderData.photoURL;
                  await AsyncStorage.setItem(`profile_photo_${senderId}`, senderData.photoURL);
                } else {
                  photos[senderId] = null;
                }
              }
            } catch (error) {
              photos[senderId] = null;
            }
          }
        }
        
        setSenderPhotos(prev => ({ ...prev, ...photos }));

        // Yeni mesaj varsa ve en alttaysa otomatik kaydır
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessageRef.current?.id !== lastMessage.id) {
            lastMessageRef.current = lastMessage;
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      }
    }, user.uid);

    // Sohbet bilgilerini ve diğer kullanıcı bilgilerini yükle
    const fetchChatData = async () => {
      try {
        // Sohbet bilgilerini yükle
        const chatData = await getChat(id as string);
        if (!isMounted) return;
        
        setChat(chatData);
        
        // Özel sohbetse, diğer kullanıcı bilgilerini yükle
        if (chatData.type === 'private') {
          const otherUserId = chatData.participants.find(p => p.userId !== user.uid)?.userId;
          
          if (otherUserId) {
            const userData = await getUser(otherUserId);
            if (!isMounted) return;
            
            setOtherUser(userData);
            
            // Diğer kullanıcı durumunu dinle
            unsubscribeStatusRef.current = subscribeToUserStatus(otherUserId, (status) => {
              if (isMounted) {
                setUserStatus(status);
              }
            });
          }
        }

        // Mesajları okundu olarak işaretle
        await markMessageAsRead(id as string, user.uid);
      } catch (error) {
        console.error('Sohbet yükleme hatası:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Sohbet verilerini yükle
    fetchChatData();

    return () => {
      isMounted = false;
      // Dinleyicileri temizle
      unsubscribeMessagesRef.current();
      unsubscribeStatusRef.current();
    };
  }, [user, id]);

  // Klavye etkinliğini dinle
  useEffect(() => {
    let keyboardWillShow: any;
    let keyboardWillHide: any;

    if (Platform.OS === 'ios') {
      keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
      });
    } else {
      keyboardWillShow = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      keyboardWillHide = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
      });
    }

    return () => {
      keyboardWillShow?.remove();
      keyboardWillHide?.remove();
    };
  }, []);

  // Yazma durumunu güncelle
  const handleTyping = useCallback(() => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, []);

  // Mesaj gönderme
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !user?.uid || !id || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(id as string, user.uid, newMessage.trim());
      setNewMessage('');
      // Mesaj gönderildikten sonra otomatik kaydır
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSending(false);
    }
  }, [newMessage, user?.uid, id, isSending]);

  // Mesaj zaman formatı
  const formatMessageTime = useCallback((timestamp: any) => {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  }, []);

  // Tarih formatı (WhatsApp gibi)
  const formatDateHeader = useCallback((date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.getTime() === today.getTime()) {
      return 'Bugün';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', { 
        day: 'numeric', 
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }, []);

  // Mesajları tarih ayırıcıları ile grupla
  const groupedMessages = useMemo(() => {
    const grouped: Array<{ type: 'date' | 'message'; date?: Date; message?: Message }> = [];
    let lastDate: Date | null = null;

    messages.forEach((message) => {
      const messageDate = message.createdAt?.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
      const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
      
      if (!lastDate || lastDate.getTime() !== messageDateOnly.getTime()) {
        grouped.push({ type: 'date', date: messageDateOnly });
        lastDate = messageDateOnly;
      }
      
      grouped.push({ type: 'message', message });
    });

    return grouped;
  }, [messages]);

  // Mesaj renderleme - useCallback ile optimize edildi
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isSent = item.senderId === user?.uid;
    const senderPhoto = senderPhotos[item.senderId];
    
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isSent ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        marginVertical: 4,
        paddingHorizontal: 12,
        gap: 8,
      }}>
        {!isSent && (
          <View style={{ width: 32, height: 32, marginBottom: 4 }}>
            {senderPhoto ? (
              <Image
                source={{ uri: senderPhoto }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
                  {otherUser?.fullName?.charAt(0).toUpperCase() || otherUser?.displayName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={{
          maxWidth: '75%',
          backgroundColor: isSent ? theme.primary : theme.card,
          borderRadius: 18,
          borderBottomRightRadius: isSent ? 4 : 18,
          borderBottomLeftRadius: isSent ? 18 : 4,
          paddingHorizontal: 16,
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 2,
          elevation: 1,
        }}>
          <Text style={{ color: isSent ? '#FFFFFF' : theme.text, fontSize: 16 }}>{item.content}</Text>
          <Text style={{ color: isSent ? '#E0EFFF' : theme.placeholder, fontSize: 11, marginTop: 4, textAlign: 'right' }}>
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
        {isSent && (
          <View style={{ width: 32, height: 32, marginBottom: 4 }}>
            {senderPhoto ? (
              <Image
                source={{ uri: senderPhoto }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.primary + '30',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '600' }}>
                  {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }, [user?.uid, formatMessageTime, theme, senderPhotos, otherUser]);

  // Mesaj listesi için optimizasyon
  const keyExtractor = useCallback((item: Message) => item.id, []);
  
  // Mesaj listesi boş durumu
  const ListEmptyComponent = useMemo(() => (
    <View style={chatDetailStyles.emptyContainer}>
      <Text style={chatDetailStyles.emptyText}>
        Henüz mesaj yok. İlk mesajı siz gönderin!
      </Text>
    </View>
  ), []);

  // Modern Chat UI: Header, Mesaj Listesi, Input Bar
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 8 : StatusBar.currentHeight,
        paddingBottom: 12,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        elevation: 2,
        zIndex: 10,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        {otherUser?.photoURL ? (
          <Image source={{ uri: otherUser.photoURL }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
        ) : (
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{otherUser?.displayName?.charAt(0) || '?'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>{otherUser?.displayName || 'Kullanıcı'}</Text>
          <Text style={{ fontSize: 13, color: userStatus?.status === 'online' ? '#34C759' : theme.placeholder }}>{userStatus?.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}</Text>
        </View>
        <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 16, color: theme.text, fontSize: 16, fontWeight: '500' }}>Sohbet yükleniyor...</Text>
        </View>
      ) : (
        <>
          {/* Mesaj Listesi */}
          <FlatList
          ref={flatListRef}
          data={groupedMessages}
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return (
                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                  <View style={{
                    backgroundColor: theme.border + '40',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                  }}>
                    <Text style={{ color: theme.textDim, fontSize: 12, fontWeight: '600' }}>
                      {formatDateHeader(item.date!)}
                    </Text>
                  </View>
                </View>
              );
            }
            return renderMessage({ item: item.message! });
          }}
          keyExtractor={(item, index) => item.type === 'date' ? `date-${item.date?.getTime()}` : item.message?.id || `msg-${index}`}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 80 }}
          ListEmptyComponent={ListEmptyComponent}
          removeClippedSubviews={Platform.OS === 'android'}
        />
        </>
      )}

      {/* Mesaj Yazma Alanı */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: theme.border,
      }}>
        <TouchableOpacity style={{ marginRight: 8 }} onPress={() => setEmojiPickerVisible(true)}>
          <Ionicons name="happy-outline" size={26} color={theme.placeholder} />
        </TouchableOpacity>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#F5F5F5',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 16,
            color: theme.text,
            marginRight: 8,
          }}
          placeholder="Mesaj yaz..."
          placeholderTextColor={theme.placeholder}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity
          style={{
            backgroundColor: newMessage.trim() ? theme.primary : theme.border,
            borderRadius: 20,
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={22} color={newMessage.trim() ? '#fff' : theme.placeholder} />
        </TouchableOpacity>
      </View>

      {/* Emoji Picker Modal */}
      <Modal
        visible={emojiPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmojiPickerVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '50%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>Emoji Seç</Text>
              <TouchableOpacity onPress={() => setEmojiPickerVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Array.from(new Set([
                  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
                  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
                  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
                  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
                  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
                  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
                  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
                  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
                  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
                  '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
                  '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
                  '😾', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞',
                  '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
                  '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
                  '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃',
                  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
                  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
                  '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
                  '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
                  '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
                  '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
                  '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
                  '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️',
                  '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓',
                  '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️',
                  '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠',
                  'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂',
                  '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶',
                  '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒',
                  '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣',
                  '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '▶️', '⏸', '⏯', '⏹',
                  '⏺', '⏭', '⏮', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽',
                  '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️',
                  '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵',
                  '🎶', '➕', '➖', '➗', '✖️', '💲', '💱', '™️', '©️', '®️',
                  '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔜', '🔝', '✔️', '☑️',
                  '🔘', '⚪', '⚫', '🔴', '🔵', '🟠', '🟡', '🟢', '🟣', '🟤',
                  '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '🔳', '🔲', '▪️', '▫️',
                  '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪',
                  '🟫', '⬛', '⬜', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣',
                  '📢', '💬', '💭', '🗯', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴',
                  '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘',
                  '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢',
                  '🕣', '🕤', '🕥', '🕦', '🕧'
                ])).map((emoji, index) => (
                  <TouchableOpacity
                    key={`emoji-${index}-${emoji}`}
                    onPress={() => {
                      setNewMessage(prev => prev + emoji);
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3 Nokta Menü Modalı */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={{ position: 'absolute', right: 16, top: 60, backgroundColor: theme.surface, borderRadius: 12, paddingVertical: 8, minWidth: 160, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 }}>
            <TouchableOpacity
              style={{ paddingVertical: 12, paddingHorizontal: 20 }}
              onPress={async () => {
                setMenuVisible(false);
                Alert.alert('Sohbeti Sil', 'Bu sohbeti silmek istediğinizden emin misiniz?', [
                  { text: 'İptal', style: 'cancel' },
                  {
                    text: 'Sil', style: 'destructive', onPress: async () => {
                      if (!id || !user) return;
                      setDeleting(true);
                      try {
                        await deleteChat(id as string, user.uid);
                        router.replace('/chat');
                      } catch (e) {
                        Alert.alert('Hata', 'Sohbet silinirken bir hata oluştu.');
                      } finally {
                        setDeleting(false);
                      }
                    }
                  }
                ]);
              }}
              disabled={deleting}
            >
              <Text style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 16 }}>Sohbeti Sil</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Son görülme zamanını formatla
const formatLastSeen = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Son 1 dakika içinde
  if (diff < 60000) {
    return 'Az önce';
  }
  
  // Son 1 saat içinde
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} dakika önce`;
  }
  
  // Son 24 saat içinde
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} saat önce`;
  }
  
  // Son 7 gün içinde
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} gün önce`;
  }
  
  // Daha eski
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}; 