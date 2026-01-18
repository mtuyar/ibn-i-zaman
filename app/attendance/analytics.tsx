import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { AttendanceService, Program } from '../../services/attendance';
import Colors from '../../constants/Colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

export default function AnalyticsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [generalStats, setGeneralStats] = useState<any>({});
    const [analyticsCache, setAnalyticsCache] = useState<{ [key: string]: any }>({});

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    // Filter only periodic programs (not one-time)
    const periodicPrograms = useMemo(() => {
        return programs.filter(p => p.program_type !== 'one-time');
    }, [programs]);

    useFocusEffect(
        useCallback(() => {
            loadInitialData();
        }, [])
    );

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [programsData, statsData] = await Promise.all([
                AttendanceService.getPrograms(),
                AttendanceService.getAttendanceStats()
            ]);
            setPrograms(programsData);
            setGeneralStats(statsData);

            const periodic = programsData.filter((p: Program) => p.program_type !== 'one-time');
            if (periodic.length > 0) {
                setSelectedProgram(periodic[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedProgram) {
            loadProgramAnalytics(selectedProgram);
        }
    }, [selectedProgram]);

    const loadProgramAnalytics = async (programId: string) => {
        // Use cache if available
        if (analyticsCache[programId]) {
            setAnalytics(analyticsCache[programId]);
            return;
        }

        try {
            setLoadingAnalytics(true);
            const data = await AttendanceService.getProgramAnalytics(programId);

            // Add best/worst weeks calculation
            if (data.recentDates && data.recentDates.length > 0) {
                const weeksWithRates = data.recentDates.map((d: any) => ({
                    ...d,
                    rate: d.present + d.absent > 0 ? Math.round((d.present / (d.present + d.absent)) * 100) : 0
                }));

                const sorted = [...weeksWithRates].sort((a, b) => b.rate - a.rate);
                data.bestWeeks = sorted.slice(0, 5);
                data.worstWeeks = sorted.slice(-5).reverse();
            }

            // Cache the result
            setAnalyticsCache(prev => ({ ...prev, [programId]: data }));
            setAnalytics(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAnalytics(false);
        }
    };

    const chartConfig = {
        backgroundColor: isDark ? '#1a1a2e' : '#fff',
        backgroundGradientFrom: isDark ? '#1a1a2e' : '#fff',
        backgroundGradientTo: isDark ? '#16213e' : '#f5f5f5',
        decimalPlaces: 0,
        color: (opacity = 1) => isDark ? `rgba(79, 172, 254, ${opacity})` : `rgba(0, 122, 255, ${opacity})`,
        labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
        style: { borderRadius: 16 },
        propsForDots: { r: '5', strokeWidth: '2', stroke: '#4facfe' }
    };

    const selectedProgramData = periodicPrograms.find(p => p.id === selectedProgram);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.tint} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>İstatistikler</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* General Stats */}
                <View style={styles.generalStats}>
                    <View style={[styles.generalCard, { backgroundColor: isDark ? 'rgba(79, 172, 254, 0.2)' : 'rgba(79, 172, 254, 0.1)' }]}>
                        <Ionicons name="people" size={24} color="#4facfe" />
                        <Text style={[styles.generalValue, { color: theme.text }]}>{generalStats.totalStudents}</Text>
                        <Text style={[styles.generalLabel, { color: theme.tabIconDefault }]}>Öğrenci</Text>
                    </View>
                    <View style={[styles.generalCard, { backgroundColor: isDark ? 'rgba(67, 233, 123, 0.2)' : 'rgba(67, 233, 123, 0.1)' }]}>
                        <Ionicons name="calendar" size={24} color="#43e97b" />
                        <Text style={[styles.generalValue, { color: theme.text }]}>{periodicPrograms.length}</Text>
                        <Text style={[styles.generalLabel, { color: theme.tabIconDefault }]}>Periyodik</Text>
                    </View>
                    {analytics && (
                        <View style={[styles.generalCard, { backgroundColor: isDark ? 'rgba(250, 112, 154, 0.2)' : 'rgba(250, 112, 154, 0.1)' }]}>
                            <Ionicons name="checkmark-done" size={24} color="#fa709a" />
                            <Text style={[styles.generalValue, { color: theme.text }]}>{analytics.totalSessions}</Text>
                            <Text style={[styles.generalLabel, { color: theme.tabIconDefault }]}>Oturum</Text>
                        </View>
                    )}
                </View>

                {periodicPrograms.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={60} color={theme.tabIconDefault} />
                        <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>Periyodik program yok</Text>
                        <Text style={[styles.emptySubtext, { color: theme.tabIconDefault }]}>Haftalık veya aylık program oluşturun</Text>
                    </View>
                ) : (
                    <>
                        {/* Program Selector */}
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Program Seç</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.programSelector}>
                            {periodicPrograms.map((prog) => (
                                <TouchableOpacity
                                    key={prog.id}
                                    style={[
                                        styles.programChip,
                                        selectedProgram === prog.id && styles.programChipSelected
                                    ]}
                                    onPress={() => setSelectedProgram(prog.id)}
                                >
                                    <Text style={[
                                        styles.programChipText,
                                        { color: selectedProgram === prog.id ? '#fff' : theme.text }
                                    ]}>
                                        {prog.name}
                                    </Text>
                                    <Text style={[
                                        styles.programChipType,
                                        { color: selectedProgram === prog.id ? 'rgba(255,255,255,0.7)' : theme.tabIconDefault }
                                    ]}>
                                        {prog.program_type === 'weekly' ? 'Haftalık' : 'Aylık'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {selectedProgramData && (
                            <View style={styles.programInfo}>
                                <Text style={[styles.programNameLarge, { color: theme.text }]}>{selectedProgramData.name}</Text>
                                <Text style={[styles.programMeta, { color: theme.tabIconDefault }]}>
                                    {selectedProgramData.day_of_week || 'Aylık'}
                                    {selectedProgramData.time && ` • ${selectedProgramData.time}`}
                                </Text>
                            </View>
                        )}

                        {loadingAnalytics ? (
                            <View style={styles.loadingSection}>
                                <ActivityIndicator size="small" color={theme.tint} />
                                <Text style={[styles.loadingText, { color: theme.tabIconDefault }]}>Yükleniyor...</Text>
                            </View>
                        ) : analytics && (
                            <>
                                {/* Average Attendance */}
                                <View style={[styles.avgCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                                    <Text style={[styles.avgLabel, { color: theme.tabIconDefault }]}>Ortalama Katılım</Text>
                                    <Text style={[styles.avgValue, { color: theme.tint }]}>%{analytics.averageAttendance}</Text>
                                </View>

                                {/* Best & Worst Weeks */}
                                {analytics.bestWeeks && analytics.bestWeeks.length > 0 && (
                                    <View style={styles.bestWorstContainer}>
                                        <View style={[styles.bestWorstCard, { backgroundColor: isDark ? 'rgba(67, 233, 123, 0.15)' : 'rgba(67, 233, 123, 0.1)' }]}>
                                            <Text style={[styles.bestWorstTitle, { color: '#43e97b' }]}>🏆 En İyi 5 Hafta</Text>
                                            {analytics.bestWeeks.map((week: any, i: number) => (
                                                <View key={i} style={styles.weekRow}>
                                                    <Text style={[styles.weekDate, { color: theme.text }]}>
                                                        {new Date(week.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                    </Text>
                                                    <Text style={[styles.weekRate, { color: '#43e97b' }]}>%{week.rate}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        <View style={[styles.bestWorstCard, { backgroundColor: isDark ? 'rgba(255, 68, 68, 0.15)' : 'rgba(255, 68, 68, 0.1)' }]}>
                                            <Text style={[styles.bestWorstTitle, { color: '#ff4444' }]}>📉 En Düşük 5 Hafta</Text>
                                            {analytics.worstWeeks && analytics.worstWeeks.map((week: any, i: number) => (
                                                <View key={i} style={styles.weekRow}>
                                                    <Text style={[styles.weekDate, { color: theme.text }]}>
                                                        {new Date(week.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                    </Text>
                                                    <Text style={[styles.weekRate, { color: '#ff4444' }]}>%{week.rate}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Weekly Trend */}
                                {analytics.weeklyTrend && analytics.weeklyTrend.some((v: number) => v > 0) && (
                                    <View style={[styles.chartCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                                        <Text style={[styles.chartTitle, { color: theme.text }]}>Son 8 Hafta Trendi</Text>
                                        <LineChart
                                            data={{
                                                labels: ['8H', '7H', '6H', '5H', '4H', '3H', '2H', '1H'],
                                                datasets: [{ data: analytics.weeklyTrend.length > 0 ? analytics.weeklyTrend : [0] }]
                                            }}
                                            width={chartWidth - 30}
                                            height={180}
                                            chartConfig={chartConfig}
                                            bezier
                                            style={styles.chart}
                                            yAxisSuffix="%"
                                        />
                                    </View>
                                )}

                                {/* Monthly Data */}
                                {analytics.monthlyData && analytics.monthlyData.some((m: any) => m.rate > 0) && (
                                    <View style={[styles.chartCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                                        <Text style={[styles.chartTitle, { color: theme.text }]}>Aylık Karşılaştırma</Text>
                                        <BarChart
                                            data={{
                                                labels: analytics.monthlyData.map((m: any) => m.month),
                                                datasets: [{ data: analytics.monthlyData.map((m: any) => m.rate) }]
                                            }}
                                            width={chartWidth - 30}
                                            height={200}
                                            chartConfig={chartConfig}
                                            style={styles.chart}
                                            yAxisLabel=""
                                            yAxisSuffix="%"
                                        />
                                    </View>
                                )}

                                {/* Top 5 & Bottom 5 Students */}
                                {analytics.studentRankings && analytics.studentRankings.length > 0 && (
                                    <View style={styles.bestWorstContainer}>
                                        <View style={[styles.bestWorstCard, { backgroundColor: isDark ? 'rgba(67, 233, 123, 0.15)' : 'rgba(67, 233, 123, 0.1)' }]}>
                                            <Text style={[styles.bestWorstTitle, { color: '#43e97b' }]}>⭐ En Yüksek 5 Öğrenci</Text>
                                            {analytics.studentRankings.slice(0, 5).map((student: any, i: number) => (
                                                <View key={i} style={styles.weekRow}>
                                                    <Text style={[styles.weekDate, { color: theme.text }]} numberOfLines={1}>{student.name}</Text>
                                                    <Text style={[styles.weekRate, { color: '#43e97b' }]}>%{student.rate}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        <View style={[styles.bestWorstCard, { backgroundColor: isDark ? 'rgba(255, 68, 68, 0.15)' : 'rgba(255, 68, 68, 0.1)' }]}>
                                            <Text style={[styles.bestWorstTitle, { color: '#ff4444' }]}>📉 En Düşük 5 Öğrenci</Text>
                                            {analytics.studentRankings.slice(-5).reverse().map((student: any, i: number) => (
                                                <View key={i} style={styles.weekRow}>
                                                    <Text style={[styles.weekDate, { color: theme.text }]} numberOfLines={1}>{student.name}</Text>
                                                    <Text style={[styles.weekRate, { color: '#ff4444' }]}>%{student.rate}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Full Student Rankings */}
                                {analytics.studentRankings && analytics.studentRankings.length > 0 && (
                                    <View style={[styles.chartCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                                        <Text style={[styles.chartTitle, { color: theme.text }]}>Tüm Öğrenci Sıralaması</Text>
                                        {analytics.studentRankings.slice(0, 10).map((student: any, index: number) => (
                                            <View key={index} style={styles.rankRow}>
                                                <View style={[styles.rankBadge, { backgroundColor: index < 3 ? '#ffd700' : theme.tabIconDefault }]}>
                                                    <Text style={styles.rankNumber}>{index + 1}</Text>
                                                </View>
                                                <Text style={[styles.rankName, { color: theme.text }]} numberOfLines={1}>{student.name}</Text>
                                                <View style={styles.rankBar}>
                                                    <View style={[styles.rankFill, { width: `${student.rate}%`, backgroundColor: student.rate >= 80 ? '#43e97b' : student.rate >= 50 ? '#ffd93d' : '#ff4444' }]} />
                                                </View>
                                                <Text style={[styles.rankRate, { color: theme.tabIconDefault }]}>{student.rate}%</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20, paddingTop: 10 },
    generalStats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    generalCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12 },
    generalValue: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
    generalLabel: { fontSize: 11, marginTop: 2 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
    programSelector: { marginBottom: 15 },
    programChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 15, backgroundColor: 'rgba(150,150,150,0.15)', marginRight: 10, alignItems: 'center' },
    programChipSelected: { backgroundColor: '#4facfe' },
    programChipText: { fontSize: 14, fontWeight: '500' },
    programChipType: { fontSize: 10, marginTop: 2 },
    programInfo: { marginBottom: 15 },
    programNameLarge: { fontSize: 20, fontWeight: 'bold' },
    programMeta: { fontSize: 13, marginTop: 2 },
    loadingSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 30, gap: 10 },
    loadingText: { fontSize: 14 },
    avgCard: { alignItems: 'center', padding: 20, borderRadius: 15, marginBottom: 15 },
    avgLabel: { fontSize: 14 },
    avgValue: { fontSize: 48, fontWeight: 'bold', marginTop: 5 },
    bestWorstContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    bestWorstCard: { flex: 1, padding: 12, borderRadius: 12 },
    bestWorstTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    weekDate: { fontSize: 12 },
    weekRate: { fontSize: 12, fontWeight: '600' },
    chartCard: { borderRadius: 15, padding: 15, marginBottom: 15 },
    chartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    chart: { borderRadius: 10, marginLeft: -10 },
    rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    rankBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    rankNumber: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    rankName: { width: 80, fontSize: 13 },
    rankBar: { flex: 1, height: 8, backgroundColor: 'rgba(150,150,150,0.2)', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
    rankFill: { height: '100%', borderRadius: 4 },
    rankRate: { width: 40, textAlign: 'right', fontSize: 12 },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, marginTop: 15 },
    emptySubtext: { fontSize: 13, marginTop: 5 },
});
