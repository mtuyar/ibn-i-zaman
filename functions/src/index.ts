import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

const app = initializeApp();
const db = getFirestore(app);
const messaging = getMessaging(app);

// Trigger: on message created -> send FCM to all recipients except sender
export const onMessageCreate = onDocumentCreated('messages/{messageId}', async (event) => {
  try {
    const snap = event.data;
    if (!snap) return;
    const message = snap.data() as any;
      const { chatId, senderId, content, type } = message || {};
      if (!chatId || !senderId) return;

      // Load chat to get participants and name
      const chatDoc = await db.doc(`chats/${chatId}`).get();
      if (!chatDoc.exists) return;
      const chat = chatDoc.data() as any;

      const participantIds: string[] = (chat.participantIds || (chat.participants || []).map((p: any) => p.userId))
        .filter((uid: string) => uid !== senderId);
      if (!participantIds.length) return;

      // Fetch recipient tokens
      const userDocs = await db.getAll(...participantIds.map(uid => db.doc(`users/${uid}`)));
      const tokens: string[] = [];
      for (const ud of userDocs) {
        const d = ud.data() as any;
        if (d?.fcmToken) tokens.push(d.fcmToken);
      }
      if (!tokens.length) return;

      // Basic notification payload
      const title = chat?.name || 'Yeni Mesaj';
      const body = type === 'text' ? (content || 'Yeni bir mesajın var') : 'Yeni bir dosya gönderildi';

      const payload: MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: {
          chatId,
          type: type || 'text',
        },
        android: {
          priority: 'high',
          notification: { channelId: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default' } },
        },
      };

      const resp = await messaging.sendEachForMulticast(payload);
      // Optionally clean invalid tokens
      const invalid: string[] = [];
      resp.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = (r.error as any)?.errorInfo?.code || r.error?.code;
          if (code === 'messaging/registration-token-not-registered') {
            invalid.push(tokens[idx]);
          }
        }
      });
      if (invalid.length) {
        const batch = db.batch();
        userDocs.forEach((ud) => {
          const d = ud.data() as any;
          if (d?.fcmToken && invalid.includes(d.fcmToken)) {
            batch.update(ud.ref, { fcmToken: FieldValue.delete() });
          }
        });
        await batch.commit();
      }
  } catch (e) {
    logger.error('onMessageCreate error:', e as any);
  }
});


