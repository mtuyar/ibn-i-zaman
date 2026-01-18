import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, subYears, eachYearOfInterval, startOfYear, endOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';

import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { getTransactionStats, getTransactionsByDateRange, defaultCategories, Transaction } from '../../services/BudgetService';

const screenWidth = Dimensions.get('window').width;

export default function BudgetAnalyticsScreen() {
    const router = useRouter();
    const { user, isAdmin } = useAuth();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'month' | 'year' | 'all'>('month');
    const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, balance: 0, categoryTotals: {} as any });
    const [trendData, setTrendData] = useState<{ labels: string[], data: number[] }>({ labels: [], data: [] });
    const [topExpenses, setTopExpenses] = useState<Transaction[]>([]);

    useEffect(() => {
        loadData();
    }, [user, period, isAdmin]);

    const loadData = async () => {
        if (!user) return;
        try {
            setLoading(true);

            // 1. Current Period Stats
            const currentStats = await getTransactionStats(period, user, isAdmin);
            setStats(currentStats);

            // 2. Trend Data (Expense Trend)
            let labels: string[] = [];
            let data: number[] = [];
            const end = new Date();
            let start: Date;

            if (period === 'month') {
                // Daily trend for this month
                start = startOfMonth(end);
                const daysInMonth = end.getDate(); // Up to today
                // Actually let's show full month context or last 30 days? 
                // Let's show last 30 days for better trend view if "This Month" is selected, or just days of current month.
                // User asked for "This Month", so let's show days of current month.

                const txs = await getTransactionsByDateRange(start, end, user, isAdmin);

                // Aggregate by day
                const dailyData = new Array(end.getDate()).fill(0);
                txs.filter(t => t.type === 'expense').forEach(t => {
                    const day = t.date.getDate() - 1;
                    if (day >= 0) dailyData[day] += t.amount;
                });

                // Simplify labels
                for (let i = 1; i <= end.getDate(); i++) {
                    if (i % 5 === 0 || i === 1 || i === end.getDate()) {
                        labels.push(`${i}`);
                    } else {
                        labels.push('');
                    }
                    data.push(dailyData[i - 1]);
                }

            } else if (period === 'year') {
                // Monthly trend for this year
                start = startOfYear(end);
                const months = eachMonthOfInterval({ start, end });

                for (const month of months) {
                    const monthStart = startOfMonth(month);
                    const monthEnd = endOfMonth(month);
                    const txs = await getTransactionsByDateRange(monthStart, monthEnd, user, isAdmin);
                    const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

                    labels.push(format(month, 'MMM', { locale: tr }));
                    data.push(expense);
                }
            } else {
                // Yearly trend (Last 5 years)
                start = subYears(end, 4);
                const years = eachYearOfInterval({ start, end });

                for (const yearDate of years) {
                    const yearStart = startOfYear(yearDate);
                    const yearEnd = endOfYear(yearDate);
                    const txs = await getTransactionsByDateRange(yearStart, yearEnd, user, isAdmin);
                    const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

                    labels.push(format(yearDate, 'yyyy'));
                    data.push(expense);
                }
            }
            setTrendData({ labels, data });

            // 3. Top Expenses (Recent Large Expenses)
            // Fetch transactions for the period
            let periodStart: Date;
            if (period === 'month') periodStart = startOfMonth(new Date());
            else if (period === 'year') periodStart = startOfYear(new Date());
            else periodStart = new Date(2000, 0, 1);

            const periodTxs = await getTransactionsByDateRange(periodStart, new Date(), user, isAdmin);
            const largest = periodTxs
                .filter(t => t.type === 'expense')
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5);

            setTopExpenses(largest);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const chartConfig = {
        backgroundGradientFrom: isDark ? '#1E293B' : '#ffffff',
        backgroundGradientTo: isDark ? '#1E293B' : '#ffffff',
        color: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
        useShadowColorFromDataset: false,
        decimalPlaces: 0,
        labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
    };

    const pieData = Object.keys(stats.categoryTotals).map((catId, index) => {
        const category = defaultCategories.find(c => c.id === catId);
        return {
            name: category?.name || catId,
            population: stats.categoryTotals[catId],
            color: category?.color || '#ccc',
            legendFontColor: theme.text,
            legendFontSize: 12,
        };
    }).sort((a, b) => b.population - a.population);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Bütçe Analizi</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Period Selector */}
                <View style={[styles.periodSelector, { backgroundColor: theme.surface }]}>
                    <TouchableOpacity
                        style={[styles.periodBtn, period === 'month' && { backgroundColor: theme.tint }]}
                        onPress={() => setPeriod('month')}
                    >
                        <Text style={[styles.periodText, { color: period === 'month' ? '#fff' : theme.text }]}>Bu Ay</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodBtn, period === 'year' && { backgroundColor: theme.tint }]}
                        onPress={() => setPeriod('year')}
                    >
                        <Text style={[styles.periodText, { color: period === 'year' ? '#fff' : theme.text }]}>Bu Yıl</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodBtn, period === 'all' && { backgroundColor: theme.tint }]}
                        onPress={() => setPeriod('all')}
                    >
                        <Text style={[styles.periodText, { color: period === 'all' ? '#fff' : theme.text }]}>Tümü</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 50 }} />
                ) : (
                    <>
                        {/* Summary Cards */}
                        <View style={styles.summaryRow}>
                            <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)' }]}>
                                <Text style={[styles.summaryLabel, { color: theme.tabIconDefault }]}>Gelir</Text>
                                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>₺{stats.totalIncome.toLocaleString('tr-TR')}</Text>
                            </View>
                            <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 107, 107, 0.1)' }]}>
                                <Text style={[styles.summaryLabel, { color: theme.tabIconDefault }]}>Gider</Text>
                                <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>₺{stats.totalExpense.toLocaleString('tr-TR')}</Text>
                            </View>
                            <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
                                <Text style={[styles.summaryLabel, { color: theme.tabIconDefault }]}>Kasa</Text>
                                <Text style={[styles.summaryValue, { color: stats.balance >= 0 ? theme.text : '#FF6B6B' }]}>₺{stats.balance.toLocaleString('tr-TR')}</Text>
                            </View>
                        </View>

                        {/* Expense Breakdown */}
                        <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.chartTitle, { color: theme.text }]}>Gider Dağılımı</Text>
                            {pieData.length > 0 ? (
                                <PieChart
                                    data={pieData}
                                    width={screenWidth - 60}
                                    height={220}
                                    chartConfig={chartConfig}
                                    accessor={"population"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    center={[0, 0]}
                                    absolute
                                />
                            ) : (
                                <Text style={{ textAlign: 'center', color: theme.tabIconDefault, marginVertical: 20 }}>Veri yok</Text>
                            )}
                        </View>

                        {/* Expense Trend */}
                        <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.chartTitle, { color: theme.text }]}>Gider Trendi</Text>
                            {trendData.data.length > 0 && trendData.data.some(v => v > 0) ? (
                                <LineChart
                                    data={{
                                        labels: trendData.labels,
                                        datasets: [{ data: trendData.data }]
                                    }}
                                    width={screenWidth - 60}
                                    height={220}
                                    yAxisLabel="₺"
                                    yAxisSuffix=""
                                    chartConfig={{
                                        ...chartConfig,
                                        color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`, // Red for expense
                                        propsForDots: {
                                            r: "4",
                                            strokeWidth: "2",
                                            stroke: "#ffa726"
                                        }
                                    }}
                                    bezier
                                    style={{ marginVertical: 8, borderRadius: 16 }}
                                />
                            ) : (
                                <Text style={{ textAlign: 'center', color: theme.tabIconDefault, marginVertical: 20 }}>Veri yok</Text>
                            )}
                        </View>

                        {/* Top Expenses List */}
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>En Büyük Giderler</Text>
                        </View>

                        {topExpenses.length > 0 ? (
                            topExpenses.map((tx) => {
                                const category = defaultCategories.find(c => c.id === tx.category);
                                return (
                                    <View key={tx.id} style={[styles.expenseCard, { backgroundColor: theme.surface }]}>
                                        <View style={[styles.iconContainer, { backgroundColor: category?.color || '#ccc' }]}>
                                            <MaterialCommunityIcons name={category?.icon as any || 'cash'} size={24} color="#fff" />
                                        </View>
                                        <View style={styles.expenseInfo}>
                                            <Text style={[styles.expenseTitle, { color: theme.text }]}>{category?.name || 'Diğer'}</Text>
                                            <Text style={[styles.expenseDesc, { color: theme.tabIconDefault }]} numberOfLines={1}>{tx.description || 'Açıklama yok'}</Text>
                                        </View>
                                        <View style={styles.expenseAmountContainer}>
                                            <Text style={[styles.expenseAmount, { color: '#FF6B6B' }]}>-₺{tx.amount.toLocaleString('tr-TR')}</Text>
                                            <Text style={[styles.expenseDate, { color: theme.tabIconDefault }]}>{format(tx.date, 'd MMM', { locale: tr })}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <Text style={{ textAlign: 'center', color: theme.tabIconDefault, marginTop: 10 }}>Bu dönemde gider bulunamadı</Text>
                        )}
                    </>
                )}
                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20, paddingBottom: 50 },
    periodSelector: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: 20 },
    periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    periodText: { fontWeight: '600', fontSize: 14 },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    summaryCard: { flex: 1, padding: 12, borderRadius: 16, justifyContent: 'center' },
    summaryLabel: { fontSize: 12, marginBottom: 5 },
    summaryValue: { fontSize: 16, fontWeight: 'bold' },
    chartCard: { padding: 15, borderRadius: 16, marginBottom: 20, alignItems: 'center' },
    chartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15, alignSelf: 'flex-start' },
    sectionHeader: { marginBottom: 15, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '600' },
    expenseCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 10 },
    iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    expenseInfo: { flex: 1 },
    expenseTitle: { fontSize: 16, fontWeight: '600' },
    expenseDesc: { fontSize: 12, marginTop: 2 },
    expenseAmountContainer: { alignItems: 'flex-end' },
    expenseAmount: { fontSize: 16, fontWeight: 'bold' },
    expenseDate: { fontSize: 12, marginTop: 2 },
});
