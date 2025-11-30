import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
const app = initializeApp();
const db = getFirestore(app);
const messaging = getMessaging(app);
// Trigger: on message created -> send FCM to all recipients except sender
export const onMessageCreate = onDocumentCreated('messages/{messageId}', async (event) => {
    try {
        const snap = event.data;
        if (!snap)
            return;
        const message = snap.data();
        const { chatId, senderId, content, type } = message || {};
        if (!chatId || !senderId)
            return;
        // Load chat to get participants and name
        const chatDoc = await db.doc(`chats/${chatId}`).get();
        if (!chatDoc.exists)
            return;
        const chat = chatDoc.data();
        let participantIds = (chat.participantIds || (chat.participants || []).map((p) => p.userId))
            .filter((uid) => uid !== senderId);
        // Test chat'leri için: Eğer chat adı "Test Bildirimi" ise ve participantIds boşsa, senderId'yi ekle (kendine bildirim göndermek için)
        if (!participantIds.length && chat.name === 'Test Bildirimi') {
            participantIds = [senderId];
            logger.info(`Test chat detected, sending notification to sender: ${senderId}`);
        }
        if (!participantIds.length) {
            logger.warn(`No recipients found for chat ${chatId}. Sender: ${senderId}, Participants: ${chat.participantIds?.join(', ') || 'none'}`);
            return;
        }
        // Fetch recipient tokens and user data
        const userDocs = await db.getAll(...participantIds.map(uid => db.doc(`users/${uid}`)));
        const tokens = [];
        const senderDoc = await db.doc(`users/${senderId}`).get();
        const senderData = senderDoc.data();
        const senderName = senderData?.displayName || senderData?.fullName || 'Birisi';
        logger.info(`Fetching push tokens for ${participantIds.length} recipients`);
        const iosTokens = [];
        const androidTokens = [];
        for (const ud of userDocs) {
            const d = ud.data();
            const userId = ud.id;
            // iOS token kontrolü (apnsToken veya fcmToken olarak kaydedilmiş iOS token)
            if (d?.apnsToken) {
                iosTokens.push(d.apnsToken);
                logger.info(`APNs token found for user ${userId}: ${d.apnsToken.substring(0, 20)}...`);
            }
            // Android FCM token kontrolü
            else if (d?.fcmToken) {
                // iOS token'ı fcmToken olarak kaydedilmiş olabilir, kontrol et
                // iOS token'lar genellikle 64 karakter, FCM token'lar daha uzun
                if (d.fcmToken.length < 100 && !d.fcmToken.startsWith('ExponentPushToken')) {
                    // Bu muhtemelen iOS token'ı
                    iosTokens.push(d.fcmToken);
                    logger.info(`iOS token (as fcmToken) found for user ${userId}: ${d.fcmToken.substring(0, 20)}...`);
                }
                else {
                    androidTokens.push(d.fcmToken);
                    logger.info(`FCM token found for user ${userId}: ${d.fcmToken.substring(0, 20)}...`);
                }
            }
            // Device push token (fallback)
            else if (d?.devicePushToken) {
                const tokenType = d?.devicePushType || 'unknown';
                if (tokenType === 'ios' || tokenType === 'apns') {
                    iosTokens.push(d.devicePushToken);
                    logger.info(`iOS device token found for user ${userId}: ${d.devicePushToken.substring(0, 20)}...`);
                }
                else {
                    androidTokens.push(d.devicePushToken);
                    logger.info(`Android device token found for user ${userId}: ${d.devicePushToken.substring(0, 20)}...`);
                }
            }
            else {
                logger.warn(`No push token found for user ${userId}. Available fields: ${Object.keys(d || {}).join(', ')}`);
            }
        }
        // Tüm token'ları birleştir (Firebase Admin SDK otomatik algılar)
        tokens.push(...iosTokens, ...androidTokens);
        logger.info(`Total push tokens collected: ${tokens.length} (${iosTokens.length} iOS, ${androidTokens.length} Android) out of ${participantIds.length} recipients`);
        // Firestore'da bildirim kayıtları oluştur
        const notificationBatch = db.batch();
        participantIds.forEach((recipientId) => {
            const notificationRef = db.collection('notifications').doc();
            const notificationBody = type === 'text'
                ? `${senderName}: ${(content || 'Yeni bir mesajın var').substring(0, 50)}${(content || '').length > 50 ? '...' : ''}`
                : 'Yeni bir dosya gönderildi';
            notificationBatch.set(notificationRef, {
                type: 'message',
                title: 'Yeni Mesaj',
                body: notificationBody,
                data: { chatId, type: type || 'text' },
                userId: recipientId,
                read: false,
                createdAt: FieldValue.serverTimestamp(),
                relatedId: chatId,
            });
            logger.info(`Creating notification for user ${recipientId} from sender ${senderId}`);
        });
        await notificationBatch.commit();
        logger.info(`Created ${participantIds.length} notifications for chat ${chatId}`);
        if (!iosTokens.length && !androidTokens.length) {
            logger.warn(`No push tokens available for push notification. Recipients: ${participantIds.join(', ')}`);
            logger.warn('Push notification will not be sent. Users need to register their push tokens.');
            return;
        }
        logger.info(`Sending push notification to ${iosTokens.length} iOS and ${androidTokens.length} Android devices`);
        // Basic notification payload
        const title = chat?.name || 'Yeni Mesaj';
        const body = type === 'text' ? (content || 'Yeni bir mesajın var') : 'Yeni bir dosya gönderildi';
        const allInvalidTokens = [];
        // iOS token'ları için ayrı gönderim (APNs formatında)
        if (iosTokens.length > 0) {
            logger.info(`Sending to ${iosTokens.length} iOS devices via APNs`);
            const iosPayload = {
                tokens: iosTokens,
                notification: {
                    title,
                    body,
                },
                data: {
                    chatId,
                    type: type || 'text',
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title,
                                body,
                            },
                            sound: 'default',
                            badge: 1,
                            contentAvailable: true,
                        }
                    },
                    headers: {
                        'apns-priority': '10',
                    },
                },
            };
            try {
                const iosResp = await messaging.sendEachForMulticast(iosPayload);
                logger.info(`iOS notifications sent: ${iosResp.successCount} successful, ${iosResp.failureCount} failed`);
                iosResp.responses.forEach((r, idx) => {
                    if (!r.success) {
                        const code = r.error?.errorInfo?.code || r.error?.code;
                        logger.error(`iOS notification failed for token ${iosTokens[idx].substring(0, 20)}...: ${code} - ${r.error?.message}`);
                        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
                            allInvalidTokens.push(iosTokens[idx]);
                        }
                    }
                });
            }
            catch (e) {
                logger.error('Error sending iOS notifications:', e);
            }
        }
        // Android token'ları için ayrı gönderim (FCM formatında)
        if (androidTokens.length > 0) {
            logger.info(`Sending to ${androidTokens.length} Android devices via FCM`);
            const androidPayload = {
                tokens: androidTokens,
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
                    notification: {
                        channelId: 'messages',
                        sound: 'default',
                        priority: 'high',
                        visibility: 'public',
                    },
                },
            };
            try {
                const androidResp = await messaging.sendEachForMulticast(androidPayload);
                logger.info(`Android notifications sent: ${androidResp.successCount} successful, ${androidResp.failureCount} failed`);
                androidResp.responses.forEach((r, idx) => {
                    if (!r.success) {
                        const code = r.error?.errorInfo?.code || r.error?.code;
                        logger.error(`Android notification failed for token ${androidTokens[idx].substring(0, 20)}...: ${code} - ${r.error?.message}`);
                        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
                            allInvalidTokens.push(androidTokens[idx]);
                        }
                    }
                });
            }
            catch (e) {
                logger.error('Error sending Android notifications:', e);
            }
        }
        // Geçersiz token'ları temizle
        if (allInvalidTokens.length > 0) {
            logger.info(`Cleaning up ${allInvalidTokens.length} invalid tokens`);
            const batch = db.batch();
            userDocs.forEach((ud) => {
                const d = ud.data();
                const userTokens = [
                    d?.fcmToken,
                    d?.apnsToken,
                    d?.devicePushToken,
                ].filter(Boolean);
                userTokens.forEach((token) => {
                    if (allInvalidTokens.includes(token)) {
                        if (token === d?.fcmToken) {
                            batch.update(ud.ref, { fcmToken: FieldValue.delete() });
                        }
                        if (token === d?.apnsToken) {
                            batch.update(ud.ref, { apnsToken: FieldValue.delete() });
                        }
                        if (token === d?.devicePushToken) {
                            batch.update(ud.ref, { devicePushToken: FieldValue.delete() });
                        }
                    }
                });
            });
            await batch.commit();
            logger.info(`Cleaned up invalid tokens`);
        }
    }
    catch (e) {
        logger.error('onMessageCreate error:', e);
    }
});
// Trigger: on notification created -> send FCM push notification
export const onNotificationCreate = onDocumentCreated('notifications/{notificationId}', async (event) => {
    try {
        const snap = event.data;
        if (!snap)
            return;
        const notification = snap.data();
        const { userId, title, body, type, data: notificationData } = notification || {};
        if (!userId || !title)
            return;
        // Mesaj bildirimleri için push notification gönderme (onMessageCreate zaten gönderiyor)
        if (type === 'message')
            return;
        // Get user's FCM token
        const userDoc = await db.doc(`users/${userId}`).get();
        if (!userDoc.exists)
            return;
        const userData = userDoc.data();
        const fcmToken = userData?.fcmToken;
        if (!fcmToken)
            return;
        // Determine notification channel based on type
        const channelId = type === 'urgent_announcement' ? 'urgent' : 'default';
        const priority = type === 'urgent_announcement' ? 'high' : 'normal';
        const payload = {
            tokens: [fcmToken],
            notification: {
                title,
                body,
            },
            data: {
                notificationId: snap.id,
                type: type || 'announcement',
                ...(notificationData || {}),
            },
            android: {
                priority: priority === 'high' ? 'high' : 'normal',
                notification: {
                    channelId,
                    sound: 'default',
                    priority: priority === 'high' ? 'high' : 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    }
                },
            },
        };
        await messaging.sendEachForMulticast(payload);
    }
    catch (e) {
        logger.error('onNotificationCreate error:', e);
    }
});
// Trigger: on program created -> send notifications to all users
export const onProgramCreate = onDocumentCreated('programs/{programId}', async (event) => {
    try {
        const snap = event.data;
        if (!snap)
            return;
        const program = snap.data();
        const { program: programName } = program || {};
        if (!programName)
            return;
        // Get all active users
        const usersSnapshot = await db.collection('users').where('isActive', '==', true).get();
        if (usersSnapshot.empty)
            return;
        const tokens = [];
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData?.fcmToken)
                tokens.push(userData.fcmToken);
        });
        if (!tokens.length)
            return;
        const payload = {
            tokens,
            notification: {
                title: 'Yeni Program Eklendi',
                body: `${programName} programı eklendi.`,
            },
            data: {
                type: 'program',
                programId: snap.id,
            },
            android: {
                priority: 'normal',
                notification: { channelId: 'default' },
            },
            apns: {
                payload: { aps: { sound: 'default' } },
            },
        };
        await messaging.sendEachForMulticast(payload);
    }
    catch (e) {
        logger.error('onProgramCreate error:', e);
    }
});
// Trigger: on announcement created (published or urgent) -> send notifications
export const onAnnouncementCreate = onDocumentCreated('announcements/{announcementId}', async (event) => {
    try {
        const snap = event.data;
        if (!snap)
            return;
        const announcement = snap.data();
        const { title, status, criticality } = announcement || {};
        if (!title)
            return;
        // Only send for published or urgent announcements
        if (status !== 'published' && criticality !== 'urgent')
            return;
        // Get all active users
        const usersSnapshot = await db.collection('users').where('isActive', '==', true).get();
        if (usersSnapshot.empty)
            return;
        const tokens = [];
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData?.fcmToken)
                tokens.push(userData.fcmToken);
        });
        if (!tokens.length)
            return;
        const isUrgent = criticality === 'urgent';
        const notificationTitle = isUrgent ? 'Acil Duyuru' : 'Yeni Duyuru';
        const payload = {
            tokens,
            notification: {
                title: notificationTitle,
                body: title,
            },
            data: {
                type: isUrgent ? 'urgent_announcement' : 'announcement',
                announcementId: snap.id,
            },
            android: {
                priority: isUrgent ? 'high' : 'normal',
                notification: {
                    channelId: isUrgent ? 'urgent' : 'default',
                    sound: 'default',
                    priority: isUrgent ? 'high' : 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    }
                },
            },
        };
        await messaging.sendEachForMulticast(payload);
    }
    catch (e) {
        logger.error('onAnnouncementCreate error:', e);
    }
});
