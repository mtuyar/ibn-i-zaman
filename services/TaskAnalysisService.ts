import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns';

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
  try { console.log('[Analytics:getLast7] keys', keys, 'dailyTotal', dailyIds.size, 'result', result); } catch {}
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
    console.log('[Analytics:debug] keys', keys);
    console.log('[Analytics:debug] dailyTaskIds', dailyTaskIds);
    console.log('[Analytics:debug] rawCount', raw.length);
    console.log('[Analytics:debug] rawInRange', raw.filter(r => r.inRange));
  } catch {}

  return { keys, dailyTaskIds, raw };
} 