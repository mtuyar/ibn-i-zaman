import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { createProgramNotification } from './AppNotificationService';
import {
  Program,
  ProgramInput,
  ProgramStatus,
  ProgramType,
  ProgramCompletionPayload,
  RawProgramDocument,
} from '../types/program';

const PROGRAMS_COLLECTION = 'programs';
const LEGACY_COLLECTION = 'weeklyPrograms';

const CACHE_KEYS = {
  PROGRAMS: 'cache_programs',
  PROGRAMS_VERSION: 'cache_programs_version',
};

const DEFAULT_CACHE_DURATION = 1000 * 60 * 60; // 1 saat

const DAY_ORDER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const DAY_NAME_TO_INDEX: Record<string, number> = {
  Pazar: 0,
  Pazartesi: 1,
  Salı: 2,
  Çarşamba: 3,
  Perşembe: 4,
  Cuma: 5,
  Cumartesi: 6,
};

const setCache = async <T>(key: string, data: T, version: number): Promise<void> => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      version,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Önbelleğe kaydetme hatası:', error);
  }
};

const getCache = async <T>(key: string, maxAge: number = DEFAULT_CACHE_DURATION): Promise<T | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(key);
    if (!cachedData) {
      return null;
    }
    const cache = JSON.parse(cachedData);
    const now = Date.now();
    if (now - cache.timestamp > maxAge) {
      return null;
    }
    return cache.data;
  } catch (error) {
    console.error('Önbellekten alma hatası:', error);
    return null;
  }
};

const getVersion = async (key: string): Promise<number> => {
  try {
    const version = await AsyncStorage.getItem(key);
    return version ? parseInt(version, 10) : 0;
  } catch (error) {
    console.error('Sürüm bilgisi alma hatası:', error);
    return 0;
  }
};

const updateVersion = async (key: string): Promise<number> => {
  try {
    const currentVersion = await getVersion(key);
    const newVersion = currentVersion + 1;
    await AsyncStorage.setItem(key, newVersion.toString());
    return newVersion;
  } catch (error) {
    console.error('Sürüm güncelleme hatası:', error);
    return 0;
  }
};

const clearCache = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Önbellek temizleme hatası:', error);
  }
};

const timestampToDate = (value?: Timestamp | Date | null): Date => {
  if (!value) return new Date();
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if ((value as any)?.seconds) {
    return new Date((value as any).seconds * 1000);
  }
  return new Date(value as any);
};

const deriveStatus = (params: {
  status?: ProgramStatus;
  type: ProgramType;
  startDate: Date;
  endDate?: Date;
  isActive?: boolean;
}): ProgramStatus => {
  if (params.status) {
    return params.status;
  }
  const now = Date.now();
  const start = params.startDate.getTime();
  const end = params.endDate?.getTime();

  if (end && end < now) {
    return 'completed';
  }

  if (params.type === 'one_time' && start < now && !end) {
    return 'completed';
  }

  if (start > now) {
    return 'planned';
  }

  if (params.isActive === false) {
    return 'completed';
  }

  return 'ongoing';
};

