import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Header from '../components/Header';
import Colors from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { getActiveDailyTasks, getCategoryCompletionSummary, getLast7DaysCompletion, getLast7DaysDebug, getWeeklyLeaderboard, getWeeklyTaskCompletionSummaryV2, getWeeklyTaskLeaderboard } from '../services/TaskAnalysisService';

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
const analyticsCards = [
  {
    key: 'daily',
    title: 'Günlük Vazifeler',
    icon: 'sunny',
    colors: newColors.primary,
    ...mockAnalytics.daily,
  },
  {
    key: 'weekly',
    title: 'Haftalık Vazifeler',
    icon: 'calendar',
    colors: newColors.secondary,
    ...mockAnalytics.weekly,
  },
  {
    key: 'monthly',
    title: 'Aylık Vazifeler',
    icon: 'moon',
    colors: newColors.purple,
    ...mockAnalytics.monthly,
  },
];
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
  const [tab, setTab] = useState<'genel' | 'gunluk' | 'detay' | 'siralama'>('genel');
  const router = useRouter();
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState<{ total: number, completed: number } | null>(null);
  const [last7Days, setLast7Days] = useState<number[]>([]);
  const [categorySummary, setCategorySummary] = useState<{ daily: { total: number; completed: number }; weekly: { total: number; completed: number }; monthly: { total: number; completed: number } } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ start: Date; end: Date; daysInRange: number; items: Array<{ userId: string; displayName: string; points: number; fullDays: number; completedCount: number; }>; } | null>(null);
  const [leaderboardRef, setLeaderboardRef] = useState<Date | null>(null);
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
        const [summary, last7, cats, debug, lb] = await Promise.all([
          getWeeklyTaskCompletionSummaryV2(user.uid),
          getLast7DaysCompletion(user.uid),
          getCategoryCompletionSummary(user.uid),
          getLast7DaysDebug(user.uid),
          getWeeklyLeaderboard(leaderboardRef || undefined),
        ]);
        setWeeklySummary(summary);
        setLast7Days(last7 || []);
        setCategorySummary(cats);
        setLeaderboard(lb);
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
    } finally {
      setLoading(false);
    }
  };

  // Minimal timing logger for leaderboard fetches when Sıralamalar açık
  const loadLeaderboardForRef = async (ref?: Date) => {
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

  const weeklyPercent = weeklySummary ? Math.round((weeklySummary.completed / Math.max(weeklySummary.total, 1)) * 100) : 0;

  const handlePrevWeek = () => {
    const base = leaderboard?.start ? new Date(leaderboard.start) : new Date();
    base.setDate(base.getDate() - 7);
    setLeaderboardRef(base);
    if (tab === 'siralama') {
      loadLeaderboardForRef(base);
    }
  };

  const handleNextWeek = () => {
    const base = leaderboard?.start ? new Date(leaderboard.start) : new Date();
    base.setDate(base.getDate() + 7);
    setLeaderboardRef(base);
    if (tab === 'siralama') {
      loadLeaderboardForRef(base);
    }
  };

  // When Sıralamalar tab opens, fetch leaderboard and log only duration
  useEffect(() => {
    if (tab === 'siralama') {
      loadLeaderboardForRef(leaderboardRef || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Vazife değiştiğinde ilgili lider board'u yükle
  useEffect(() => {
    if (tab === 'siralama' && lbMode === 'vazife' && selectedTaskId) {
      loadLeaderboardForRef(leaderboardRef || undefined);
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
        onRightButtonPress={() => setTab('siralama')}
      />
      {/* Yeni Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, tab === 'genel' && styles.tabActive]} 
          onPress={() => setTab('genel')}
        >
          <Ionicons name="stats-chart" size={20} color={tab === 'genel' ? newColors.primary[0] : '#888'} />
          <Text style={[styles.tabText, tab === 'genel' && styles.tabTextActive]}>Genel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, tab === 'gunluk' && styles.tabActive]} 
          onPress={() => Alert.alert('Bilgi', 'Günlük sekmesi yapım aşamasında')}
        >
          <Ionicons name="calendar" size={20} color={tab === 'gunluk' ? newColors.secondary[0] : '#888'} />
          <Text style={[styles.tabText, tab === 'gunluk' && styles.tabTextActive]}>Günlük</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, tab === 'detay' && styles.tabActive]} 
          onPress={() => Alert.alert('Bilgi', 'Detay sekmesi yapım aşamasında')}
        >
          <Ionicons name="analytics" size={20} color={tab === 'detay' ? newColors.purple[0] : '#888'} />
          <Text style={[styles.tabText, tab === 'detay' && styles.tabTextActive]}>Detay</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'genel' ? (
          <>
            <Text style={styles.title}>Genel Vazife Analizi</Text>
            {/* Genel başarı ve toplam */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
              <View style={{ flex: 1, alignItems: 'center', marginRight: 8, backgroundColor: '#F8F8F8', borderRadius: 16, padding: 16, elevation: 1 }}>
                <Ionicons name="checkmark-done-circle" size={28} color="#43CEA2" style={{ marginBottom: 4 }} />
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>
                  {weeklySummary ? `${weeklySummary.completed} / ${weeklySummary.total}` : '-'}
                </Text>
                <Text style={{ color: theme.textDim, fontSize: 13 }}>Toplam Tamamlanan (Haftalık)</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center', marginLeft: 8, backgroundColor: '#F8F8F8', borderRadius: 16, padding: 16, elevation: 1 }}>
                <Ionicons name="trending-up" size={28} color="#FFD200" style={{ marginBottom: 4 }} />
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>{weeklyPercent}%</Text>
                <Text style={{ color: theme.textDim, fontSize: 13 }}>Haftalık Başarı</Text>
              </View>
            </View>
            {/* Son 7 gün grafiği */}
            <View style={{ backgroundColor: '#F8F8F8', borderRadius: 16, padding: 16, marginBottom: 18 }}>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 15, marginBottom: 10 }}>Son 7 Gün</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 60 }}>
                {(last7Days.length ? last7Days : Array(7).fill(0)).map((val, idx) => (
                  <View key={idx} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 16, height: val * 10 + 8, backgroundColor: '#ABDCFF', borderRadius: 6, marginBottom: 4 }} />
                    <Text style={{ color: theme.textDim, fontSize: 11 }}>{days[idx]}</Text>
                  </View>
                ))}
              </View>
            </View>
            {/* Kategori kartları */}
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
        ) : tab === 'gunluk' ? (
          <>
            <Text style={styles.title}>Günlük Vazife İstatistikleri</Text>
            
            {/* Haftalık Tamamlanma Oranı */}
            <View style={styles.weeklyCompletionContainer}>
              <Text style={styles.sectionTitle}>Son 7 Gün Tamamlanma Oranı</Text>
              <View style={styles.weeklyCompletionContent}>
                {(() => {
                  const dailyTotal = categorySummary?.daily.total || 0;
                  const start = new Date();
                  start.setDate(start.getDate() - 6);
                  start.setHours(0, 0, 0, 0);
                  const items = Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date(start);
                    d.setDate(start.getDate() + i);
                    return {
                      date: format(d, 'd', { locale: tr }),
                      day: format(d, 'EEE', { locale: tr }),
                      completed: last7Days[i] || 0,
                      total: dailyTotal,
                    };
                  });
                  const getColors = (rate: number) => {
                    if (rate >= 80) return newColors.success;
                    if (rate >= 60) return newColors.accent;
                    return newColors.primary;
                  };
                  const getColorText = (rate: number) => {
                    if (rate >= 80) return newColors.success[0];
                    if (rate >= 60) return newColors.accent[0];
                    return newColors.primary[0];
                  };
                  return items.map((item, idx) => {
                    const completionRate = item.total > 0 ? (item.completed / item.total) * 100 : 0;
                    return (
                      <View key={idx} style={styles.weeklyCompletionItem}>
                        <View style={styles.weeklyCompletionBar}>
                          <LinearGradient
                            colors={getColors(completionRate)}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={[
                              styles.weeklyCompletionFill,
                              { height: `${completionRate}%` }
                            ]}
                          />
                        </View>
                        <View style={styles.weeklyCompletionInfo}>
                          <Text style={styles.weeklyCompletionDate}>{item.date}</Text>
                          <Text style={styles.weeklyCompletionDay}>{item.day}</Text>
                          <Text style={[
                            styles.weeklyCompletionRate,
                            { color: getColorText(completionRate) }
                          ]}>
                            {Math.round(completionRate)}%
                          </Text>
                          <Text style={styles.weeklyCompletionCount}>
                            {item.completed}/{item.total}
                          </Text>
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
              <View style={styles.weeklyCompletionLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: newColors.success[0] }]} />
                  <Text style={styles.legendText}>%80+ Başarı</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: newColors.accent[0] }]} />
                  <Text style={styles.legendText}>%60-80 Başarı</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: newColors.primary[0] }]} />
                  <Text style={styles.legendText}>%60 Altı</Text>
                </View>
              </View>
            </View>

            {/* Haftalık Karşılaştırma */}
            <View style={styles.weeklyComparisonContainer}>
              <Text style={styles.sectionTitle}>Haftalık Karşılaştırma</Text>
              <View style={styles.weeklyComparisonContent}>
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, idx) => (
                  <View key={day} style={styles.weeklyComparisonDay}>
                    <View style={styles.weeklyComparisonBars}>
                      <View style={[styles.weeklyComparisonBar, { 
                        height: mockWeeklyComparison.thisWeek[idx] * 10,
                        backgroundColor: newColors.primary[0]
                      }]} />
                      <View style={[styles.weeklyComparisonBar, { 
                        height: mockWeeklyComparison.lastWeek[idx] * 10,
                        backgroundColor: newColors.secondary[0],
                        opacity: 0.7
                      }]} />
                    </View>
                    <Text style={styles.weeklyComparisonLabel}>{day}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.weeklyComparisonLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: newColors.primary[0] }]} />
                  <Text style={styles.legendText}>Bu Hafta</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: newColors.secondary[0] }]} />
                  <Text style={styles.legendText}>Geçen Hafta</Text>
                </View>
              </View>
            </View>

            {/* Vazife Performans Grafiği */}
            <View style={styles.taskPerformanceContainer}>
              <Text style={styles.sectionTitle}>Son 10 Gün Vazife Performansı</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taskPerformanceScroll}>
                <View style={styles.taskPerformanceContent}>
                  {mockTaskPerformance.map((task, idx) => {
                    const completionRate = (task.last10Days.filter(day => day === 1).length / 10) * 100;
                    return (
                      <View key={idx} style={styles.taskPerformanceCard}>
                        <View style={styles.taskPerformanceHeader}>
                          <Ionicons name={task.icon as any} size={24} color={task.color[0]} />
                          <Text style={styles.taskPerformanceTitle}>{task.task}</Text>
                        </View>
                        <View style={styles.taskPerformanceDays}>
                          {task.last10Days.map((day, dayIdx) => (
                            <View 
                              key={dayIdx} 
                              style={[
                                styles.taskPerformanceDay,
                                { backgroundColor: day === 1 ? task.color[0] : '#F0F0F0' }
                              ]} 
                            />
                          ))}
                        </View>
                        <View style={styles.taskPerformanceStats}>
                          <View style={styles.taskPerformanceStat}>
                            <Text style={styles.taskPerformanceStatValue}>
                              {task.last10Days.filter(day => day === 1).length}/10
                            </Text>
                            <Text style={styles.taskPerformanceStatLabel}>Tamamlanan</Text>
                          </View>
                          <View style={styles.taskPerformanceStat}>
                            <Text style={[styles.taskPerformanceStatValue, { color: task.color[0] }]}>
                              {completionRate}%
                            </Text>
                            <Text style={styles.taskPerformanceStatLabel}>Başarı</Text>
                          </View>
                          <View style={styles.taskPerformanceStat}>
                            <Text style={styles.taskPerformanceStatValue}>
                              {task.streak} gün
                            </Text>
                            <Text style={styles.taskPerformanceStatLabel}>Streak</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Mini Takvim */}
            <View style={styles.miniCalendarContainer}>
              <Text style={styles.sectionTitle}>Son 7 Gün</Text>
              <View style={styles.miniCalendar}>
                {(() => {
                  const start = new Date();
                  start.setDate(start.getDate() - 6);
                  start.setHours(0, 0, 0, 0);
                  return Array.from({ length: 7 }).map((_, idx) => {
                    const d = new Date(start);
                    d.setDate(start.getDate() + idx);
                    const count = last7Days[idx] || 0;
                    const active = count > 0;
                    return (
                      <View key={idx} style={styles.miniCalendarDay}>
                        <Text style={styles.miniCalendarDate}>{format(d, 'd', { locale: tr })}</Text>
                        <View style={[
                          styles.miniCalendarDot,
                          { backgroundColor: active ? newColors.success[0] : '#E0E0E0' }
                        ]} />
                        <Text style={styles.miniCalendarLabel}>{format(d, 'EEE', { locale: tr })}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </View>

            {/* Genel başarı oranı */}
            <View style={styles.cardRow}>
              <LinearGradient colors={newColors.success} style={[styles.statCard, { padding: 16 }]}> 
                <Ionicons name="checkmark-done-circle" size={28} color="#fff" style={{ marginBottom: 4 }} />
                <Text style={[styles.statValue, { color: '#fff' }]}>{mockDailyStats.completed} / {mockDailyStats.total}</Text>
                <Text style={[styles.statLabel, { color: '#fff', opacity: 0.9 }]}>Tamamlanan</Text>
              </LinearGradient>
              <LinearGradient colors={newColors.accent} style={[styles.statCard, { padding: 16 }]}> 
                <Ionicons name="trending-up" size={28} color="#fff" style={{ marginBottom: 4 }} />
                <Text style={[styles.statValue, { color: '#fff' }]}>{mockDailyStats.successRate}%</Text>
                <Text style={[styles.statLabel, { color: '#fff', opacity: 0.9 }]}>Başarı Oranı</Text>
              </LinearGradient>
            </View>
            {/* En başarılı, en başarısız, streak, en az yapılan */}
            <View style={styles.cardRow}>
              <LinearGradient colors={mockDailyStats.bestTask.color} style={styles.detailCard}>
                <Ionicons name={mockDailyStats.bestTask.icon as any} size={24} color="#fff" style={{ marginBottom: 4 }} />
                <Text style={styles.detailTitle}>En Başarılı</Text>
                <Text style={styles.detailValue}>{mockDailyStats.bestTask.title}</Text>
                <Text style={styles.detailSub}>{mockDailyStats.bestTask.completed} kez</Text>
              </LinearGradient>
              <LinearGradient colors={mockDailyStats.worstTask.color} style={styles.detailCard}>
                <Ionicons name={mockDailyStats.worstTask.icon as any} size={24} color="#fff" style={{ marginBottom: 4 }} />
                <Text style={styles.detailTitle}>En Başarısız</Text>
                <Text style={styles.detailValue}>{mockDailyStats.worstTask.title}</Text>
                <Text style={styles.detailSub}>{mockDailyStats.worstTask.completed} kez</Text>
              </LinearGradient>
            </View>
            <View style={styles.cardRow}>
              <LinearGradient colors={mockDailyStats.streakTask.color} style={styles.detailCard}>
                <Ionicons name={mockDailyStats.streakTask.icon as any} size={24} color="#fff" style={{ marginBottom: 4 }} />
                <Text style={styles.detailTitle}>En Çok Üst Üste</Text>
                <Text style={styles.detailValue}>{mockDailyStats.streakTask.title}</Text>
                <Text style={styles.detailSub}>{mockDailyStats.streakTask.streak} gün</Text>
              </LinearGradient>
              <LinearGradient colors={mockDailyStats.leastTask.color} style={styles.detailCard}>
                <Ionicons name={mockDailyStats.leastTask.icon as any} size={24} color="#fff" style={{ marginBottom: 4 }} />
                <Text style={styles.detailTitle}>En Az Yapılan</Text>
                <Text style={styles.detailValue}>{mockDailyStats.leastTask.title}</Text>
                <Text style={styles.detailSub}>{mockDailyStats.leastTask.completed} kez</Text>
              </LinearGradient>
            </View>
          </>
        ) : tab === 'detay' ? (
          <>
            <Text style={styles.title}>Detaylı Alışkanlık Analizi</Text>
            
            {/* Isı Haritası */}
            <View style={styles.heatMapContainer}>
              <Text style={styles.sectionTitle}>Aktivite Isı Haritası</Text>
              <View style={styles.heatMap}>
                {Array.from({ length: 30 }).map((_, idx) => (
                  <View 
                    key={idx} 
                    style={[
                      styles.heatMapDay,
                      { backgroundColor: `rgba(255, 107, 107, ${Math.random() * 0.8 + 0.2})` }
                    ]} 
                  />
                ))}
              </View>
            </View>

            {/* Alışkanlık Zinciri - Yeni Tasarım */}
            <View style={styles.chainContainer}>
              <Text style={styles.sectionTitle}>Alışkanlık Zinciri</Text>
              <View style={styles.chainContent}>
                <View style={styles.chainProgress}>
                  <Text style={styles.chainProgressText}>15/21</Text>
                  <Text style={styles.chainProgressLabel}>Günlük Hedef</Text>
                </View>
                <View style={styles.chainGrid}>
                  {Array.from({ length: 21 }).map((_, idx) => {
                    const isCompleted = idx < 15;
                    const isCurrentDay = idx === 15;
                    return (
                      <View key={idx} style={styles.chainLinkContainer}>
                        <View style={[
                          styles.chainLink,
                          isCompleted && styles.chainLinkCompleted,
                          isCurrentDay && styles.chainLinkCurrent,
                        ]}>
                          {isCompleted && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                          {isCurrentDay && (
                            <View style={styles.chainLinkPulse} />
                          )}
                        </View>
                        <Text style={styles.chainLinkDay}>{idx + 1}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.chainStats}>
                  <View style={styles.chainStatItem}>
                    <Ionicons name="flame" size={20} color={newColors.warning[0]} />
                    <Text style={styles.chainStatValue}>15</Text>
                    <Text style={styles.chainStatLabel}>Günlük Streak</Text>
                  </View>
                  <View style={styles.chainStatItem}>
                    <Ionicons name="trending-up" size={20} color={newColors.success[0]} />
                    <Text style={styles.chainStatValue}>%71</Text>
                    <Text style={styles.chainStatLabel}>Başarı Oranı</Text>
                  </View>
                  <View style={styles.chainStatItem}>
                    <Ionicons name="trophy" size={20} color={newColors.accent[0]} />
                    <Text style={styles.chainStatValue}>6</Text>
                    <Text style={styles.chainStatLabel}>Kalan Gün</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <TouchableOpacity onPress={handlePrevWeek} style={{ padding: 6 }}>
                <Ionicons name="chevron-back" size={22} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.title}>
                {leaderboard ? `${format(new Date(leaderboard.start), 'd MMMM', { locale: tr })} – ${format(new Date(leaderboard.end), 'd MMMM', { locale: tr })} haftası` : 'Sıralamalar'}
              </Text>
              <TouchableOpacity onPress={handleNextWeek} style={{ padding: 6 }}>
                <Ionicons name="chevron-forward" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            {/* Sıralama alt sekmeleri */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F2F3F5', borderRadius: 10, padding: 4, marginBottom: 10 }}>
              <TouchableOpacity onPress={() => { setLbMode('haftalik'); setTaskLeaderboard(null); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: lbMode==='haftalik' ? '#fff' : 'transparent' }}>
                <Text style={{ fontWeight: '600', color: lbMode==='haftalik' ? '#111' : '#666' }}>Haftalık</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setLbMode('vazife'); setLeaderboard(null); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: lbMode==='vazife' ? '#fff' : 'transparent' }}>
                <Text style={{ fontWeight: '600', color: lbMode==='vazife' ? '#111' : '#666' }}>Vazife Bazlı</Text>
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

            <View style={styles.taskPerformanceContainer}>
              {(
                (lbMode==='haftalik' && leaderboard && leaderboard.items.length > 0) ||
                (lbMode==='vazife' && taskLeaderboard && taskLeaderboard.items.length > 0)
              ) ? (
                (lbMode==='haftalik' ? (leaderboard?.items || []) : (taskLeaderboard?.items || [])).map((item, idx) => (
                  <View key={item.userId} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                    {/* Üst satır: sıra + ikon + isim (sol), puan (sağ) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <Text style={{ width: 22, textAlign: 'right', fontWeight: 'bold', color: '#666', marginRight: 8 }}>{idx + 1}.</Text>
                        <Ionicons name={idx === 0 ? 'trophy' : 'person-circle'} size={20} color={idx === 0 ? '#FFD93D' : '#888'} style={{ marginRight: 8 }} />
                        <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontWeight: '600', color: '#222', flexShrink: 1 }}>
                          {item.displayName}
                        </Text>
                      </View>
                      <Text style={{ fontWeight: '700', color: '#222', marginLeft: 12 }}>{item.points}</Text>
                    </View>
                    {/* Alt satır: detay sağda tek satır */}
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: '#666', textAlign: 'right' }} numberOfLines={1} ellipsizeMode="tail">
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
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
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
    backgroundColor: '#fff',
    elevation: 2,
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#222',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 14, color: '#222' },
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
    color: '#222',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#F8F8F8',
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