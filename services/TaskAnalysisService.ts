import { endOfWeek, format, startOfWeek } from 'date-fns';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUsersByIds, User } from './UserService';

// Debug flag for analytics/service logs
const ANALYTICS_DEBUG = false;
const dbg = (...args: any[]) => { try { if (ANALYTICS_DEBUG) console.log(...args); } catch {} };

// Haftalık toplam ve tamamlanan vazife: Günlük*7 + Haftalık; tamamlananlar userTaskStatuses'tan (client-side filtre)
export async function getWeeklyTaskCompletionSummaryV2(userId: string): Promise<{ total: number, completed: number }> {
  // Görev tanımlarını geniş al, client-side filtrele (index gerekmesin)
  const defsSnap = await getDocs(collection(db, 'taskDefinitions'));
  let dailyCount = 0;
  let weeklyCount = 0;
  defsSnap.forEach(d => {
    const data: any = d.data();
    if (data?.isActive) {
      if (data?.category === 'daily') dailyCount += 1;
      if (data?.category === 'weekly') weeklyCount += 1;
    }
  });
  const total = dailyCount * 7 + weeklyCount;

  // Haftanın tarih aralığı
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Kullanıcının tüm statülerini çek; kategori alanı boş olduğundan taskId'den kategori türet
  const userStatusesSnap = await getDocs(query(collection(db, 'userTaskStatuses'), where('userId', '==', userId)));

  // taskDefId -> category haritası
  const defCats: Record<string, 'daily' | 'weekly' | 'monthly' | string> = {};
  defsSnap.forEach(d => { const data: any = d.data(); defCats[d.id] = data?.category; });

  let completed = 0;
  userStatusesSnap.forEach(s => {
    const data: any = s.data();
    if (data?.status !== 'completed') return;
    const comp: Date | null = data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : null);
    if (!comp || comp < weekStart || comp > weekEnd) return;

    const rawTaskId: string | undefined = data?.taskId;
    if (!rawTaskId) return;
    let category: string | undefined;
    const parts = rawTaskId.split('_');
    for (const p of parts) { if (defCats[p]) { category = defCats[p]; break; } }
    if (!category) { if (defCats[rawTaskId]) category = defCats[rawTaskId]; }

    if (category === 'daily' || category === 'weekly') completed += 1;
  });

  return { total, completed };
}

// Yeni: Kategori bazlı (günlük/haftalık/aylık) toplam ve tamamlanan özetleri
export async function getCategoryCompletionSummary(userId: string): Promise<{
  daily: { total: number; completed: number };
  weekly: { total: number; completed: number };
  monthly: { total: number; completed: number };
}> {
  const today = new Date();

  // Günlük
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const dailyDefsSnap = await getDocs(query(collection(db, 'taskDefinitions')));
  let dailyTotal = 0;
  const defCats: Record<string, string> = {};
  dailyDefsSnap.forEach(d => { const data: any = d.data(); defCats[d.id] = data?.category; if (data?.isActive && data?.category === 'daily') dailyTotal += 1; });
  const dailyCompletedSnap = await getDocs(query(collection(db, 'userTaskStatuses'), where('userId', '==', userId)));
  let dailyCompleted = 0;
  const todayKey = format(startOfToday, 'yyyy-MM-dd');
  dailyCompletedSnap.forEach(s => {
    const data: any = s.data();
    if (data?.status !== 'completed') return;
    // userTaskStatuses.date is 'yyyy-MM-dd' string for the task's assigned day
    if (typeof data?.date !== 'string' || data.date !== todayKey) return;
    const rawTaskId: string | undefined = data?.taskId;
    if (!rawTaskId) return;
    let cat: string | undefined;
    const parts = rawTaskId.split('_');
    for (const p of parts) { if (defCats[p]) { cat = defCats[p]; break; } }
    if (!cat && defCats[rawTaskId]) cat = defCats[rawTaskId];
    if (cat === 'daily') dailyCompleted += 1;
  });

  // Haftalık
  const wStart = startOfWeek(today, { weekStartsOn: 1 });
  const wEnd = endOfWeek(today, { weekStartsOn: 1 });
  let weeklyTotal = 0;
  dailyDefsSnap.forEach(d => { const data: any = d.data(); if (data?.isActive && data?.category === 'weekly') weeklyTotal += 1; });
  let weeklyCompleted = 0;
  dailyCompletedSnap.forEach(s => {
    const data: any = s.data();
    if (data?.status !== 'completed') return;
    const comp: Date | null = data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : null);
    if (!comp || comp < wStart || comp > wEnd) return;
    const rawTaskId: string | undefined = data?.taskId;
    if (!rawTaskId) return;
    let cat: string | undefined;
    const parts = rawTaskId.split('_');
    for (const p of parts) { if (defCats[p]) { cat = defCats[p]; break; } }
    if (!cat && defCats[rawTaskId]) cat = defCats[rawTaskId];
    if (cat === 'weekly') weeklyCompleted += 1;
  });

  // Aylık
  const mStart = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
  const mEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  let monthlyTotal = 0;
  dailyDefsSnap.forEach(d => { const data: any = d.data(); if (data?.isActive && data?.category === 'monthly') monthlyTotal += 1; });
  let monthlyCompleted = 0;
  dailyCompletedSnap.forEach(s => {
    const data: any = s.data();
    if (data?.status !== 'completed') return;
    const comp: Date | null = data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : null);
    if (!comp || comp < mStart || comp > mEnd) return;
    const rawTaskId: string | undefined = data?.taskId;
    if (!rawTaskId) return;
    let cat: string | undefined;
    const parts = rawTaskId.split('_');
    for (const p of parts) { if (defCats[p]) { cat = defCats[p]; break; } }
    if (!cat && defCats[rawTaskId]) cat = defCats[rawTaskId];
    if (cat === 'monthly') monthlyCompleted += 1;
  });

  return {
    daily: { total: dailyTotal, completed: dailyCompleted },
    weekly: { total: weeklyTotal, completed: weeklyCompleted },
    monthly: { total: monthlyTotal, completed: monthlyCompleted },
  };
}

