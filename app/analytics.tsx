import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Header from '../components/Header';
import Colors from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { getActiveDailyTasks, getCategoryCompletionSummary, getLast7DaysCompletion, getLast7DaysDebug, getMonthlyLeaderboard, getWeeklyLeaderboard, getWeeklyTaskCompletionSummaryV2, getWeeklyTaskLeaderboard } from '../services/TaskAnalysisService';

// Yeni renk paleti
const newColors = {
  primary: ['#FF6B6B', '#FF8E8E'] as const,
  secondary: ['#4ECDC4', '#45B7AF'] as const,
  accent: ['#FFD93D', '#FFE66D'] as const,
  success: ['#2ECC71', '#27AE60'] as const,
  warning: ['#F1C40F', '#F39C12'] as const,
  info: ['#3498DB', '#2980B9'] as const,
  purple: ['#9B59B6', '#8E44AD'] as const,
  dark: ['#2C3E50', '#34495E'] as const,
};

// Mock veriler
const mockAnalytics = {
  daily: { total: 10, completed: 7 },
  weekly: { total: 4, completed: 2 },
  monthly: { total: 2, completed: 1 },
  totalCompleted: 45,
  totalTasks: 60,
  bestDay: 'Çarşamba',
  streak: 5,
  last7Days: [2, 3, 1, 4, 0, 5, 2],
};
const mockDailyStats = {
  total: 10,
  completed: 7,
  successRate: 70,
  bestTask: { title: 'Sabah Namazı', completed: 10, icon: 'sunny', color: newColors.primary },
  worstTask: { title: 'Kitap Okuma', completed: 2, icon: 'book', color: newColors.secondary },
  streakTask: { title: 'Dua', streak: 5, icon: 'flame', color: newColors.warning },
  leastTask: { title: 'Spor', completed: 1, icon: 'barbell', color: newColors.info },
  ranking: [
    { title: 'Sabah Namazı', completed: 10, icon: 'sunny', color: newColors.primary },
    { title: 'Dua', completed: 8, icon: 'flame', color: newColors.warning },
    { title: 'Kitap Okuma', completed: 2, icon: 'book', color: newColors.secondary },
    { title: 'Spor', completed: 1, icon: 'barbell', color: newColors.info },
  ],
};

// Yeni mock veriler
const mockTimeDistribution = [
  { hour: '05:00', count: 2 },
  { hour: '06:00', count: 3 },
  { hour: '07:00', count: 1 },
  { hour: '08:00', count: 0 },
  { hour: '09:00', count: 1 },
  { hour: '10:00', count: 0 },
  { hour: '11:00', count: 1 },
  { hour: '12:00', count: 2 },
  { hour: '13:00', count: 0 },
  { hour: '14:00', count: 1 },
  { hour: '15:00', count: 2 },
  { hour: '16:00', count: 1 },
  { hour: '17:00', count: 0 },
  { hour: '18:00', count: 2 },
  { hour: '19:00', count: 1 },
  { hour: '20:00', count: 3 },
  { hour: '21:00', count: 2 },
  { hour: '22:00', count: 1 },
];

const mockWeeklyComparison = {
  thisWeek: [5, 7, 6, 8, 4, 3, 6],
  lastWeek: [4, 5, 7, 6, 5, 4, 5],
};

const mockCategoryDistribution = [
  { category: 'İbadet', count: 8, color: newColors.primary },
  { category: 'Eğitim', count: 5, color: newColors.secondary },
  { category: 'Spor', count: 3, color: newColors.warning },
  { category: 'Kişisel', count: 4, color: newColors.info },
];

// Yeni mock veriler
const mockWeeklyCompletion = [
  { day: 'Pazartesi', completed: 4, total: 10, date: '1' },
  { day: 'Salı', completed: 7, total: 10, date: '2' },
  { day: 'Çarşamba', completed: 9, total: 10, date: '3' },
  { day: 'Perşembe', completed: 5, total: 10, date: '4' },
  { day: 'Cuma', completed: 8, total: 10, date: '5' },
  { day: 'Cumartesi', completed: 6, total: 8, date: '6' },
  { day: 'Pazar', completed: 3, total: 8, date: '7' },
];