const formatOccurrenceLabel = (date?: Date): string | undefined => {
  if (!date) return undefined;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const enrichProgram = (program: Program): Program => {
  const enriched: Program = { ...program };
  if (!enriched.day && enriched.type !== 'one_time') {
    enriched.day = DAY_ORDER[enriched.startDate.getDay()];
  }
  if (!enriched.time) {
    enriched.time = enriched.startDate
      ? new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(enriched.startDate)
      : undefined;
  }
  if (enriched.type === 'one_time') {
    enriched.occurrenceDateLabel = formatOccurrenceLabel(enriched.startDate);
  }
  return enriched;
};

const mapProgramDoc = (docSnap: any, isLegacy = false): Program => {
  const raw = docSnap.data() as RawProgramDocument | Record<string, any>;

  const startDate = raw.startDate ? timestampToDate(raw.startDate) : timestampToDate(raw.createdAt);
  const endDate = raw.endDate ? timestampToDate(raw.endDate) : undefined;

  const type: ProgramType = (raw.type ?? (isLegacy ? 'weekly' : 'weekly')) as ProgramType;

  const completedDetails = raw.completedDetails
    ? {
        participantCount: raw.completedDetails.participantCount ?? raw.lastAttendance ?? 0,
        leader: raw.completedDetails.leader ?? raw.responsible,
        managedBy: raw.completedDetails.managedBy ?? raw.completedDetails.leader ?? raw.responsible,
        notes: raw.completedDetails.notes ?? '',
        gallery: raw.completedDetails.gallery ?? [],
        completedAt: raw.completedDetails.completedAt ? timestampToDate(raw.completedDetails.completedAt) : undefined,
      }
    : null;

  const coverImage = raw.coverImage || raw.image || undefined;
  const gallery = raw.gallery ?? (coverImage ? [coverImage] : []);

  const program: Program = {
    id: docSnap.id,
    program: raw.program || raw.title || 'Program',
    description: raw.description,
    location: raw.location,
    icon: raw.icon || 'calendar',
    type,
    day: raw.day,
    dayOfMonth: raw.dayOfMonth,
    monthlyPattern: raw.monthlyPattern ?? null,
    monthlyWeekday: raw.monthlyWeekday ?? null,
    monthlyWeekdayOccurrence: raw.monthlyWeekdayOccurrence ?? null,
    time: raw.time,
    responsible: raw.responsible,
    lastAttendance: raw.lastAttendance,
    isActive: raw.isActive ?? true,
    status: deriveStatus({
      status: raw.status,
      type,
      startDate,
      endDate,
      isActive: raw.isActive,
    }),
    startDate,
    endDate,
    recurrence: raw.recurrence ?? null,
    scheduleNote: raw.scheduleNote,
    isArchived: raw.isArchived ?? false,
    createdAt: raw.createdAt ? timestampToDate(raw.createdAt) : startDate,
    updatedAt: raw.updatedAt ? timestampToDate(raw.updatedAt) : undefined,
    occurrenceDateLabel: raw.occurrenceDateLabel,
    coverImage,
    gallery,
    completedDetails,
  };

  return enrichProgram(program);
};

const fetchLegacyPrograms = async (): Promise<Program[]> => {
  const legacyRef = collection(db, LEGACY_COLLECTION);
  const snapshot = await getDocs(legacyRef);
  if (snapshot.empty) {
    return [];
  }
  const programs = snapshot.docs
    .map((docSnap) => mapProgramDoc(docSnap, true))
    .filter((program) => program.isActive);

  return programs.sort((a, b) => {
    return (DAY_NAME_TO_INDEX[a.day ?? 'Pazar'] ?? 99) - (DAY_NAME_TO_INDEX[b.day ?? 'Pazar'] ?? 99);
  });
};

const fetchProgramsFromFirestore = async (): Promise<Program[]> => {
  try {
    const programsRef = collection(db, PROGRAMS_COLLECTION);
    const snapshot = await getDocs(programsRef);

    if (snapshot.empty) {
      console.log('Yeni program koleksiyonunda kayıt bulunamadı, legacy veriye düşülüyor.');
      return fetchLegacyPrograms();
    }

    return snapshot.docs
      .map((docSnap) => mapProgramDoc(docSnap))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  } catch (error) {
    console.error('Programları getirme hatası:', error);
    return fetchLegacyPrograms();
  }
};

export const getAllPrograms = async (forceRefresh: boolean = false): Promise<Program[]> => {
  try {
    if (!forceRefresh) {
      const cachedPrograms = await getCache<Program[]>(CACHE_KEYS.PROGRAMS);
      if (cachedPrograms) {
        return cachedPrograms.map((item) => ({
          ...item,
          startDate: new Date(item.startDate),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          createdAt: new Date(item.createdAt),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        }));
      }
    }

    const programs = await fetchProgramsFromFirestore();
    const version = await getVersion(CACHE_KEYS.PROGRAMS_VERSION);
    await setCache(CACHE_KEYS.PROGRAMS, programs, version);
    return programs;
  } catch (error) {
    console.error('Programları getirme hatası:', error);
    return [];
  }
};

export const getLimitedPrograms = async (limit: number = 4, forceRefresh: boolean = false): Promise<Program[]> => {
  const allPrograms = await getAllPrograms(forceRefresh);
  const activePrograms = allPrograms.filter((program) => program.status !== 'completed');
  return activePrograms.slice(0, limit);
};

export const updateProgramsVersion = async (): Promise<void> => {
  await updateVersion(CACHE_KEYS.PROGRAMS_VERSION);
  await clearCache(CACHE_KEYS.PROGRAMS);
};

export const subscribeToProgramUpdates = (callback: () => void) => {
  try {
    const programsRef = collection(db, PROGRAMS_COLLECTION);
    return onSnapshot(
      programsRef,
      (snapshot) => {
        if (snapshot.docChanges().length > 0) {
          updateProgramsVersion().then(callback);
        }
      },
      (error) => {
        console.error('Program dinleme hatası:', error);
        callback();
      }
    );
  } catch (error) {
    console.error('Program aboneliği ayarlanamadı:', error);
    return () => {};
  }
};

const buildProgramPayload = (input: ProgramInput) => {
  const startDate = input.startDate ?? new Date();
  const endDate = input.endDate;
  const gallery = (input.gallery ?? []).filter(Boolean);
  const coverImage = input.coverImage ?? gallery[0] ?? null;

  return {
    program: input.program,
    description: input.description ?? '',
    location: input.location ?? '',
    icon: input.icon ?? 'calendar',
    type: input.type,
    day: input.type === 'weekly' ? input.day ?? DAY_ORDER[startDate.getDay()] : input.day ?? null,
    dayOfMonth: input.type === 'monthly' ? input.dayOfMonth ?? startDate.getDate() : input.dayOfMonth ?? null,
    monthlyPattern: input.type === 'monthly' ? input.monthlyPattern ?? null : null,
    monthlyWeekday: input.type === 'monthly' ? input.monthlyWeekday ?? null : null,
    monthlyWeekdayOccurrence: input.type === 'monthly' ? input.monthlyWeekdayOccurrence ?? null : null,
    time: input.time ?? new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(startDate),
    responsible: input.responsible ?? '',
    lastAttendance: input.lastAttendance ?? 0,
    isActive: input.isActive ?? true,
    status: deriveStatus({
      status: input.status,
      type: input.type,
      startDate,
      endDate,
      isActive: input.isActive,
    }),
    startDate: Timestamp.fromDate(startDate),
    endDate: endDate ? Timestamp.fromDate(endDate) : null,
    recurrence: input.recurrence ?? null,
    scheduleNote: input.scheduleNote ?? '',
    occurrenceDateLabel: input.type === 'one_time' ? formatOccurrenceLabel(startDate) : null,
    updatedAt: serverTimestamp(),
    coverImage,
    image: coverImage,
    gallery,
    completedDetails: input.completedDetails
      ? {
          ...input.completedDetails,
          completedAt: input.completedDetails.completedAt
            ? Timestamp.fromDate(input.completedDetails.completedAt)
            : null,
        }
      : null,
  };
};

export const addProgram = async (programData: ProgramInput): Promise<Program> => {
  try {
    const programsRef = collection(db, PROGRAMS_COLLECTION);
    const payload = {
      ...buildProgramPayload(programData),
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(programsRef, payload);
    await updateProgramsVersion();

    // Bildirim oluştur
    try {
      await createProgramNotification(programData.program, docRef.id);
    } catch (error) {
      console.error('Program bildirimi oluşturma hatası:', error);
      // Bildirim hatası program eklemeyi engellemez
    }

    return enrichProgram({
      id: docRef.id,
      ...programData,
      isActive: programData.isActive ?? true,
      status:
        programData.status ??
        deriveStatus({
          type: programData.type,
          startDate: programData.startDate,
          endDate: programData.endDate,
          isActive: programData.isActive,
        }),
      startDate: programData.startDate,
      endDate: programData.endDate,
      recurrence: programData.recurrence ?? null,
      scheduleNote: programData.scheduleNote ?? '',
      monthlyPattern: programData.monthlyPattern ?? null,
      monthlyWeekday: programData.monthlyWeekday ?? null,
      monthlyWeekdayOccurrence: programData.monthlyWeekdayOccurrence ?? null,
      coverImage: programData.coverImage,
      gallery: programData.gallery ?? (programData.coverImage ? [programData.coverImage] : []),
      completedDetails: programData.completedDetails ?? null,
      createdAt: new Date(),
    } as Program);
  } catch (error) {
    console.error('Program ekleme hatası:', error);
    throw new Error('Program eklenirken bir hata oluştu.');
  }
};

export const updateProgram = async (programId: string, programData: Partial<ProgramInput>): Promise<void> => {
  try {
    const programRef = doc(db, PROGRAMS_COLLECTION, programId);
    const payload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (programData.program !== undefined) payload.program = programData.program;
    if (programData.description !== undefined) payload.description = programData.description;
    if (programData.location !== undefined) payload.location = programData.location;
    if (programData.icon !== undefined) payload.icon = programData.icon;
    if (programData.type !== undefined) payload.type = programData.type;
    if (programData.day !== undefined) payload.day = programData.day;
    if (programData.dayOfMonth !== undefined) payload.dayOfMonth = programData.dayOfMonth;
    if (programData.monthlyPattern !== undefined) payload.monthlyPattern = programData.monthlyPattern;
    if (programData.monthlyWeekday !== undefined) payload.monthlyWeekday = programData.monthlyWeekday;
    if (programData.monthlyWeekdayOccurrence !== undefined) payload.monthlyWeekdayOccurrence = programData.monthlyWeekdayOccurrence;
    if (programData.time !== undefined) payload.time = programData.time;
    if (programData.responsible !== undefined) payload.responsible = programData.responsible;
    if (programData.lastAttendance !== undefined) payload.lastAttendance = programData.lastAttendance;
    if (programData.recurrence !== undefined) payload.recurrence = programData.recurrence;
    if (programData.scheduleNote !== undefined) payload.scheduleNote = programData.scheduleNote;
    if (programData.isActive !== undefined) payload.isActive = programData.isActive;
    if (programData.coverImage !== undefined) {
      payload.coverImage = programData.coverImage;
      payload.image = programData.coverImage;
    }
    if (programData.gallery !== undefined) payload.gallery = programData.gallery;
    if (programData.completedDetails !== undefined) {
      payload.completedDetails = programData.completedDetails
        ? {
            ...programData.completedDetails,
            completedAt: programData.completedDetails.completedAt
              ? Timestamp.fromDate(programData.completedDetails.completedAt)
              : serverTimestamp(),
          }
        : null;
    }

    if (programData.startDate) {
      payload.startDate = Timestamp.fromDate(programData.startDate);
      payload.occurrenceDateLabel = programData.type === 'one_time' ? formatOccurrenceLabel(programData.startDate) : null;
    }

    if (programData.endDate) {
      payload.endDate = Timestamp.fromDate(programData.endDate);
    }

    if (programData.status) {
      payload.status = programData.status;
    } else if (programData.startDate || programData.endDate || programData.isActive !== undefined || programData.type) {
      const start = programData.startDate ?? new Date();
      payload.status = deriveStatus({
        status: programData.status,
        type: programData.type ?? 'weekly',
        startDate: start,
        endDate: programData.endDate,
        isActive: programData.isActive,
      });
    }

    await updateDoc(programRef, payload);
    await updateProgramsVersion();
  } catch (error) {
    console.error('Program güncelleme hatası:', error);
    throw new Error('Program güncellenirken bir hata oluştu.');
  }
};

export const deleteProgram = async (programId: string): Promise<void> => {
  try {
    const programRef = doc(db, PROGRAMS_COLLECTION, programId);
    await deleteDoc(programRef);
    await updateProgramsVersion();
  } catch (error) {
    console.error('Program silme hatası:', error);
    throw new Error('Program silinirken bir hata oluştu.');
  }
};

export const completeProgram = async (programId: string, payload: ProgramCompletionPayload): Promise<void> => {
  try {
    const programRef = doc(db, PROGRAMS_COLLECTION, programId);
    const completionTimestamp = serverTimestamp();
    await updateDoc(programRef, {
      status: 'completed',
      isActive: false,
      endDate: completionTimestamp,
      updatedAt: serverTimestamp(),
      lastAttendance: payload.participantCount,
      completedDetails: {
        participantCount: payload.participantCount,
        leader: payload.leader ?? '',
        managedBy: payload.managedBy ?? payload.leader ?? '',
        notes: payload.notes ?? '',
        gallery: payload.gallery ?? [],
        completedAt: completionTimestamp,
      },
      gallery: payload.gallery ?? [],
    });
    await updateProgramsVersion();
  } catch (error) {
    console.error('Program tamamlama hatası:', error);
    throw new Error('Program tamamlanırken bir hata oluştu.');
  }
};

export type { Program, ProgramCompletionPayload } from '../types/program';