// Yeni: Son 7 gün tamamlanan sayıları (gün bazında)
export async function getLast7DaysCompletion(userId: string): Promise<number[]> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  // Last 7 day keys as 'yyyy-MM-dd'
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    keys.push(format(d, 'yyyy-MM-dd'));
  }

  // 1) Get active daily task definition ids
  const defsSnap = await getDocs(query(collection(db, 'taskDefinitions'), where('isActive', '==', true), where('category', '==', 'daily')));
  const dailyIds = new Set<string>();
  defsSnap.forEach(d => dailyIds.add(d.id));

  // 2) Get user statuses for these 7 dates (date is stored as 'yyyy-MM-dd' string in this collection)
  const statusesSnap = await getDocs(query(
    collection(db, 'userTaskStatuses'),
    where('userId', '==', userId),
    where('date', 'in', keys as any)
  ));

  // 3) Group counts by date
  const counts: Record<string, number> = Object.fromEntries(keys.map(k => [k, 0]));
  statusesSnap.forEach(s => {
    const data: any = s.data();
    const dateKey: string | undefined = typeof data?.date === 'string' ? data.date : undefined;
    const rawTaskId: string | undefined = data?.taskId;
    const status: string | undefined = data?.status;
    if (!dateKey || !keys.includes(dateKey)) return;
    if (!rawTaskId) return;

    // Derive taskDefId from taskId (may be composite like user_taskDefId_timestamp)
    let taskDefId: string | undefined = undefined;
    const parts = rawTaskId.split('_');
    for (const p of parts) {
      if (dailyIds.has(p)) { taskDefId = p; break; }
    }
    if (!taskDefId && dailyIds.has(rawTaskId)) taskDefId = rawTaskId;

    if (!taskDefId) return;
    if (status !== 'completed') return;
    counts[dateKey] = (counts[dateKey] || 0) + 1;
  });

  const result = keys.map(k => counts[k] || 0);
  try { dbg('[Analytics:getLast7] keys', keys, 'dailyTotal', dailyIds.size, 'result', result); } catch {}
  return result;
}

