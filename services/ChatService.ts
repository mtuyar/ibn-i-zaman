import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getUser } from '../services/UserService';
import { createMessageNotification } from './AppNotificationService';

// Tip tanımlamaları
export interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string;
  photoURL?: string | null;
  participantIds: string[];
  participants: {
    userId: string;
    role: 'admin' | 'member';
    joinedAt: Timestamp;
  }[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Timestamp;
    type: 'text' | 'image' | 'file';
  };
  unreadCount: {
    [userId: string]: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Only for private chats: sorted participant key for exact lookup
  privateKey?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  fileURL?: string;
  fileType?: string;
  fileSize?: number;
  readBy: {
    userId: string;
    readAt: Timestamp;
  }[];
  status: 'sent' | 'delivered' | 'read';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Mevcut sohbeti kontrol et
export const checkExistingChat = async (
  userId1: string,
  userId2: string
): Promise<string | null> => {
  try {
    // Use deterministic private key to find existing private chat in O(1)
    const [a, b] = [userId1, userId2].sort();
    const q = query(
      collection(db, 'chats'),
      where('type', '==', 'private'),
      where('privateKey', '==', `${a}_${b}`)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }

    // Fallback for legacy records without privateKey/participantIds
    const legacyQ = query(collection(db, 'chats'), where('type', '==', 'private'));
    const legacySnap = await getDocs(legacyQ);
    const found = legacySnap.docs.find(d => {
      const c: any = d.data();
      const ids: string[] = c.participantIds || (c.participants || []).map((p: any) => p.userId);
      if (!Array.isArray(ids)) return false;
      return ids.includes(userId1) && ids.includes(userId2);
    });
    return found ? found.id : null;
  } catch (error) {
    console.error('Sohbet kontrolü hatası:', error);
    throw error;
  }
};

// Sohbet oluşturma
export const createChat = async (
  type: 'private' | 'group',
  participants: string[],
  name?: string,
  photoURL?: string
): Promise<string> => {
  try {
    // Eğer özel sohbet ise, mevcut sohbeti kontrol et
    if (type === 'private') {
      const [userId1, userId2] = participants;
      const existingChatId = await checkExistingChat(userId1, userId2);
      if (existingChatId) {
        return existingChatId;
      }
    }
    
    // Eğer özel sohbet ise ve isim belirtilmemişse, diğer kullanıcının adını al
    if (type === 'private' && !name) {
      const otherUserId = participants.find(id => id !== auth.currentUser?.uid);
      if (otherUserId) {
        const otherUser = await getUser(otherUserId);
        if (otherUser) {
          name = otherUser.displayName || otherUser.fullName || 'İsimsiz Kullanıcı';
          photoURL = otherUser.photoURL;
        }
      }
    }

    const now = Timestamp.now();
    const participantIds = [...participants];
    const privateKey = type === 'private' ? [...participants].sort().join('_') : undefined;
    const chatData: Omit<Chat, 'id'> = {
      type,
      name: name || 'İsimsiz Sohbet',
      photoURL: photoURL || null,
      participantIds,
      participants: participants.map(userId => ({
        userId,
        role: 'member',
        joinedAt: now
      })),
      unreadCount: {},
      createdAt: now,
      updatedAt: now,
      privateKey
    };

    const chatRef = await addDoc(collection(db, 'chats'), chatData);
    return chatRef.id;
  } catch (error) {
    console.error('Sohbet oluşturma hatası:', error);
    throw error;
  }
};

// Sohbetleri getir - kullanıcının dahil olduğu tüm sohbetleri getirir
export const getChats = async (userId: string): Promise<Chat[]> => {
  try {
    if (!userId) {
      return [];
    }

    let uniqueChats: Chat[] = [];
    try {
      // Yeni model ile sorgu
      const q = query(
        collection(db, 'chats'),
        where('participantIds', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      uniqueChats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));

      // Eğer sonuç boşsa legacy fallback ile listeyi doldur
      if (!uniqueChats.length) {
        const allQ = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
        const allSnap = await getDocs(allQ);
        uniqueChats = allSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter((c: any) => (c.participantIds || (c.participants || []).map((p: any) => p.userId)).includes(userId));
      }
    } catch (e) {
      console.warn('getChats fell back to legacy filter due to error:', e);
      // Eski kayıtlar için fallback: hepsini çekip filtrele
      const allQ = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
      const allSnap = await getDocs(allQ);
      uniqueChats = allSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((c: any) => (c.participantIds || (c.participants || []).map((p: any) => p.userId)).includes(userId));
    }

    // Her sohbet için diğer kullanıcı bilgilerini yükle
    const enrichedChats = await Promise.all(uniqueChats.map(async (chat) => {
      // Opportunistic migration: ensure participantIds/privateKey exist
      try {
        const needsIds = !Array.isArray((chat as any).participantIds) || (chat as any).participantIds.length === 0;
        const needsKey = chat.type === 'private' && !(chat as any).privateKey;
        if (needsIds || needsKey) {
          const derivedIds = (chat as any).participantIds || (chat.participants || []).map((p: any) => p.userId);
          const derivedKey = chat.type === 'private' ? [...derivedIds].sort().join('_') : undefined;
          const update: any = {};
          if (needsIds) update.participantIds = derivedIds;
          if (needsKey) update.privateKey = derivedKey;
          await updateDoc(doc(db, 'chats', chat.id), update);
          (chat as any).participantIds = derivedIds;
          if (derivedKey) (chat as any).privateKey = derivedKey;
        }
      } catch {}
      if (chat.type === 'private') {
        const otherParticipant = chat.participants.find(p => p.userId !== userId);
        if (otherParticipant) {
          try {
            const otherUser = await getUser(otherParticipant.userId);
            if (otherUser) {
              chat.name = otherUser.displayName || otherUser.fullName || 'İsimsiz Kullanıcı';
              chat.photoURL = otherUser.photoURL;
            } else {
              chat.name = 'İsimsiz Kullanıcı';
              chat.photoURL = null;
            }
          } catch (error) {
            chat.name = 'İsimsiz Kullanıcı';
            chat.photoURL = null;
          }
        }
      }
      return chat;
    }));

    // Son mesajlara göre sırala
    enrichedChats.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis() || 0;
      const bTime = b.updatedAt?.toMillis() || 0;
      return bTime - aTime;
    });

    return enrichedChats;
  } catch (error) {
    console.error('Sohbetleri getirme hatası:', error);
    throw error;
  }
};

