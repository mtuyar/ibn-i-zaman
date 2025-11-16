import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  AnnouncementDocument,
  AnnouncementInput,
  AnnouncementRecord,
  AnnouncementStatus,
} from '../types/announcement';

const ANNOUNCEMENTS_COLLECTION = 'announcements';

function mapDocToRecord(id: string, data: AnnouncementDocument): AnnouncementRecord {
  const toDateSafe = (value: Timestamp | undefined | null, fallback: Date = new Date()) => {
    if (!value) return fallback;
    try {
      return value.toDate();
    } catch (err) {
      console.warn('Timestamp parse error for announcement', id, err);
      return fallback;
    }
  };

  return {
    id,
    title: data.title,
    body: data.body,
    scheduleAt: toDateSafe(data.scheduleAt),
    criticality: data.criticality,
    status: data.status,
    reminderMinutesBefore: data.reminderMinutesBefore ?? null,
    hasReminder: data.hasReminder ?? false,
    createdAt: toDateSafe(data.createdAt),
    updatedAt: toDateSafe(data.updatedAt),
    createdBy: data.createdBy,
    createdByName: data.createdByName ?? null,
    urgentNotified: data.urgentNotified ?? false,
    reminderSent: data.reminderSent ?? false,
  };
}

export async function createAnnouncement(
  input: AnnouncementInput,
  user: { id: string; name?: string | null }
): Promise<AnnouncementRecord> {
  const now = serverTimestamp();
  const docRef = await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
    title: input.title,
    body: input.body,
    scheduleAt: Timestamp.fromDate(input.scheduleAt),
    criticality: input.criticality,
    status: input.status ?? 'published',
    reminderMinutesBefore: input.reminderMinutesBefore ?? null,
    hasReminder: Boolean(input.reminderMinutesBefore !== undefined && input.reminderMinutesBefore !== null),
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
    createdByName: user.name ?? null,
    urgentNotified: false,
    reminderSent: false,
  } satisfies AnnouncementDocument);

  const created = await getDoc(docRef);
  const data = created.data() as AnnouncementDocument;
  return mapDocToRecord(created.id, data);
}

export async function updateAnnouncement(
  id: string,
  data: Partial<AnnouncementInput & { status: AnnouncementStatus }>
): Promise<void> {
  const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (data.title !== undefined) payload.title = data.title;
  if (data.body !== undefined) payload.body = data.body;
  if (data.scheduleAt !== undefined) payload.scheduleAt = Timestamp.fromDate(data.scheduleAt);
  if (data.criticality !== undefined) payload.criticality = data.criticality;
  if (data.status !== undefined) payload.status = data.status;
  if (data.reminderMinutesBefore !== undefined)
    payload.reminderMinutesBefore = data.reminderMinutesBefore ?? null;
  if (data.reminderMinutesBefore !== undefined)
    payload.hasReminder = Boolean(data.reminderMinutesBefore !== null && data.reminderMinutesBefore !== undefined);

  await updateDoc(docRef, payload);
}

export async function markUrgentNotified(id: string) {
  const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
  await updateDoc(docRef, {
    urgentNotified: true,
    updatedAt: serverTimestamp(),
  });
}

export async function markReminderSent(id: string) {
  const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
  await updateDoc(docRef, {
    reminderSent: true,
    updatedAt: serverTimestamp(),
  });
}

export function watchActiveAnnouncements(
  callback: (list: AnnouncementRecord[]) => void
) {
  const q = query(
    collection(db, ANNOUNCEMENTS_COLLECTION),
    where('status', 'in', ['published', 'scheduled']),
    orderBy('scheduleAt', 'asc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const items: AnnouncementRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as AnnouncementDocument;
      items.push(mapDocToRecord(docSnap.id, data));
    });
    callback(items);
  });
}

export async function fetchPublishedAnnouncements(): Promise<AnnouncementRecord[]> {
  const q = query(
    collection(db, ANNOUNCEMENTS_COLLECTION),
    where('status', '==', 'published'),
    orderBy('scheduleAt', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as AnnouncementDocument;
    return mapDocToRecord(docSnap.id, data);
  });
}

export async function fetchUpcomingAnnouncements(): Promise<AnnouncementRecord[]> {
  const now = Timestamp.fromDate(new Date());
  const q = query(
    collection(db, ANNOUNCEMENTS_COLLECTION),
    where('status', '==', 'scheduled'),
    where('scheduleAt', '>=', now),
    orderBy('scheduleAt', 'asc'),
    limit(50)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as AnnouncementDocument;
    return mapDocToRecord(docSnap.id, data);
  });
}

export async function archivePastAnnouncements() {
  const now = Timestamp.fromDate(new Date());
  const q = query(
    collection(db, ANNOUNCEMENTS_COLLECTION),
    where('status', 'in', ['published', 'scheduled']),
    where('scheduleAt', '<', now),
    orderBy('scheduleAt', 'asc'),
    limit(200)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      status: 'archived',
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}