// Yeni: Son 30 günde en çok/az tamamlanan görevler ve streak
export async function getTopTaskInsights(userId: string): Promise<{
  bestTask: { title: string; completed: number } | null;
  worstTask: { title: string; completed: number } | null;
  leastTask: { title: string; completed: number } | null;
  streakTask: { title: string; streak: number } | null;
}> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  start.setHours(0, 0, 0, 0);

  const snap = await getDocs(query(collection(db, 'userTaskStatuses'), where('userId', '==', userId)));

  const byTask: Record<string, { count: number; days: Set<string> }> = {};
  snap.forEach(s => {
    const d = s.data() as any;
    if (d?.status !== 'completed') return;
    const comp = d.completedAt?.toDate ? d.completedAt.toDate() : (d.completedAt ? new Date(d.completedAt) : null);
    if (!comp || comp < start || comp > end) return;
    const taskId = String(d.taskDefId || d.taskId || s.id);
    if (!byTask[taskId]) byTask[taskId] = { count: 0, days: new Set() };
    byTask[taskId].count += 1;
    byTask[taskId].days.add(format(comp, 'yyyy-MM-dd'));
  });

  const taskIds = Object.keys(byTask);
  if (taskIds.length === 0) {
    return { bestTask: null, worstTask: null, leastTask: null, streakTask: null };
  }

  // Fetch titles for involved tasks
  const titles: Record<string, string> = {};
  const defsAll = await getDocs(collection(db, 'taskDefinitions'));
  defsAll.forEach(d => { const data: any = d.data(); titles[d.id] = String(data?.title || d.id); });

  // Compute best/worst/least
  const entries = taskIds.map(id => ({ id, title: titles[id] || id, completed: byTask[id].count, days: byTask[id].days }));
  entries.sort((a, b) => b.completed - a.completed);
  const best = entries[0];
  const least = entries[entries.length - 1];

  // Streak for best task (consecutive days ending today)
  let streak = 0;
  if (best) {
    const daySet = best.days;
    let cursor = new Date();
    while (true) {
      const key = format(cursor, 'yyyy-MM-dd');
      if (daySet.has(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    bestTask: best ? { title: best.title, completed: best.completed } : null,
    worstTask: least ? { title: least.title, completed: least.completed } : null,
    leastTask: least ? { title: least.title, completed: least.completed } : null,
    streakTask: best ? { title: best.title, streak } : null,
  };
}

export async function getLast7DaysDebug(userId: string): Promise<{
  keys: string[];
  dailyTaskIds: string[];
  raw: Array<{ id: string; taskId?: string; category?: string; status?: string; dateRaw?: any; dateKey?: string; completedAt?: any; inRange: boolean }>;
}> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  // Build keys for last 7 days
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    keys.push(format(d, 'yyyy-MM-dd'));
  }

  // Active daily task definitions
  const defsSnap = await getDocs(query(collection(db, 'taskDefinitions')));
  const dailyTaskIds: string[] = [];
  defsSnap.forEach(d => {
    const data: any = d.data();
    if (data?.isActive && data?.category === 'daily') dailyTaskIds.push(d.id);
  });

  // Fetch all statuses for this user (we'll filter client-side to capture string/Timestamp dates)
  const statusesSnap = await getDocs(query(collection(db, 'userTaskStatuses'), where('userId', '==', userId)));

  const raw: Array<{ id: string; taskId?: string; category?: string; status?: string; dateRaw?: any; dateKey?: string; completedAt?: any; inRange: boolean }> = [];
  statusesSnap.forEach(s => {
    const data: any = s.data();
    let dateKey: string | undefined;
    if (typeof data?.date === 'string') {
      dateKey = data.date;
    } else if (data?.date?.toDate) {
      dateKey = format(data.date.toDate(), 'yyyy-MM-dd');
    } else if (data?.completedAt?.toDate) {
      dateKey = format(data.completedAt.toDate(), 'yyyy-MM-dd');
    }
    const inRange = dateKey ? keys.includes(dateKey) : false;
    raw.push({
      id: s.id,
      taskId: data?.taskId,
      category: data?.category,
      status: data?.status,
      dateRaw: data?.date,
      dateKey,
      completedAt: data?.completedAt,
      inRange,
    });
  });

  try {
    dbg('[Analytics:debug] keys', keys);
    dbg('[Analytics:debug] dailyTaskIds', dailyTaskIds);
    dbg('[Analytics:debug] rawCount', raw.length);
    dbg('[Analytics:debug] rawInRange', raw.filter(r => r.inRange));
  } catch {}

  return { keys, dailyTaskIds, raw };
} 

