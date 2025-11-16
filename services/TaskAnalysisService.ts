import { endOfWeek, format, startOfWeek, endOfMonth, startOfMonth } from 'date-fns';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUsersByIds, User } from './UserService';

// Debug flag for analytics/service logs
const ANALYTICS_DEBUG = false;
const dbg = (...args: any[]) => { try { if (ANALYTICS_DEBUG) console.log(...args); } catch {} };

// Haftalık toplam ve tamamlanan vazife: Günlük*7 + Haftalık; tamamlananlar date field bazlı
export async function getWeeklyTaskCompletionSummaryV2(userId: string): Promise<{ total: number, completed: number }> {
  // Görev tanımlarını al
  const defsSnap = await getDocs(collection(db, 'taskDefinitions'));
  let dailyCount = 0;
  let weeklyCount = 0;
  const defCats: Record<string, 'daily' | 'weekly' | 'monthly' | string> = {};
  
  defsSnap.forEach(d => {
    const data: any = d.data();
    defCats[d.id] = data?.category;
    if (data?.isActive) {
      if (data?.category === 'daily') dailyCount += 1;
      if (data?.category === 'weekly') weeklyCount += 1;
    }
  });
  const total = dailyCount * 7 + weeklyCount;

  // Haftanın tarih aralığı (Pzt-Paz)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  // Haftanın tüm günlerinin date keys'i
  const dateKeys: string[] = [];
  const cursor = new Date(weekStart);
  while (cursor <= weekEnd) {
    dateKeys.push(format(cursor, 'yyyy-MM-dd'));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Kullanıcının completed görevlerini çek
  const userStatusesSnap = await getDocs(query(
    collection(db, 'userTaskStatuses'), 
    where('userId', '==', userId),
    where('status', '==', 'completed')
  ));

  let completed = 0;
  userStatusesSnap.forEach(s => {
    const data: any = s.data();
    
    // Görevin ATANDIĞI tarihe bak (date field)
    let dateKey: string | undefined;
    if (typeof data?.date === 'string') {
      dateKey = data.date;
    } else if (data?.date?.toDate) {
      dateKey = format(data.date.toDate(), 'yyyy-MM-dd');
    } else if (data?.date instanceof Date) {
      dateKey = format(data.date, 'yyyy-MM-dd');
    }
    
    // Hafta içinde değilse atla
    if (!dateKey || !dateKeys.includes(dateKey)) return;

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
  
  // Haftanın date keys'i
  const weekKeys: string[] = [];
  const wCursor = new Date(wStart);
  while (wCursor <= wEnd) {
    weekKeys.push(format(wCursor, 'yyyy-MM-dd'));
    wCursor.setDate(wCursor.getDate() + 1);
  }
  
  let weeklyTotal = 0;
  dailyDefsSnap.forEach(d => { const data: any = d.data(); if (data?.isActive && data?.category === 'weekly') weeklyTotal += 1; });
  let weeklyCompleted = 0;
  dailyCompletedSnap.forEach(s => {
    const data: any = s.data();
    if (data?.status !== 'completed') return;
    
    // Görevin ATANDIĞI tarihe bak (date field)
    let dateKey: string | undefined;
    if (typeof data?.date === 'string') {
      dateKey = data.date;
    } else if (data?.date?.toDate) {
      dateKey = format(data.date.toDate(), 'yyyy-MM-dd');
    } else if (data?.date instanceof Date) {
      dateKey = format(data.date, 'yyyy-MM-dd');
    }
    
    if (!dateKey || !weekKeys.includes(dateKey)) return;
    
    const rawTaskId: string | undefined = data?.taskId;
    if (!rawTaskId) return;
    let cat: string | undefined;
    const parts = rawTaskId.split('_');
    for (const p of parts) { if (defCats[p]) { cat = defCats[p]; break; } }
    if (!cat && defCats[rawTaskId]) cat = defCats[rawTaskId];
    if (cat === 'weekly') weeklyCompleted += 1;
  });

  // Aylık
  const mStart = startOfMonth(today);
  const mEnd = endOfMonth(today);
  
  // Ayın date keys'i
  const monthKeys: string[] = [];
  const mCursor = new Date(mStart);
  while (mCursor <= mEnd) {
    monthKeys.push(format(mCursor, 'yyyy-MM-dd'));
    mCursor.setDate(mCursor.getDate() + 1);
  }
  
  let monthlyTotal = 0;
  dailyDefsSnap.forEach(d => { const data: any = d.data(); if (data?.isActive && data?.category === 'monthly') monthlyTotal += 1; });
  let monthlyCompleted = 0;
  dailyCompletedSnap.forEach(s => {
    const data: any = s.data();
    if (data?.status !== 'completed') return;
    
    // Görevin ATANDIĞI tarihe bak (date field)
    let dateKey: string | undefined;
    if (typeof data?.date === 'string') {
      dateKey = data.date;
    } else if (data?.date?.toDate) {
      dateKey = format(data.date.toDate(), 'yyyy-MM-dd');
    } else if (data?.date instanceof Date) {
      dateKey = format(data.date, 'yyyy-MM-dd');
    }
    
    if (!dateKey || !monthKeys.includes(dateKey)) return;
    
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

// Bu haftanın tamamlanan vazife sayıları (Pazartesi'den bugüne kadar)
export async function getLast7DaysCompletion(userId: string): Promise<number[]> {
  const today = new Date();
  
  // Haftanın başlangıcı (Pazartesi)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  weekStart.setHours(0, 0, 0, 0);
  
  // Haftanın tüm günleri (Pzt-Paz) için keys oluştur
  const allKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    allKeys.push(format(d, 'yyyy-MM-dd'));
  }
  
  // Bugüne kadar olan günlerin keys'i (query için)
  const todayKey = format(today, 'yyyy-MM-dd');
  const todayIndex = allKeys.indexOf(todayKey);
  const activeKeys = allKeys.slice(0, todayIndex + 1); // Pazartesi'den bugüne kadar

  // 1) Get active daily task definition ids
  const defsSnap = await getDocs(query(collection(db, 'taskDefinitions'), where('isActive', '==', true), where('category', '==', 'daily')));
  const dailyIds = new Set<string>();
  defsSnap.forEach(d => dailyIds.add(d.id));

  // 2) Get user statuses for this week's active dates
  let statusesSnap: any;
  if (activeKeys.length > 0) {
    // Firestore 'in' query max 10 item, bizim max 7 olduğu için sorun yok
    statusesSnap = await getDocs(query(
      collection(db, 'userTaskStatuses'),
      where('userId', '==', userId),
      where('date', 'in', activeKeys as any)
    ));
  } else {
    statusesSnap = { forEach: () => {} }; // Empty result
  }

  // 3) Group counts by date
  const counts: Record<string, number> = Object.fromEntries(allKeys.map(k => [k, 0]));
  statusesSnap.forEach((s: any) => {
    const data: any = s.data();
    const dateKey: string | undefined = typeof data?.date === 'string' ? data.date : undefined;
    const rawTaskId: string | undefined = data?.taskId;
    const status: string | undefined = data?.status;
    if (!dateKey || !activeKeys.includes(dateKey)) return;
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

  // Return 7 günlük array: Geçmiş günler dolu, gelecek günler 0
  const result = allKeys.map(k => counts[k] || 0);
  try { dbg('[Analytics:ThisWeek] keys', allKeys, 'activeKeys', activeKeys, 'result', result); } catch {}
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
  taskCount: number;
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
  
  // Hafta sonu sorunu düzeltildi: Tüm haftalar için tam hafta (Pazar dahil)
  const weekEnd = endCandidate;

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
    return { start, end, daysInRange: dateKeys.length, taskCount: 0, items: [] };
  }

  // Tek sorgu: userTaskStatuses - hafta içi + birkaç gün sonrası
  // (Çünkü kullanıcı hafta içindeki bir gün için vazife atayıp daha sonra tamamlayabilir)
  let tsSnap: any = { forEach: (_: any) => {} };
  const tStatus0 = Date.now();
  const queryEnd = new Date(end);
  queryEnd.setDate(queryEnd.getDate() + 3); // Hafta sonundan 3 gün sonrasına kadar
  queryEnd.setHours(23, 59, 59, 999);
  
  tsSnap = await getDocs(query(
    collection(db, 'userTaskStatuses'),
    where('status', '==', 'completed'),
    where('completedAt', '>=', Timestamp.fromDate(start)),
    where('completedAt', '<=', Timestamp.fromDate(queryEnd))
  ));
  const tStatus1 = Date.now();

  type DayMap = Record<string, number>;
  const byUser: Record<string, DayMap> = {};

  const ingest = (docs: any) => {
    docs.forEach((s: any) => {
      const data: any = s.data();
      if (data?.status !== 'completed') return;
      const userId: string | undefined = data?.userId;
      if (!userId) return;

      // ÖNEMLİ: Görevin ATANDIĞI tarihe bakıyoruz (date field), tamamlandığı değil!
      // Çünkü kullanıcı Pazar günü için vazife atayıp Pazartesi tamamlasa, Pazar'a sayılmalı
      let dateKey: string | undefined;
      if (typeof data?.date === 'string') {
        dateKey = data.date;
      } else if (data?.date?.toDate) {
        dateKey = format(data.date.toDate(), 'yyyy-MM-dd');
      } else if (data?.date instanceof Date) {
        dateKey = format(data.date, 'yyyy-MM-dd');
      } else if (data?.completedAt?.toDate) {
        // Fallback: Eğer date yoksa completedAt'e bak
        dateKey = format(data.completedAt.toDate(), 'yyyy-MM-dd');
      }
      if (!dateKey) return;
      
      // Görevin atandığı tarih hafta içinde mi kontrol et
      if (!dateKeys.includes(dateKey)) return;

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
    
    // Her gün için kontrol et
    Object.values(dayCounts).forEach(c => {
      completedCount += c;
      // Bir günde tüm günlük vazifeler tamamlanmışsa tam gün sayılır
      if (c >= N) fullDays += 1;
    });
    
    // Eski puanlama sistemi: toplam tamamlanan görev * puan per görev
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
    dbg('[LB] dateKeys', dateKeys);
    dbg('[LB] byUser sample', Object.keys(byUser).slice(0, 2).map(uid => ({
      userId: uid,
      dayCounts: byUser[uid]
    })));
    dbg('[LB] timings(ms)', {
      total: t1 - t0,
      defs: tDefs1 - tDefs0,
      comps: 0,
      statuses: tStatus1 - tStatus0,
      users: tUsers1 - tUsers0,
      ingestCount: items.length,
    });
  } catch {}
  return { start, end, daysInRange: dateKeys.length, taskCount: N, items };
}

export async function getMonthlyLeaderboard(referenceDate?: Date): Promise<{
  start: Date;
  end: Date;
  daysInRange: number;
  taskCount: number;
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
  const monthStart = startOfMonth(base);
  const monthEndCandidate = endOfMonth(base);
  const isCurrentMonth = monthStart.getFullYear() === startOfMonth(today).getFullYear() && monthStart.getMonth() === startOfMonth(today).getMonth();
  const monthEnd = isCurrentMonth ? (today < monthEndCandidate ? today : monthEndCandidate) : monthEndCandidate;

  const start = new Date(monthStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(monthEnd);
  end.setHours(23, 59, 59, 999);

  // Ayın tüm günlerini oluştur
  const dateKeys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dateKeys.push(format(cursor, 'yyyy-MM-dd'));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Aktif günlük vazife sayısı (N) - Aylık gösterim günlük vazifelere bakar!
  type CacheBucket = { ids: Set<string>; expires: number };
  const globalAny: any = globalThis as any;
  if (!globalAny.__daily_defs_cache) globalAny.__daily_defs_cache = { ids: new Set<string>(), expires: 0 } as CacheBucket;
  let cache: CacheBucket = globalAny.__daily_defs_cache as CacheBucket;
  const now = Date.now();
  if (cache.expires < now || cache.ids.size === 0) {
    const defsSnap = await getDocs(query(
      collection(db, 'taskDefinitions'),
      where('isActive', '==', true),
      where('category', '==', 'daily')
    ));
    const next = new Set<string>();
    defsSnap.forEach(d => next.add(d.id));
    cache = { ids: next, expires: now + 10 * 60 * 1000 };
    globalAny.__daily_defs_cache = cache;
  }
  const dailyDefIds = cache.ids;
  const N = dailyDefIds.size || 0;
  
  const daysInRange = dateKeys.length;
  
  if (N === 0) {
    return { start, end, daysInRange, taskCount: 0, items: [] };
  }

  // Ayın tarih aralığındaki tüm tamamlanan günlük görevleri getir
  const statusesSnap = await getDocs(query(
    collection(db, 'userTaskStatuses'),
    where('status', '==', 'completed'),
    where('completedAt', '>=', Timestamp.fromDate(start)),
    where('completedAt', '<=', Timestamp.fromDate(end))
  ));

  type DayMap = Record<string, number>;
  const byUser: Record<string, DayMap> = {};

  statusesSnap.forEach(s => {
    const data: any = s.data();
    if (data?.status !== 'completed') return;
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
    if (!dateKey) return;
    
    // Tarih kontrolü: görevin atandığı tarih ay içinde mi?
    if (!dateKeys.includes(dateKey)) return;

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

  const involvedUserIds = Object.keys(byUser);
  if (involvedUserIds.length === 0) {
    return { start, end, daysInRange, taskCount: N, items: [] };
  }

  // İsim cache
  if (!globalAny.__user_name_cache) globalAny.__user_name_cache = { map: new Map<string, { name: string; exp: number }>() };
  const nameCache: Map<string, { name: string; exp: number }> = globalAny.__user_name_cache.map;
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

  // Puanlama: Her görev 100/N puan, aylık toplam hesapla
  const perTaskPoint = 100 / N;
  const items = involvedUserIds
    .map(userId => {
      const dayCounts = byUser[userId];
      let completedCount = 0;
      let fullDays = 0;
      
      // Her gün için kontrol et
      Object.values(dayCounts).forEach(c => {
        completedCount += c;
        // Bir günde tüm günlük vazifeler tamamlanmışsa tam gün sayılır
        if (c >= N) fullDays += 1;
      });
      
      // Aylık toplam puan: tamamlanan vazife sayısı * vazife başına puan
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

  return { start, end, daysInRange, taskCount: N, items };
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
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 });

  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(weekEnd);
  end.setHours(23, 59, 59, 999);

  // Hafta içi + 3 gün sonrasına kadar (geç tamamlananlar için)
  const queryEnd = new Date(end);
  queryEnd.setDate(queryEnd.getDate() + 3);
  queryEnd.setHours(23, 59, 59, 999);

  // Haftanın günleri
  const dateKeys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dateKeys.push(format(cursor, 'yyyy-MM-dd'));
    cursor.setDate(cursor.getDate() + 1);
  }

  const tsSnap = await getDocs(query(
    collection(db, 'userTaskStatuses'),
    where('status', '==', 'completed'),
    where('completedAt', '>=', Timestamp.fromDate(start)),
    where('completedAt', '<=', Timestamp.fromDate(queryEnd))
  ));

  // GÜN BAZINDA say - bir gün için max 1 kere
  const byUser: Record<string, Set<string>> = {}; // userId -> Set of dates
  tsSnap.forEach(s => {
    const data: any = s.data();
    const uid: string | undefined = data?.userId;
    if (!uid) return;
    
    const raw = data?.taskDefId || data?.taskId;
    if (!raw) return;
    let matched = false;
    if (raw === taskDefId) matched = true; 
    else if (typeof raw === 'string') matched = raw.split('_').includes(taskDefId);
    if (!matched) return;

    // Görevin ATANDIĞI tarihe bak (date field)
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
    if (!dateKey) return;
    
    // Sadece hafta içindeki günlere atanan görevleri say
    if (!dateKeys.includes(dateKey)) return;

    if (!byUser[uid]) byUser[uid] = new Set();
    byUser[uid].add(dateKey); // Her gün max 1 kere
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

  const daysInRange = dateKeys.length;
  const items = involved
    .map(uid => {
      const completedDays = byUser[uid].size; // Kaç farklı gün tamamlamış
      const points = completedDays * 100; // Her gün 100 puan, max 700
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

// DEBUG: Belirli bir kullanıcının belirli bir hafta için detaylı analiz (gelecekte lazım olabilir)
// Export kaldırıldı - gerektiğinde tekrar export edilebilir
async function debugWeeklyUserData(userId: string, weekStartDate: Date): Promise<{
  weekInfo: { start: Date; end: Date; dateKeys: string[] };
  activeTaskDefs: Array<{ id: string; title: string }>;
  userCompletions: Array<{
    id: string;
    taskId: string;
    taskDefId?: string;
    dateKey?: string;
    completedAt?: string;
    status: string;
    matchedDefId?: string;
    isInWeek: boolean;
    isDailyTask: boolean;
  }>;
  summary: {
    totalActiveDailyTasks: number;
    completedTasksInWeek: number;
    completedByDay: Record<string, number>;
    fullDays: number;
    expectedPoints: number;
    calculatedPoints: number;
  };
}> {
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });

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

  console.log('🔍 [DEBUG] === HAFTALIK ANALİZ DEBUG ===');
  console.log('📅 Hafta:', format(start, 'dd.MM.yyyy') + ' - ' + format(end, 'dd.MM.yyyy'));
  console.log('📅 Günler:', dateKeys);
  console.log('👤 Kullanıcı:', userId);
  console.log('');

  // 1. Aktif günlük vazife tanımlarını al
  const defsSnap = await getDocs(query(
    collection(db, 'taskDefinitions'),
    where('isActive', '==', true),
    where('category', '==', 'daily')
  ));
  const dailyDefIds = new Set<string>();
  const activeTaskDefs: Array<{ id: string; title: string }> = [];
  defsSnap.forEach(d => {
    dailyDefIds.add(d.id);
    const data: any = d.data();
    activeTaskDefs.push({ id: d.id, title: data?.title || d.id });
  });
  const N = dailyDefIds.size;

  console.log('📋 Aktif Günlük Vazifeler (N=' + N + '):');
  activeTaskDefs.forEach(t => console.log('  - ' + t.title + ' (ID: ' + t.id + ')'));
  console.log('');

  // 2. Kullanıcının tamamlanan görevlerini al
  const statusesSnap = await getDocs(query(
    collection(db, 'userTaskStatuses'),
    where('userId', '==', userId),
    where('status', '==', 'completed')
  ));

  const userCompletions: Array<{
    id: string;
    taskId: string;
    taskDefId?: string;
    dateKey?: string;
    completedAt?: string;
    status: string;
    matchedDefId?: string;
    isInWeek: boolean;
    isDailyTask: boolean;
  }> = [];

  const completedByDay: Record<string, number> = {};
  dateKeys.forEach(k => completedByDay[k] = 0);

  statusesSnap.forEach(s => {
    const data: any = s.data();
    const taskId = data?.taskId;
    const status = data?.status;

    // Tarih bilgisini al
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

    const completedAtStr = data?.completedAt?.toDate ? format(data.completedAt.toDate(), 'dd.MM.yyyy HH:mm') : 'N/A';
    const isInWeek = dateKey ? dateKeys.includes(dateKey) : false;

    // TaskDefId'yi bul
    const rawTaskId: string | undefined = data?.taskDefId || data?.taskId;
    let matchedDefId: string | undefined = rawTaskId;
    if (rawTaskId && !dailyDefIds.has(rawTaskId)) {
      const parts = rawTaskId.split('_');
      for (const p of parts) {
        if (dailyDefIds.has(p)) { matchedDefId = p; break; }
      }
    }
    const isDailyTask = matchedDefId ? dailyDefIds.has(matchedDefId) : false;

    userCompletions.push({
      id: s.id,
      taskId,
      taskDefId: data?.taskDefId,
      dateKey,
      completedAt: completedAtStr,
      status,
      matchedDefId,
      isInWeek,
      isDailyTask,
    });

    // Hafta içinde ve günlük vazife ise say
    if (isInWeek && isDailyTask && dateKey) {
      completedByDay[dateKey] = (completedByDay[dateKey] || 0) + 1;
    }
  });

  console.log('✅ Kullanıcının Tamamlanan Görevleri (Tümü):');
  console.log('   Toplam:', userCompletions.length);
  console.log('');

  console.log('🎯 HAFTA İÇİNDEKİ GÜNLÜK VAZİFELER:');
  const inWeekDailyTasks = userCompletions.filter(c => c.isInWeek && c.isDailyTask);
  if (inWeekDailyTasks.length === 0) {
    console.log('   ❌ Hafta içinde tamamlanan günlük vazife YOK!');
  } else {
    inWeekDailyTasks.forEach(c => {
      const taskDef = activeTaskDefs.find(t => t.id === c.matchedDefId);
      console.log('   ✓ ' + (taskDef?.title || c.matchedDefId) + ' - ' + c.dateKey + ' - ' + c.completedAt);
    });
  }
  console.log('');

  console.log('📊 GÜNLERE GÖRE DAĞILIM:');
  Object.keys(completedByDay).sort().forEach(day => {
    const count = completedByDay[day];
    const isFull = count >= N;
    console.log('   ' + day + ': ' + count + '/' + N + (isFull ? ' ✓ TAM GÜN' : ''));
  });
  console.log('');

  // Hesaplama
  const completedTasksInWeek = inWeekDailyTasks.length;
  const fullDays = Object.values(completedByDay).filter(c => c >= N).length;
  const perTaskPoint = 100 / N;
  const calculatedPoints = Math.round(completedTasksInWeek * perTaskPoint * 100) / 100;

  console.log('💯 PUAN HESAPLAMA:');
  console.log('   Aktif Günlük Vazife Sayısı (N): ' + N);
  console.log('   Vazife Başına Puan: ' + perTaskPoint.toFixed(2));
  console.log('   Tamamlanan Vazife: ' + completedTasksInWeek);
  console.log('   Tam Gün Sayısı: ' + fullDays + '/7');
  console.log('   HESAPLANAN PUAN: ' + calculatedPoints);
  console.log('');

  console.log('🔍 HAFTA DIŞI VEYA DİĞER GÖREVLER:');
  const otherTasks = userCompletions.filter(c => !c.isInWeek || !c.isDailyTask);
  if (otherTasks.length === 0) {
    console.log('   Yok');
  } else {
    otherTasks.slice(0, 10).forEach(c => {
      console.log('   - TaskId: ' + c.taskId + ' | Tarih: ' + (c.dateKey || 'N/A') + ' | Hafta İçi: ' + c.isInWeek + ' | Günlük: ' + c.isDailyTask);
    });
    if (otherTasks.length > 10) {
      console.log('   ... ve ' + (otherTasks.length - 10) + ' tane daha');
    }
  }
  console.log('');
  console.log('=== DEBUG BİTİŞ ===');

  return {
    weekInfo: { start, end, dateKeys },
    activeTaskDefs,
    userCompletions,
    summary: {
      totalActiveDailyTasks: N,
      completedTasksInWeek,
      completedByDay,
      fullDays,
      expectedPoints: calculatedPoints,
      calculatedPoints,
    },
  };
}