// Mesaj gönderme
export const sendMessage = async (
  chatId: string,
  senderId: string,
  content: string,
  type: 'text' | 'image' | 'file' = 'text',
  fileURL?: string,
  fileType?: string,
  fileSize?: number
): Promise<string> => {
  try {
    const now = Timestamp.now();
    
    // Temel mesaj verisi
    const messageData = {
      chatId,
      senderId,
      content,
      type,
      readBy: [{
        userId: senderId,
        readAt: now
      }],
      status: 'sent',
      createdAt: now,
      updatedAt: now
    };

    // Dosya bilgilerini sadece gerekli olduğunda ekle
    if (type === 'file' || type === 'image') {
      const msg = messageData as any;
      if (fileURL) msg.fileURL = fileURL;
      if (fileType) msg.fileType = fileType;
      if (fileSize) msg.fileSize = fileSize;
    }

    // Mesajı ekle
    const messageRef = await addDoc(collection(db, 'messages'), messageData);

    // Sohbeti güncelle
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      const chatData = chatDoc.data();
      const unreadCount = chatData.unreadCount || {};
      
      // Tüm katılımcılar için okunmamış mesaj sayısını güncelle
      chatData.participants.forEach((participant: { userId: string }) => {
        if (participant.userId !== senderId) {
          unreadCount[participant.userId] = (unreadCount[participant.userId] || 0) + 1;
        } else {
          unreadCount[participant.userId] = 0;
        }
      });

      await updateDoc(chatRef, {
        lastMessage: {
          content,
          senderId,
          timestamp: now,
          type
        },
        updatedAt: now,
        unreadCount
      });

      // Bildirim oluştur (Cloud Functions yedek olarak client-side'da da oluştur)
      // Cloud Functions deploy edilmişse orada da oluşturulacak, bu yedek olarak çalışır
      try {
        console.log('ChatService: Bildirim oluşturma başlatılıyor...');
        const sender = await getUser(senderId);
        const senderName = sender?.displayName || sender?.fullName || 'Birisi';
        console.log('ChatService: Gönderen bilgisi alındı:', senderName);
        
        const recipients = chatData.participants.filter((participant: { userId: string }) => participant.userId !== senderId);
        console.log('ChatService: Alıcı sayısı:', recipients.length, recipients.map((p: any) => p.userId));
        
        if (recipients.length === 0) {
          console.log('ChatService: Alıcı yok, bildirim oluşturulmayacak');
        } else {
          // Tüm bildirimleri paralel oluştur
          const notificationPromises = recipients.map((participant: { userId: string }) => {
            console.log(`ChatService: Bildirim oluşturuluyor - userId: ${participant.userId}`);
            return createMessageNotification(
              participant.userId,
              senderName,
              content,
              chatId
            ).catch((error) => {
              console.error(`ChatService: Bildirim oluşturma hatası (userId: ${participant.userId}):`, error);
              // Hata olsa bile devam et
            });
          });
          
          await Promise.all(notificationPromises);
          console.log(`ChatService: ${notificationPromises.length} bildirim oluşturuldu`);
        }
      } catch (error) {
        console.error('ChatService: Bildirim oluşturma genel hatası:', error);
        // Bildirim hatası mesaj göndermeyi engellemez
      }
    }

    return messageRef.id;
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    throw error;
  }
};