// Haftalık (Pzt→bugün) kişi bazlı sıralama (sadece günlük vazifeler)
export async function getWeeklyLeaderboard(referenceDate?: Date): Promise<{
  start: Date;
  end: Date;
  daysInRange: number;
  items: Array<{
    userId: string;
    displayName: string;
    points: number;
    fullDays: number;
    completedCount: number;
  }>;
}> {
  const t0 = Date.now();
  const today = new Date();
  const base = referenceDate ? new Date(referenceDate) : today;
  const weekStart = startOfWeek(base, { weekStartsOn: 1 });
  const endCandidate = endOfWeek(base, { weekStartsOn: 1 });
  const isCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }).getTime() === weekStart.getTime();
  const weekEnd = isCurrentWeek ? (today < endCandidate ? today : endCandidate) : endCandidate;

  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(weekEnd);
  end.setHours(23, 59, 59, 999);

  const dateKeys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dateKeys.push(format(cursor, 'yyyy-MM-dd'));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Aktif günlük vazife sayısı (N)
  // Cache active daily definition IDs (TTL 10 min)
  type CacheBucket = { ids: Set<string>; expires: number };
  const globalAny: any = globalThis as any;
  if (!globalAny.__daily_defs_cache) globalAny.__daily_defs_cache = { ids: new Set<string>(), expires: 0 } as CacheBucket;
  let cache: CacheBucket = globalAny.__daily_defs_cache as CacheBucket;
  const now = Date.now();
  let tDefs0 = now, tDefs1 = now;
  if (cache.expires < now || cache.ids.size === 0) {
    tDefs0 = Date.now();
    const defsSnap = await getDocs(query(
      collection(db, 'taskDefinitions'),
      where('isActive', '==', true),
      where('category', '==', 'daily')
    ));
    tDefs1 = Date.now();
    const next = new Set<string>();
    defsSnap.forEach(d => next.add(d.id));
    cache = { ids: next, expires: now + 10 * 60 * 1000 };
    globalAny.__daily_defs_cache = cache;
  }
  const dailyDefIds = cache.ids;
  const N = dailyDefIds.size || 0;
  if (N === 0) {
    return { start, end, daysInRange: dateKeys.length, items: [] };
  }

  // Tek sorgu: userTaskStatuses (Timestamp tarih alanı) ve yalnız completed
  let tsSnap: any = { forEach: (_: any) => {} };
  const tStatus0 = Date.now();
  tsSnap = await getDocs(query(
    collection(db, 'userTaskStatuses'),
    where('status', '==', 'completed'),
    where('completedAt', '>=', Timestamp.fromDate(start)),
    where('completedAt', '<=', Timestamp.fromDate(end))
  ));
  const tStatus1 = Date.now();

  type DayMap = Record<string, number>;
  const byUser: Record<string, DayMap> = {};

  const ingest = (docs: any) => {
    docs.forEach((s: any) => {
      const data: any = s.data();
      if (data?.status !== 'completed') return; // filter client-side to drop non-completed
      const userId: string | undefined = data?.userId;
      if (!userId) return;

      let dateKey: string | undefined;
      if (typeof data?.date === 'string') {
        dateKey = data.date;
      } else if (data?.date?.toDate) {
        dateKey = format(data.date.toDate(), 'yyyy-MM-dd');
      } else if (data?.date instanceof Date) {
        dateKey = format(data.date, 'yyyy-MM-dd');
      } else if (data?.completedAt?.toDate) {
        dateKey = format(data.completedAt.toDate(), 'yyyy-MM-dd');
      }
      if (!dateKey || !dateKeys.includes(dateKey)) return;

      const rawTaskId: string | undefined = data?.taskDefId || data?.taskId;
      let taskDefId: string | undefined = rawTaskId;
      if (rawTaskId && !dailyDefIds.has(rawTaskId)) {
        const parts = rawTaskId.split('_');
        for (const p of parts) {
          if (dailyDefIds.has(p)) { taskDefId = p; break; }
        }
      }
      if (!taskDefId || !dailyDefIds.has(taskDefId)) return;

      if (!byUser[userId]) byUser[userId] = {};
      byUser[userId][dateKey] = (byUser[userId][dateKey] || 0) + 1;
    });
  };

  // Yalnız tek sorgu ingest
  ingest(tsSnap);

  const perTaskPoint = 100 / N;
  const tUsers0 = Date.now();
  const involvedUserIds = Object.keys(byUser);
  // Simple name cache with TTL (30 min) to avoid refetching across calls
  const gAny: any = globalThis as any;
  if (!gAny.__user_name_cache) gAny.__user_name_cache = { map: new Map<string, { name: string; exp: number }>() };
  const nameCache: Map<string, { name: string; exp: number }> = gAny.__user_name_cache.map;
  const nowTs = Date.now();
  const idToName: Record<string, string> = {};
  const missing: string[] = [];
  for (const uid of involvedUserIds) {
    const hit = nameCache.get(uid);
    if (hit && hit.exp > nowTs) {
      idToName[uid] = hit.name;
    } else {
      missing.push(uid);
    }
  }
  if (missing.length > 0) {
    const fetched = await getUsersByIds(missing).catch(() => [] as User[]);
    fetched.forEach(u => {
      const nm = u.displayName || u.fullName || u.email || u.id;
      idToName[u.id] = nm;
      nameCache.set(u.id, { name: nm, exp: nowTs + 30 * 60 * 1000 });
    });
  }
  const tUsers1 = Date.now();

  const items = Object.keys(byUser).map(userId => {
    const dayCounts = byUser[userId];
    let completedCount = 0;
    let fullDays = 0;
    Object.values(dayCounts).forEach(c => {
      completedCount += c;
      if (c >= N) fullDays += 1;
    });
    const rawPoints = completedCount * perTaskPoint;
    const points = Math.round(rawPoints * 100) / 100;
    return {
      userId,
      displayName: idToName[userId] || userId,
      points,
      fullDays,
      completedCount,
    };
  })
  .filter(item => item.completedCount > 0)
  .sort((a, b) => (
    b.points - a.points || b.fullDays - a.fullDays || b.completedCount - a.completedCount
  ));

  const t1 = Date.now();
  try {
    dbg('[LB] refs', { start, end, days: dateKeys.length });
    dbg('[LB] timings(ms)', {
      total: t1 - t0,
      defs: tDefs1 - tDefs0,
      comps: 0,
      statuses: tStatus1 - tStatus0,
      users: tUsers1 - tUsers0,
      ingestCount: items.length,
    });
  } catch {}
  return { start, end, daysInRange: dateKeys.length, items };
}