// Yeni mock veriler
const mockTaskPerformance = [
  { 
    task: 'Sabah Namazı',
    icon: 'sunny',
    last10Days: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 10/10
    color: newColors.success,
    streak: 10
  },
  { 
    task: 'Kitap Okuma',
    icon: 'book',
    last10Days: [1, 1, 0, 1, 1, 0, 1, 1, 1, 0], // 7/10
    color: newColors.accent,
    streak: 3
  },
  { 
    task: 'Dua',
    icon: 'flame',
    last10Days: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1], // 9/10
    color: newColors.primary,
    streak: 1
  },
  { 
    task: 'Spor',
    icon: 'barbell',
    last10Days: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // 5/10
    color: newColors.info,
    streak: 1
  },
  { 
    task: 'Kuran Okuma',
    icon: 'book',
    last10Days: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 10/10
    color: newColors.success,
    streak: 10
  }
];

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [tab, setTab] = useState<'genel' | 'haftalikSiralama' | 'aylikSiralama'>('genel');
  const router = useRouter();
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState<{ total: number, completed: number } | null>(null);
  const [last7Days, setLast7Days] = useState<number[]>([]);
  const [categorySummary, setCategorySummary] = useState<{ daily: { total: number; completed: number }; weekly: { total: number; completed: number }; monthly: { total: number; completed: number } } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ start: Date; end: Date; daysInRange: number; items: Array<{ userId: string; displayName: string; points: number; fullDays: number; completedCount: number; }>; } | null>(null);
  const [leaderboardRef, setLeaderboardRef] = useState<Date | null>(null);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<{ start: Date; end: Date; daysInRange: number; taskCount: number; items: Array<{ userId: string; displayName: string; points: number; fullDays: number; completedCount: number; }>; } | null>(null);
  const [monthlyLeaderboardRef, setMonthlyLeaderboardRef] = useState<Date | null>(null);
  const [lbMode, setLbMode] = useState<'haftalik' | 'vazife'>('haftalik');
  const [tasks, setTasks] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskLeaderboard, setTaskLeaderboard] = useState<{ start: Date; end: Date; daysInRange: number; items: Array<{ userId: string; displayName: string; points: number; fullDays: number; completedCount: number; }>; } | null>(null);

  // Debug flag to silence analytics logs
  const ANALYTICS_DEBUG = false;

  // Debug logs for incoming analytics data
  useEffect(() => {
    try {
      if (!ANALYTICS_DEBUG) return;
      console.log('[Analytics] last7Days:', last7Days);
      console.log('[Analytics] categorySummary.daily:', categorySummary?.daily);
      console.log('[Analytics] weeklySummary:', weeklySummary);
    } catch (e) {
      // no-op
    }
  }, [last7Days, categorySummary, weeklySummary]);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  // Aktif günlük vazifeleri çek (vazife bazlı mod için)
  useEffect(() => {
    (async () => {
      try {
        const list = await getActiveDailyTasks();
        setTasks(list);
        if (list.length > 0 && !selectedTaskId) setSelectedTaskId(list[0].id);
      } catch {}
    })();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const t0 = Date.now();
      if (user) {
        const [summary, last7, cats, debug, lb, mlb] = await Promise.all([
          getWeeklyTaskCompletionSummaryV2(user.uid),
          getLast7DaysCompletion(user.uid),
          getCategoryCompletionSummary(user.uid),
          getLast7DaysDebug(user.uid),
          getWeeklyLeaderboard(leaderboardRef || undefined),
          getMonthlyLeaderboard(monthlyLeaderboardRef || undefined),
        ]);
        setWeeklySummary(summary);
        setLast7Days(last7 || []);
        setCategorySummary(cats);
        setLeaderboard(lb);
        setMonthlyLeaderboard(mlb);
        try { if (ANALYTICS_DEBUG) console.log('[UI] leaderboard length', lb?.items.length || 0, 'ms', Date.now() - t0); } catch {}
        try {
          if (ANALYTICS_DEBUG) {
            console.log('[Analytics:UI debug] keys', debug.keys);
            console.log('[Analytics:UI debug] dailyTaskIds', debug.dailyTaskIds);
            console.log('[Analytics:UI debug] raw sample (inRange only)', debug.raw.filter(r => r.inRange));
          }
        } catch {}
      }
    } catch (error) {
      console.error('Analiz yükleme hatası:', error);
      setWeeklySummary({ total: 0, completed: 0 });
      setLast7Days([]);
      setCategorySummary({ daily: { total: 0, completed: 0 }, weekly: { total: 0, completed: 0 }, monthly: { total: 0, completed: 0 } });
      setLeaderboard({ start: new Date(), end: new Date(), daysInRange: 0, items: [] });
      setMonthlyLeaderboard({ start: new Date(), end: new Date(), daysInRange: 0, taskCount: 0, items: [] });
    } finally {
      setLoading(false);
    }
  };

  // Minimal timing logger for leaderboard fetches when Haftalık sıralama açık
  const loadWeeklyLeaderboardForRef = async (ref?: Date) => {
    try {
      const base = ref || leaderboardRef || undefined;
      if (lbMode === 'haftalik') {
        const lb = await getWeeklyLeaderboard(base);
        setLeaderboard(lb);
      } else if (lbMode === 'vazife' && selectedTaskId) {
        const tlb = await getWeeklyTaskLeaderboard(selectedTaskId, base);
        setTaskLeaderboard(tlb);
      }
    } catch (e) {
      // no-op
    }
  };

  const loadMonthlyLeaderboardForRef = async (ref?: Date) => {
    try {
      const base = ref || monthlyLeaderboardRef || undefined;
      const lb = await getMonthlyLeaderboard(base);
      setMonthlyLeaderboard(lb);
    } catch (e) {
      // no-op
    }
  };

  const weeklyPercent = weeklySummary ? Math.round((weeklySummary.completed / Math.max(weeklySummary.total, 1)) * 100) : 0;

  const handlePrevWeek = () => {
    const base = leaderboard?.start ? new Date(leaderboard.start) : new Date();
    base.setDate(base.getDate() - 7);
    setLeaderboardRef(base);
    if (tab === 'haftalikSiralama') {
      loadWeeklyLeaderboardForRef(base);
    }
  };

  const handleNextWeek = () => {
    const base = leaderboard?.start ? new Date(leaderboard.start) : new Date();
    base.setDate(base.getDate() + 7);
    setLeaderboardRef(base);
    if (tab === 'haftalikSiralama') {
      loadWeeklyLeaderboardForRef(base);
    }
  };

  const handlePrevMonth = () => {
    const base = monthlyLeaderboard?.start ? new Date(monthlyLeaderboard.start) : new Date();
    base.setMonth(base.getMonth() - 1);
    setMonthlyLeaderboardRef(base);
    if (tab === 'aylikSiralama') {
      loadMonthlyLeaderboardForRef(base);
    }
  };

  const handleNextMonth = () => {
    const base = monthlyLeaderboard?.start ? new Date(monthlyLeaderboard.start) : new Date();
    base.setMonth(base.getMonth() + 1);
    setMonthlyLeaderboardRef(base);
    if (tab === 'aylikSiralama') {
      loadMonthlyLeaderboardForRef(base);
    }
  };

  // When Sıralamalar tab opens, fetch leaderboard and log only duration
  useEffect(() => {
    if (tab === 'haftalikSiralama') {
      loadWeeklyLeaderboardForRef(leaderboardRef || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === 'aylikSiralama') {
      loadMonthlyLeaderboardForRef(monthlyLeaderboardRef || undefined);
    }
    if (tab === 'haftalikSiralama') {
      loadWeeklyLeaderboardForRef(leaderboardRef || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, monthlyLeaderboardRef]);

  useEffect(() => {
    if (tab === 'haftalikSiralama' && lbMode === 'vazife' && selectedTaskId) {
      loadWeeklyLeaderboardForRef(leaderboardRef || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbMode, selectedTaskId]);

  // Genel Analiz kartı
  const renderCard = (card: any) => {
    const percent = card.total > 0 ? Math.round((card.completed / card.total) * 100) : 0;
    return (
      <LinearGradient
        key={card.key}
        colors={card.colors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          padding: 20,
          marginBottom: 18,
          shadowColor: card.colors[1],
          shadowOpacity: 0.10,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={card.icon as any} size={32} color="#fff" style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 2 }}>{card.title}</Text>
            <Text style={{ color: '#fff', fontSize: 13, opacity: 0.85 }}>{card.completed} / {card.total} tamamlandı</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>{percent}%</Text>
            <Text style={{ color: '#fff', fontSize: 11, opacity: 0.7 }}>Başarı</Text>
          </View>
        </View>
        {/* Progress Bar */}
        <View style={{ height: 8, backgroundColor: '#fff6', borderRadius: 4, marginTop: 16 }}>
          <View style={{
            width: `${percent}%`,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#fff',
            shadowColor: '#fff',
            shadowOpacity: 0.2,
            shadowRadius: 2,
          }} />
        </View>
      </LinearGradient>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <Header 
        title="Analiz" 
        showNotification={false} 
        leftButton={<Ionicons name="arrow-back" size={24} color="#FFF" />}
        onLeftButtonPress={() => router.back()}
        rightButton={<Ionicons name="trophy" size={22} color="#FFF" />}
        onRightButtonPress={() => setTab('haftalikSiralama')}
      />
      {/* Yeni Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface }] }>
        <TouchableOpacity 
          style={[styles.tab, { borderColor: theme.border }, tab === 'genel' && [styles.tabActive, { backgroundColor: theme.card }]]} 
          onPress={() => setTab('genel')}
        >
          <Ionicons name="stats-chart" size={20} color={tab === 'genel' ? newColors.primary[0] : theme.textDim} />
          <Text style={[styles.tabText, { color: theme.text }, tab === 'genel' && styles.tabTextActive]}>Genel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, { borderColor: theme.border }, tab === 'haftalikSiralama' && [styles.tabActive, { backgroundColor: theme.card }]]} 
          onPress={() => setTab('haftalikSiralama')}
        >
          <Ionicons name="trophy" size={20} color={tab === 'haftalikSiralama' ? newColors.secondary[0] : theme.textDim} />
          <Text style={[styles.tabText, { color: theme.text }, tab === 'haftalikSiralama' && styles.tabTextActive]}>Haftalık</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, { borderColor: theme.border }, tab === 'aylikSiralama' && [styles.tabActive, { backgroundColor: theme.card }]]} 
          onPress={() => setTab('aylikSiralama')}
        >
          <Ionicons name="calendar" size={20} color={tab === 'aylikSiralama' ? newColors.purple[0] : theme.textDim} />
          <Text style={[styles.tabText, { color: theme.text }, tab === 'aylikSiralama' && styles.tabTextActive]}>Aylık</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'genel' ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>Genel Vazife Analizi</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
              <View style={{ flex: 1, alignItems: 'center', marginRight: 8, backgroundColor: theme.surface, borderRadius: 16, padding: 16, elevation: 1 }}>
          <Ionicons name="checkmark-done-circle" size={28} color={newColors.success[0]} style={{ marginBottom: 4 }} />
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>
                  {weeklySummary ? `${weeklySummary.completed} / ${weeklySummary.total}` : '-'}
                </Text>
                <Text style={{ color: theme.textDim, fontSize: 13 }}>Toplam Tamamlanan (Haftalık)</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center', marginLeft: 8, backgroundColor: theme.surface, borderRadius: 16, padding: 16, elevation: 1 }}>
          <Ionicons name="trending-up" size={28} color={newColors.accent[0]} style={{ marginBottom: 4 }} />
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>{weeklyPercent}%</Text>
                <Text style={{ color: theme.textDim, fontSize: 13 }}>Haftalık Başarı</Text>
              </View>
            </View>
              <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 18 }}>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 15, marginBottom: 10, zIndex: 1 }}>Bu Hafta (Pzt-Bugün)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 }}>
                {(last7Days.length ? last7Days : Array(7).fill(0)).map((val, idx) => (
                  <View key={idx} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 16, height: val * 10 + 8, backgroundColor: newColors.secondary[0], borderRadius: 6, marginBottom: 4 }} />
                    <Text style={{ color: theme.textDim, fontSize: 11 }}>{days[idx]}</Text>
                  </View>
                ))}
              </View>
            </View>
            {(() => {
              const cards = categorySummary ? [
                { key: 'daily', title: 'Günlük Vazifeler', icon: 'sunny', colors: newColors.primary, total: categorySummary.daily.total, completed: categorySummary.daily.completed },
                { key: 'weekly', title: 'Haftalık Vazifeler', icon: 'calendar', colors: newColors.secondary, total: categorySummary.weekly.total, completed: categorySummary.weekly.completed },
                { key: 'monthly', title: 'Aylık Vazifeler', icon: 'moon', colors: newColors.purple, total: categorySummary.monthly.total, completed: categorySummary.monthly.completed },
              ] : [];
              return cards.length === 0 || cards.every(card => card.total === 0) ? (
                <View style={{ alignItems: 'center', marginTop: 32 }}>
                  <Ionicons name="stats-chart" size={48} color={theme.textDim} style={{ marginBottom: 12 }} />
                  <Text style={{ color: theme.textDim, fontSize: 16, fontWeight: '500', marginBottom: 6 }}>Henüz tamamlanan vazife yok</Text>
                  <Text style={{ color: theme.textDim, fontSize: 13, textAlign: 'center' }}>Vazifeleri tamamladıkça burada gelişimini takip edebilirsin!</Text>
                </View>
              ) : (
                cards.map(renderCard)
              );
            })()}
          </>
        ) : tab === 'haftalikSiralama' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <TouchableOpacity onPress={handlePrevWeek} style={{ padding: 6 }}>
                <Ionicons name="chevron-back" size={22} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }]}>
                {leaderboard ? `${format(new Date(leaderboard.start), 'd MMMM', { locale: tr })} – ${format(new Date(leaderboard.end), 'd MMMM', { locale: tr })} haftası` : 'Sıralamalar'}
              </Text>
              <TouchableOpacity onPress={handleNextWeek} style={{ padding: 6 }}>
                <Ionicons name="chevron-forward" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 4, marginBottom: 10 }}>
              <TouchableOpacity onPress={() => { setLbMode('haftalik'); setTaskLeaderboard(null); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: lbMode==='haftalik' ? theme.card : 'transparent' }}>
                <Text style={{ fontWeight: '600', color: lbMode==='haftalik' ? theme.text : theme.textDim }}>Haftalık</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setLbMode('vazife'); setLeaderboard(null); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: lbMode==='vazife' ? theme.card : 'transparent' }}>
                <Text style={{ fontWeight: '600', color: lbMode==='vazife' ? theme.text : theme.textDim }}>Vazife Bazlı</Text>
              </TouchableOpacity>
            </View>
            {lbMode==='vazife' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontWeight: '600', marginRight: 8, color: theme.text }}>Vazife:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {tasks.map(t => (
                      <TouchableOpacity key={t.id} onPress={() => setSelectedTaskId(t.id)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: selectedTaskId===t.id ? '#E8EAED' : '#F6F7F9' }}>
                        <Text style={{ color: '#111' }} numberOfLines={1}>{t.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
            <View style={[styles.taskPerformanceContainer, { backgroundColor: theme.surface }] }>
              {(
                (lbMode==='haftalik' && leaderboard && leaderboard.items.length > 0) ||
                (lbMode==='vazife' && taskLeaderboard && taskLeaderboard.items.length > 0)
              ) ? (
                (lbMode==='haftalik' ? (leaderboard?.items || []) : (taskLeaderboard?.items || [])).map((item, idx) => (
                  <View key={item.userId} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <Text style={{ width: 22, textAlign: 'right', fontWeight: 'bold', color: theme.textDim, marginRight: 8 }}>{idx + 1}.</Text>
                        <Ionicons name={idx === 0 ? 'trophy' : 'person-circle'} size={20} color={idx === 0 ? newColors.accent[0] : theme.textDim} style={{ marginRight: 8 }} />
                        <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontWeight: '600', color: theme.text, flexShrink: 1 }}>
                          {item.displayName}
                        </Text>
                      </View>
                      <Text style={{ fontWeight: '700', color: theme.text, marginLeft: 12 }}>{item.points}</Text>
                    </View>
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: theme.textDim, textAlign: 'right' }} numberOfLines={1} ellipsizeMode="tail">
                        {item.fullDays}/{(lbMode==='haftalik' ? (leaderboard?.daysInRange || 0) : (taskLeaderboard?.daysInRange || 0))} tam gün • {item.completedCount} tamamlanan
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Ionicons name="people" size={48} color={theme.textDim} style={{ marginBottom: 8 }} />
                  <Text style={{ color: theme.textDim }}>Henüz bu hafta puan alan yok.</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 6 }}>
                <Ionicons name="chevron-back" size={22} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }]}> 
                {monthlyLeaderboard ? `${format(new Date(monthlyLeaderboard.start), 'LLLL yyyy', { locale: tr })}` : 'Aylık Sıralama'}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={{ padding: 6 }}>
                <Ionicons name="chevron-forward" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.taskPerformanceContainer, { backgroundColor: theme.surface }] }>
              {monthlyLeaderboard && monthlyLeaderboard.items.length > 0 ? (
                monthlyLeaderboard.items.map((item, idx) => (
                  <View key={item.userId} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <Text style={{ width: 22, textAlign: 'right', fontWeight: 'bold', color: theme.textDim, marginRight: 8 }}>{idx + 1}.</Text>
                        <Ionicons name={idx === 0 ? 'trophy' : 'person-circle'} size={20} color={idx === 0 ? newColors.accent[0] : theme.textDim} style={{ marginRight: 8 }} />
                        <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontWeight: '600', color: theme.text, flexShrink: 1 }}>
                          {item.displayName}
                        </Text>
                      </View>
                      <Text style={{ fontWeight: '700', color: theme.text, marginLeft: 12 }}>{item.points}</Text>
                    </View>
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: theme.textDim, textAlign: 'right' }} numberOfLines={1} ellipsizeMode="tail">
                        {item.fullDays}/{monthlyLeaderboard.daysInRange} tam gün • {item.completedCount} tamamlanan
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Ionicons name="people" size={48} color={theme.textDim} style={{ marginBottom: 8 }} />
                  <Text style={{ color: theme.textDim }}>Henüz bu ay puan alan yok.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    margin: 16,
    marginBottom: 0,
    overflow: 'hidden',
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    elevation: 2,
  },
  tabText: {
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {},
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 16,
    elevation: 2,
  },
  statValue: { fontWeight: 'bold', fontSize: 18, color: '#222' },
  statLabel: { color: '#888', fontSize: 13 },
  detailCard: { flex: 1, alignItems: 'center', marginHorizontal: 4, borderRadius: 16, padding: 16, elevation: 1 },
  detailTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  detailValue: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  detailSub: { color: '#fff', fontSize: 12, opacity: 0.8 },
  rankingCard: { borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  heatMapContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  heatMap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  heatMapDay: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  circularProgressContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  circularProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  circularProgressItem: {
    alignItems: 'center',
  },
  circularProgress: {
    width: 30,
    height: 100,
    backgroundColor: '#F0F0F0',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 8,
  },
  circularProgressFill: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: newColors.primary[0],
  },
  circularProgressLabel: {
    fontSize: 12,
    color: '#666',
  },
  badgesContainer: {
    marginBottom: 20,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: (Dimensions.get('window').width - 64) / 2,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  badgeTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 14,
  },
  chainContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  chainContent: {
    marginTop: 16,
  },
  chainProgress: {
    alignItems: 'center',
    marginBottom: 20,
  },
  chainProgressText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  chainProgressLabel: {
    fontSize: 14,
    color: '#666',
  },
  chainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  chainLinkContainer: {
    alignItems: 'center',
  },
  chainLink: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  chainLinkCompleted: {
    backgroundColor: newColors.success[0],
    borderColor: newColors.success[1],
  },
  chainLinkCurrent: {
    backgroundColor: '#fff',
    borderColor: newColors.warning[0],
    borderWidth: 2,
  },
  chainLinkPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: newColors.warning[0],
    opacity: 0.2,
    zIndex: -1,
  },
  chainLinkDay: {
    fontSize: 12,
    color: '#666',
  },
  chainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
  },
  chainStatItem: {
    alignItems: 'center',
  },
  chainStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 4,
    marginBottom: 2,
  },
  chainStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  motivationCard: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  timeDistributionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  timeDistributionScroll: {
    marginTop: 12,
  },
  timeDistributionContent: {
    flexDirection: 'row',
    height: 120,
    paddingRight: 16,
  },
  timeDistributionItem: {
    alignItems: 'center',
    marginRight: 8,
    width: 24,
  },
  timeDistributionBar: {
    width: 16,
    height: 80,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  timeDistributionFill: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: 8,
  },
  timeDistributionLabel: {
    fontSize: 10,
    color: '#666',
    transform: [{ rotate: '-45deg' }],
    marginTop: 4,
  },
  weeklyComparisonContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  weeklyComparisonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    height: 120,
  },
  weeklyComparisonDay: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyComparisonBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: 4,
  },
  weeklyComparisonBar: {
    width: 8,
    borderRadius: 4,
  },
  weeklyComparisonLabel: {
    fontSize: 10,
    color: '#666',
  },
  weeklyComparisonLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  taskPerformanceContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  taskPerformanceScroll: {
    marginTop: 12,
  },
  taskPerformanceContent: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  taskPerformanceCard: {
    width: 200,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
  },
  taskPerformanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskPerformanceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginLeft: 8,
    flex: 1,
  },
  taskPerformanceDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskPerformanceDay: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  taskPerformanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
  },
  taskPerformanceStat: {
    alignItems: 'center',
  },
  taskPerformanceStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  taskPerformanceStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  // Haftalık tamamlanma stilleri
  weeklyCompletionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  weeklyCompletionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 24,
    marginBottom: 8,
  },
  weeklyCompletionItem: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyCompletionBar: {
    width: 24,
    height: 120,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  weeklyCompletionFill: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: 12,
  },
  weeklyCompletionInfo: {
    alignItems: 'center',
  },
  weeklyCompletionDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  weeklyCompletionDay: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  weeklyCompletionRate: {
    fontSize: 12,
    fontWeight: '600',
  },
  weeklyCompletionCount: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  weeklyCompletionLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  // Mini takvim stilleri
  miniCalendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  miniCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  miniCalendarDay: {
    alignItems: 'center',
    width: 40,
  },
  miniCalendarDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  miniCalendarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  miniCalendarLabel: {
    fontSize: 12,
    color: '#666',
  },
}); 