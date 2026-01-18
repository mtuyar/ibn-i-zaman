import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import Colors from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';
import { getDonorAnalytics, Donor } from '../../../services/DonorService';

const screenWidth = Dimensions.get('window').width;

export default function DonorAnalyticsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);
    const [period, setPeriod] = useState<'month' | 'year' | 'all'>('year');

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        loadData();
    }, [user, period]);

    const loadData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await getDonorAnalytics(user, period);
            setAnalytics(data);
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
    };

    const pieData = analytics ? Object.keys(analytics.categoryTotals).map((cat, index) => {
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0'];
        const labels: { [key: string]: string } = { 'zakat': 'Zekat', 'aid': 'Yardım', 'dues': 'Aidat', 'other': 'Diğer' };
        return {
            name: labels[cat] || cat,
            population: analytics.categoryTotals[cat],
            color: colors[index % colors.length],
            legendFontColor: theme.text,
            legendFontSize: 12,
        };
    }).sort((a, b) => b.population - a.population) : [];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Bağış Analizi</Text>
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

                {loading || !analytics ? (
                    <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 50 }} />
                ) : (
                    <>
                        {/* Summary Cards */}
                        <View style={styles.summaryRow}>
                            <View style={[styles.summaryCard, { backgroundColor: theme.tint }]}>
                                <Text style={styles.summaryLabel}>Toplam Bağış</Text>
                                <Text style={styles.summaryValue}>₺{analytics.totalDonations.toLocaleString('tr-TR')}</Text>
                            </View>
                            <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
                                <Text style={[styles.summaryLabel, { color: theme.tabIconDefault }]}>Bağışçı Sayısı</Text>
                                <Text style={[styles.summaryValue, { color: theme.text }]}>{analytics.totalDonors}</Text>
                            </View>
                        </View>

                        {/* Category Breakdown */}
                        <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.chartTitle, { color: theme.text }]}>Kategori Dağılımı</Text>
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

                        {/* Trend Chart */}
                        <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.chartTitle, { color: theme.text }]}>
                                {period === 'month' ? 'Günlük Trend' : period === 'year' ? 'Aylık Trend' : 'Yıllık Trend'}
                            </Text>
                            {analytics.trends.length > 0 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <BarChart
                                        data={{
                                            labels: analytics.trends.map((t: any) => t.label),
                                            datasets: [{ data: analytics.trends.map((t: any) => t.amount) }]
                                        }}
                                        width={Math.max(screenWidth - 60, analytics.trends.length * 40)}
                                        height={220}
                                        yAxisLabel="₺"
                                        yAxisSuffix=""
                                        chartConfig={{
                                            ...chartConfig,
                                            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                                        }}
                                        verticalLabelRotation={0}
                                        showValuesOnTopOfBars
                                    />
                                </ScrollView>
                            ) : (
                                <Text style={{ textAlign: 'center', color: theme.tabIconDefault, marginVertical: 20 }}>Veri yok</Text>
                            )}
                        </View>

                        {/* Top Donors */}
                        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>En Çok Bağış Yapanlar</Text>
                        </View>

                        {analytics.topDonors.length > 0 ? (
                            analytics.topDonors.map((donor: any, index: number) => (
                                <View key={donor.id} style={[styles.donorCard, { backgroundColor: theme.surface }]}>
                                    <View style={styles.rankBadge}>
                                        <Text style={styles.rankText}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.donorInfo}>
                                        <Text style={[styles.donorName, { color: theme.text }]}>{donor.name}</Text>
                                        <Text style={[styles.donorMeta, { color: theme.tabIconDefault }]}>
                                            {period === 'month' ? 'Bu Ay' : period === 'year' ? 'Bu Yıl' : 'Toplam'}:
                                            {/* Note: lastDonationDate might not be relevant if we are showing period totals, but still good to show */}
                                        </Text>
                                    </View>
                                    <Text style={[styles.donorAmount, { color: theme.tint }]}>
                                        ₺{donor.totalDonated.toLocaleString('tr-TR')}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{ textAlign: 'center', color: theme.tabIconDefault, marginTop: 10 }}>Bu dönemde bağış bulunamadı</Text>
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
    content: { padding: 20 },
    periodSelector: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: 20 },
    periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    periodText: { fontWeight: '600', fontSize: 14 },
    summaryRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    summaryCard: { flex: 1, padding: 20, borderRadius: 16, justifyContent: 'center' },
    summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 5 },
    summaryValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    chartCard: { padding: 15, borderRadius: 16, marginBottom: 20, alignItems: 'center' },
    chartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15, alignSelf: 'flex-start' },
    sectionHeader: { marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '600' },
    donorCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 10 },
    rankBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    rankText: { fontWeight: 'bold', color: '#666' },
    donorInfo: { flex: 1 },
    donorName: { fontSize: 16, fontWeight: '600' },
    donorMeta: { fontSize: 12, marginTop: 2 },
    donorAmount: { fontSize: 16, fontWeight: 'bold' },
});
