import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme, RefreshControl, Alert } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';
import { getIncomingDonations, IncomingDonation, addDonation } from '../../../services/DonorService';
import { format, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function IncomingDonationsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [incoming, setIncoming] = useState<IncomingDonation[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const loadData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await getIncomingDonations(user, currentMonth);
            setIncoming(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentMonth]);

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    const handleMarkAsPaid = async (item: IncomingDonation) => {
        if (!user) return;
        Alert.alert(
            'Ödeme Onayı',
            `${item.donorName} için ₺${item.expectedAmount} tutarındaki bağışı onaylıyor musunuz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Onayla',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await addDonation({
                                donorId: item.donorId,
                                amount: item.expectedAmount,
                                category: item.category,
                                periodicity: item.periodicity,
                                date: new Date(), // Today
                                description: `${format(currentMonth, 'MMMM', { locale: tr })} ayı düzenli bağışı`,
                            }, user);
                            loadData(); // Reload to update status
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Hata', 'İşlem sırasında bir hata oluştu.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const filteredIncoming = incoming.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'paid') return item.status === 'paid';
        if (filter === 'unpaid') return item.status === 'unpaid' || item.status === 'partial';
        return true;
    });

    const totalExpected = incoming.reduce((sum, item) => sum + item.expectedAmount, 0);
    const totalPaid = incoming.reduce((sum, item) => sum + item.paidAmount, 0);

    const renderItem = (item: IncomingDonation, index: number) => (
        <View key={`${item.donorId}-${index}`} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
            <View style={[styles.icon, { backgroundColor: item.category === 'zakat' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)' }]}>
                <Ionicons
                    name={item.category === 'zakat' ? 'leaf' : item.category === 'aid' ? 'heart' : 'cash'}
                    size={20}
                    color={item.category === 'zakat' ? '#4CAF50' : '#2196F3'}
                />
            </View>
            <View style={styles.info}>
                <Text style={[styles.name, { color: theme.text }]}>{item.donorName}</Text>
                <Text style={[styles.meta, { color: theme.tabIconDefault }]}>
                    {item.periodicity === 'weekly' ? 'Haftalık' : 'Aylık'} • {item.category === 'zakat' ? 'Zekat' : item.category === 'aid' ? 'Yardım' : 'Aidat'}
                </Text>
            </View>
            <View style={styles.amountContainer}>
                <Text style={[styles.amount, { color: theme.text }]}>₺{item.expectedAmount.toLocaleString('tr-TR')}</Text>
                {item.status === 'paid' ? (
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: '#4CAF50' }]}>Ödendi</Text>
                    </View>
                ) : item.status === 'partial' ? (
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: '#FF9800' }]}>Kısmi: ₺{item.paidAmount}</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.payBtn, { backgroundColor: theme.tint }]}
                        onPress={() => handleMarkAsPaid(item)}
                    >
                        <Text style={styles.payBtnText}>Öde</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Beklenen Bağışlar</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.monthText, { color: theme.text }]}>
                    {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthBtn}>
                    <Ionicons name="chevron-forward" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: theme.tint }]}>
                <View style={styles.summaryRow}>
                    <View>
                        <Text style={styles.summaryLabel}>Toplam Beklenen</Text>
                        <Text style={styles.summaryValue}>₺{totalExpected.toLocaleString('tr-TR')}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View>
                        <Text style={styles.summaryLabel}>Tahsil Edilen</Text>
                        <Text style={styles.summaryValue}>₺{totalPaid.toLocaleString('tr-TR')}</Text>
                    </View>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'all' && { backgroundColor: theme.tint }]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, { color: filter === 'all' ? '#fff' : theme.text }]}>Tümü</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'unpaid' && { backgroundColor: theme.tint }]}
                    onPress={() => setFilter('unpaid')}
                >
                    <Text style={[styles.filterText, { color: filter === 'unpaid' ? '#fff' : theme.text }]}>Bekleyen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'paid' && { backgroundColor: theme.tint }]}
                    onPress={() => setFilter('paid')}
                >
                    <Text style={[styles.filterText, { color: filter === 'paid' ? '#fff' : theme.text }]}>Ödenen</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={theme.tint} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 20 }} />
                ) : filteredIncoming.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={50} color={theme.tabIconDefault} />
                        <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>
                            {filter === 'all' ? 'Bu ay için beklenen bağış yok' : filter === 'paid' ? 'Ödenmiş bağış yok' : 'Bekleyen bağış yok'}
                        </Text>
                    </View>
                ) : (
                    filteredIncoming.map((item, index) => renderItem(item, index))
                )}
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
    monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    monthBtn: { padding: 10 },
    monthText: { fontSize: 18, fontWeight: '600' },
    summaryCard: { marginHorizontal: 20, padding: 20, borderRadius: 16, marginBottom: 20 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
    summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 5, textAlign: 'center' },
    summaryValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    filterContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, gap: 10 },
    filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
    filterText: { fontSize: 14, fontWeight: '500' },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 12 },
    icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    meta: { fontSize: 12 },
    amountContainer: { alignItems: 'flex-end' },
    amount: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: '600' },
    payBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    payBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 14, marginTop: 10 },
});