// Mesajları getir - bellekte önbelleğe alma işlemi ile optimize edildi
const messagesCache = new Map<string, {messages: Message[], timestamp: number}>();
const CACHE_DURATION = 30000; // 30 saniye

// Genel mesaj güncelleme dinleyicisi - uygulama herhangi bir sayfadayken yeni mesajları alır
const chatUpdateListeners = new Map<string, (messages: Message[]) => void>();
const globalMessageSubscriptions = new Map<string, () => void>();

// Global mesaj dinleme sistemi
export const initializeGlobalMessageListener = (userId: string) => {
  // Önce kullanıcının tüm sohbetlerini al
  getChats(userId).then(chats => {
    chats.forEach(chat => {
      // Her sohbet için bir dinleyici oluştur
      if (!globalMessageSubscriptions.has(chat.id)) {
        const q = query(
          collection(db, 'messages'),
          where('chatId', '==', chat.id),
          orderBy('createdAt', 'asc')
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              chatId: data.chatId,
              senderId: data.senderId,
              content: data.content,
              type: data.type || 'text',
              readBy: data.readBy || [],
              status: data.status || 'sent',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              fileURL: data.fileURL,
              fileType: data.fileType,
              fileSize: data.fileSize
            } as Message;
          });

          // Mesajları önbelleğe al
          messagesCache.set(chat.id, {
            messages,
            timestamp: Date.now()
          });
          
          // Dinleyicileri bilgilendir
          const callback = chatUpdateListeners.get(chat.id);
          if (callback) {
            callback(messages);
          }
        }, (error) => {
          console.error('Messages listener error for chat', chat.id, error);
        });
        
        globalMessageSubscriptions.set(chat.id, unsubscribe);
      }
    });
  });
  
  return () => {
    // Tüm dinleyicileri temizle
    globalMessageSubscriptions.forEach(unsubscribe => {
      unsubscribe();
    });
    globalMessageSubscriptions.clear();
  };
};

// Yeni sohbet oluşturulduğunda global dinleyiciye ekle
export const addChatToGlobalListener = (chatId: string, userId: string) => {
  if (!globalMessageSubscriptions.has(chatId)) {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          chatId: data.chatId,
          senderId: data.senderId,
          content: data.content,
          type: data.type || 'text',
          readBy: data.readBy || [],
          status: data.status || 'sent',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          fileURL: data.fileURL,
          fileType: data.fileType,
          fileSize: data.fileSize
        } as Message;
      });

      // Mesajları önbelleğe al
      messagesCache.set(chatId, {
        messages,
        timestamp: Date.now()
      });
      
      // Dinleyicileri bilgilendir
      const callback = chatUpdateListeners.get(chatId);
      if (callback) {
        callback(messages);
      }
    }, (error) => {
      console.error('Messages listener error for chat', chatId, error);
    });
    
    globalMessageSubscriptions.set(chatId, unsubscribe);
  }
};

export const getMessages = async (
  chatId: string,
  limitCount: number = 50,
  lastMessageId?: string
): Promise<Message[]> => {
  try {
    if (!chatId) {
      return [];
    }
    
    // Önbellek kontrolü (sadece ilk sayfa için)
    if (!lastMessageId) {
      const cachedData = messagesCache.get(chatId);
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        return cachedData.messages;
      }
    }

    // Önce sohbetin var olduğunu kontrol et
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      return [];
    }

    // Mesajları getir
    let q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );

    if (lastMessageId) {
      const lastMessageDoc = await getDoc(doc(db, 'messages', lastMessageId));
      if (lastMessageDoc.exists()) {
        q = query(
          collection(db, 'messages'),
          where('chatId', '==', chatId),
          orderBy('createdAt', 'asc'),
          startAfter(lastMessageDoc),
          limit(limitCount)
        );
      }
    }

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return [];
    }

    const messages = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        chatId: data.chatId,
        senderId: data.senderId,
        content: data.content,
        type: data.type || 'text',
        readBy: data.readBy || [],
        status: data.status || 'sent',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        fileURL: data.fileURL,
        fileType: data.fileType,
        fileSize: data.fileSize
      } as Message;
    });

    // Önbelleğe alma (sadece ilk sayfa için)
    if (!lastMessageId) {
      messagesCache.set(chatId, {
        messages,
        timestamp: Date.now()
      });
    }

    return messages;
  } catch (error) {
    console.error('Mesajları getirme hatası:', error);
    throw error;
  }
};