// Aktif günlük vazifeleri basit liste olarak getir
export async function getActiveDailyTasks(): Promise<Array<{ id: string; title: string }>> {
  const snap = await getDocs(query(
    collection(db, 'taskDefinitions'),
    where('isActive', '==', true),
    where('category', '==', 'daily')
  ));
  const items: Array<{ id: string; title: string }> = [];
  snap.forEach(d => {
    const data: any = d.data();
    items.push({ id: d.id, title: String(data?.title || d.id) });
  });
  return items;
}

// Belirli bir günlük vazife için (taskDefId) haftalık liderlik tablosu
export async function getWeeklyTaskLeaderboard(taskDefId: string, referenceDate?: Date): Promise<{
  start: Date;
  end: Date;
  daysInRange: number;
  items: Array<{
    userId: string;
    displayName: string;
    points: number;
    fullDays: number;
    completedCount: number;
  }>;
}> {
  const today = new Date();
  const base = referenceDate ? new Date(referenceDate) : today;
  const weekStart = startOfWeek(base, { weekStartsOn: 1 });
  const endCandidate = endOfWeek(base, { weekStartsOn: 1 });
  const isCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }).getTime() === weekStart.getTime();
  const weekEnd = isCurrentWeek ? (today < endCandidate ? today : endCandidate) : endCandidate;

  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(weekEnd);
  end.setHours(23, 59, 59, 999);

  const tsSnap = await getDocs(query(
    collection(db, 'userTaskStatuses'),
    where('status', '==', 'completed'),
    where('completedAt', '>=', Timestamp.fromDate(start)),
    where('completedAt', '<=', Timestamp.fromDate(end))
  ));

  const byUser: Record<string, number> = {};
  tsSnap.forEach(s => {
    const data: any = s.data();
    const uid: string | undefined = data?.userId;
    if (!uid) return;
    const raw = data?.taskDefId || data?.taskId;
    if (!raw) return;
    let matched = false;
    if (raw === taskDefId) matched = true; else if (typeof raw === 'string') matched = raw.split('_').includes(taskDefId);
    if (!matched) return;
    byUser[uid] = (byUser[uid] || 0) + 1;
  });

  const involved = Object.keys(byUser);
  const gAny: any = globalThis as any;
  if (!gAny.__user_name_cache) gAny.__user_name_cache = { map: new Map<string, { name: string; exp: number }>() };
  const nameCache: Map<string, { name: string; exp: number }> = gAny.__user_name_cache.map;
  const nowTs = Date.now();
  const idToName: Record<string, string> = {};
  const missing: string[] = [];
  for (const uid of involved) {
    const hit = nameCache.get(uid);
    if (hit && hit.exp > nowTs) idToName[uid] = hit.name; else missing.push(uid);
  }
  if (missing.length > 0) {
    const fetched = await getUsersByIds(missing).catch(() => [] as User[]);
    fetched.forEach(u => {
      const nm = u.displayName || u.fullName || u.email || u.id;
      idToName[u.id] = nm;
      nameCache.set(u.id, { name: nm, exp: nowTs + 30 * 60 * 1000 });
    });
  }

  const daysInRange = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const items = involved
    .map(uid => {
      const completedDays = byUser[uid] || 0;
      const points = completedDays * 100; // per-task: 1 gün = 100 puan
      return {
        userId: uid,
        displayName: idToName[uid] || uid,
        points,
        fullDays: completedDays,
        completedCount: completedDays,
      };
    })
    .filter(it => it.completedCount > 0)
    .sort((a, b) => b.points - a.points || b.completedCount - a.completedCount);

  return { start, end, daysInRange, items };
}