// Mesajı okundu olarak işaretle - batch işlemi ile optimize edildi
export const markMessageAsRead = async (chatId: string, userId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      const chatData = chatDoc.data();
      const unreadCount = chatData.unreadCount || {};
      
      // Kullanıcının okunmamış mesaj sayısını sıfırla
      if (unreadCount[userId] > 0) {
        unreadCount[userId] = 0;
        
        // Sohbeti güncelle
        await updateDoc(chatRef, { unreadCount });
      }

      // Okunmamış mesajları bul ve okundu olarak işaretle
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('chatId', '==', chatId),
        where('senderId', '!=', userId)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let updateNeeded = false;
      const now = Timestamp.now();

      querySnapshot.docs.forEach((doc) => {
        const messageData = doc.data();
        const readBy = messageData.readBy || [];
        
        if (!readBy.some((read: any) => read.userId === userId)) {
          updateNeeded = true;
          batch.update(doc.ref, {
            readBy: [...readBy, { userId, readAt: now }],
            status: 'read'
          });
        }
      });

      if (updateNeeded) {
        await batch.commit();
      }
    }
  } catch (error) {
    console.error('Mesaj okundu işaretleme hatası:', error);
    throw error;
  }
};

// Sohbetleri dinle - mekanizma optimize edildi
export const subscribeToChats = (
  userId: string,
  callback: (chats: Chat[]) => void
) => {
  const primaryQ = query(
    collection(db, 'chats'),
    where('participantIds', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  const primaryUnsub = onSnapshot(primaryQ, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
    if (chats.length > 0) {
      callback(chats);
    } else {
      // Legacy fallback listener
      const legacyQ = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
      const legacyUnsub = onSnapshot(legacyQ, (snap) => {
        const legacy = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter((c: any) => (c.participantIds || (c.participants || []).map((p: any) => p.userId)).includes(userId));
        callback(legacy as Chat[]);
      }, (error) => {
        console.error('Sohbet dinleyici hatası (legacy):', error);
      });
      // Return a composite unsubscribe if we installed legacy listener
      const combined = () => {
        try { legacyUnsub(); } catch {}
        try { primaryUnsub(); } catch {}
      };
      // Replace original unsubscribe with combined
      (combined as any).__isCombined = true;
    }
  }, (error) => {
    console.error('Sohbet dinleyici hatası (primary):', error);
  });

  return primaryUnsub;
};

// Mesajları dinle - performans için optimize edildi
const messageListeners = new Map<string, {unsubscribe: () => void, userIds: Set<string>}>();

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: Message[]) => void,
  currentUserId?: string
) => {
  if (!chatId) {
    return () => {};
  }
  
  // Callback'i mesaj güncelleme dinleyicileri listesine ekle
  chatUpdateListeners.set(chatId, callback);
  
  // Eğer global dinleyici yoksa, oluştur
  if (!globalMessageSubscriptions.has(chatId) && currentUserId) {
    addChatToGlobalListener(chatId, currentUserId);
  }
  
  // Önce mevcut mesajları getir (önbellekten veya API'den)
  getMessages(chatId, 50).then(messages => {
    callback(messages);
  });
  
  // Temizleme fonksiyonu
  return () => {
    // Callback'i dinleyici listesinden çıkar
    chatUpdateListeners.delete(chatId);
    
    // Global dinleyicileri temizleme işlemi, uygulama kapandığında yapılacak,
    // burada özellikle silmiyoruz çünkü arka planda çalışmaya devam etmeli
  };
};

export const getChat = async (chatId: string): Promise<Chat> => {
  try {
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) {
      throw new Error('Chat not found');
    }
    return { id: chatDoc.id, ...chatDoc.data() } as Chat;
  } catch (error) {
    console.error('Error getting chat:', error);
    throw error;
  }
};

// Test fonksiyonu - tüm sohbetleri kontrol et
export const debugAllChats = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'chats'));

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log('\nSohbet ID:', doc.id);
      console.log('Sohbet verisi:', JSON.stringify(data, null, 2));
    });
  } catch (error) {
    console.error('Hata:', error);
  }
};

// Sohbet silme fonksiyonu
export const deleteChat = async (chatId: string, userId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Sohbet bulunamadı');
    }

    const chatData = chatDoc.data();
    const isParticipant = chatData.participants.some(
      (p: { userId: string }) => p.userId === userId
    );

    if (!isParticipant) {
      throw new Error('Bu sohbeti silme yetkiniz yok');
    }

    // Önce mesajları sil
    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Sonra sohbeti sil
    await deleteDoc(chatRef);
  } catch (error) {
    console.error('Sohbet silme hatası:', error);
    throw error;
  }
}; 