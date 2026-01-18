import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useColorScheme, TextInput, Image, Modal, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

import Colors from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';
import { Transaction, getTransactionsByDateRange, defaultCategories } from '../../../services/BudgetService';
import { getAllUsers, User as AppUser } from '../../../services/UserService';

type DateRangeOption = 'this_month' | 'prev_month' | 'this_year' | 'all_time';
type SortOption = 'date_desc' | 'amount_desc' | 'amount_asc';

export default function TransactionsScreen() {
    const router = useRouter();
    const { user, isAdmin } = useAuth();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter State
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

    // Active Filters (Applied)
    const [dateRange, setDateRange] = useState<DateRangeOption>('this_month');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('date_desc');
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);

    // Pending Filters (Modal State)
    const [pendingDateRange, setPendingDateRange] = useState<DateRangeOption>('this_month');
    const [pendingFilterType, setPendingFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [pendingSortBy, setPendingSortBy] = useState<SortOption>('date_desc');
    const [pendingSelectedUserId, setPendingSelectedUserId] = useState<string | undefined>(undefined);

    // Admin User Filter
    const [users, setUsers] = useState<AppUser[]>([]);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    useEffect(() => {
        loadData();
    }, [user, dateRange, isAdmin, selectedUserId]); // Reload when main filters change

    const openFilterModal = () => {
        setPendingDateRange(dateRange);
        setPendingFilterType(filterType);
        setPendingSortBy(sortBy);
        setPendingSelectedUserId(selectedUserId);
        setIsFilterModalVisible(true);
    };

    const applyFilters = () => {
        setDateRange(pendingDateRange);
        setFilterType(pendingFilterType);
        setSortBy(pendingSortBy);
        setSelectedUserId(pendingSelectedUserId);
        setIsFilterModalVisible(false);
    };

    const fetchUsers = async () => {
        try {
            const allUsers = await getAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const loadData = async () => {
        if (!user) return;
        try {
            setLoading(true);

            let start: Date;
            let end: Date = new Date(); // Default end is now

            const now = new Date();

            switch (dateRange) {
                case 'this_month':
                    start = startOfMonth(now);
                    end = endOfMonth(now);
                    break;
                case 'prev_month':
                    const prev = subMonths(now, 1);
                    start = startOfMonth(prev);
                    end = endOfMonth(prev);
                    break;
                case 'this_year':
                    start = startOfYear(now);
                    end = endOfYear(now);
                    break;
                case 'all_time':
                    start = new Date(2000, 0, 1); // Way back
                    break;
                default:
                    start = startOfMonth(now);
                    end = endOfMonth(now);
            }

            const data = await getTransactionsByDateRange(start, end, user, isAdmin, selectedUserId);
            setTransactions(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredAndSortedTransactions = () => {
        let result = transactions.filter(t => {
            // 1. Type Filter
            if (filterType !== 'all' && t.type !== filterType) return false;

            // 2. Search Filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const category = defaultCategories.find(c => c.id === t.category);
                return (
                    t.description?.toLowerCase().includes(query) ||
                    category?.name.toLowerCase().includes(query) ||
                    t.userName?.toLowerCase().includes(query)
                );
            }
            return true;
        });

        // 3. Sorting
        result.sort((a, b) => {
            switch (sortBy) {
                case 'date_desc':
                    return b.date.getTime() - a.date.getTime();
                case 'amount_desc':
                    return b.amount - a.amount;
                case 'amount_asc':
                    return a.amount - b.amount;
                default:
                    return 0;
            }
        });

        return result;
    };

    const filteredTransactions = getFilteredAndSortedTransactions();

    const getDateRangeLabel = () => {
        switch (dateRange) {
            case 'this_month': return 'Bu Ay';
            case 'prev_month': return 'Geçen Ay';
            case 'this_year': return 'Bu Yıl';
            case 'all_time': return 'Tüm Zamanlar';
            default: return '';
        }
    };

    const renderTransactionItem = ({ item, index }: { item: Transaction, index: number }) => {
        const category = defaultCategories.find(c => c.id === item.category);
        return (
            <View style={[styles.transactionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                <View style={[
                    styles.transactionIcon,
                    { backgroundColor: (category?.color || '#A8E6CF') + '15' }
                ]}>
                    <MaterialCommunityIcons
                        name={category?.icon as any}
                        size={20}
                        color={category?.color}
                    />
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionDescription, { color: theme.text }]}>
                        {item.description || category?.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.transactionDate, { color: theme.tabIconDefault }]}>
                            {format(item.date, 'd MMMM yyyy', { locale: tr })}
                        </Text>
                        {item.userName && (
                            <Text style={{ fontSize: 11, color: theme.tint, backgroundColor: theme.tint + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                                {item.userName.split(' ')[0]}
                            </Text>
                        )}
                    </View>
                </View>
                <Text
                    style={[
                        styles.transactionAmount,
                        { color: item.type === 'income' ? '#4CAF50' : '#FF6B6B' },
                    ]}
                >
                    {item.type === 'income' ? '+' : '-'}₺{item.amount.toFixed(0)}
                </Text>
            </View>
        );
    };

    const FilterModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isFilterModalVisible}
            onRequestClose={() => setIsFilterModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Filtrele & Sırala</Text>
                        <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Date Range */}
                        <Text style={[styles.sectionTitle, { color: theme.tabIconDefault }]}>Tarih Aralığı</Text>
                        <View style={styles.optionsContainer}>
                            {(['this_month', 'prev_month', 'this_year', 'all_time'] as DateRangeOption[]).map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionChip, pendingDateRange === option && { backgroundColor: theme.tint, borderColor: theme.tint }]}
                                    onPress={() => setPendingDateRange(option)}
                                >
                                    <Text style={[styles.optionText, { color: pendingDateRange === option ? '#fff' : theme.text }]}>
                                        {option === 'this_month' ? 'Bu Ay' :
                                            option === 'prev_month' ? 'Geçen Ay' :
                                                option === 'this_year' ? 'Bu Yıl' : 'Tüm Zamanlar'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Transaction Type */}
                        <Text style={[styles.sectionTitle, { color: theme.tabIconDefault }]}>İşlem Türü</Text>
                        <View style={styles.optionsContainer}>
                            {(['all', 'income', 'expense'] as const).map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionChip, pendingFilterType === option && { backgroundColor: theme.tint, borderColor: theme.tint }]}
                                    onPress={() => setPendingFilterType(option)}
                                >
                                    <Text style={[styles.optionText, { color: pendingFilterType === option ? '#fff' : theme.text }]}>
                                        {option === 'all' ? 'Hepsi' : option === 'income' ? 'Gelir' : 'Gider'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Sort By */}
                        <Text style={[styles.sectionTitle, { color: theme.tabIconDefault }]}>Sıralama</Text>
                        <View style={styles.optionsContainer}>
                            <TouchableOpacity
                                style={[styles.optionChip, pendingSortBy === 'date_desc' && { backgroundColor: theme.tint, borderColor: theme.tint }]}
                                onPress={() => setPendingSortBy('date_desc')}
                            >
                                <Text style={[styles.optionText, { color: pendingSortBy === 'date_desc' ? '#fff' : theme.text }]}>Tarih (Yeni)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.optionChip, pendingSortBy === 'amount_desc' && { backgroundColor: theme.tint, borderColor: theme.tint }]}
                                onPress={() => setPendingSortBy('amount_desc')}
                            >
                                <Text style={[styles.optionText, { color: pendingSortBy === 'amount_desc' ? '#fff' : theme.text }]}>Tutar (Yüksek)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.optionChip, pendingSortBy === 'amount_asc' && { backgroundColor: theme.tint, borderColor: theme.tint }]}
                                onPress={() => setPendingSortBy('amount_asc')}
                            >
                                <Text style={[styles.optionText, { color: pendingSortBy === 'amount_asc' ? '#fff' : theme.text }]}>Tutar (Düşük)</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Admin User Filter */}
                        {isAdmin && (
                            <>
                                <Text style={[styles.sectionTitle, { color: theme.tabIconDefault }]}>Kişi</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
                                    <TouchableOpacity
                                        style={[styles.userOption, !pendingSelectedUserId && { backgroundColor: theme.tint }]}
                                        onPress={() => setPendingSelectedUserId(undefined)}
                                    >
                                        <Text style={[styles.userOptionText, { color: !pendingSelectedUserId ? '#fff' : theme.text }]}>Hepsi</Text>
                                    </TouchableOpacity>
                                    {users.map(u => (
                                        <TouchableOpacity
                                            key={u.id}
                                            style={[styles.userOption, pendingSelectedUserId === u.id && { backgroundColor: theme.tint }]}
                                            onPress={() => setPendingSelectedUserId(u.id)}
                                        >
                                            <Text style={[styles.userOptionText, { color: pendingSelectedUserId === u.id ? '#fff' : theme.text }]}>
                                                {u.displayName || u.email?.split('@')[0]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: theme.tint }]}
                        onPress={applyFilters}
                    >
                        <Text style={styles.applyButtonText}>Uygula</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Geçmiş İşlemler</Text>
                <TouchableOpacity onPress={openFilterModal} style={styles.filterIconBtn}>
                    <Ionicons name="options" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Active Filters Summary */}
                <View style={styles.activeFiltersContainer}>
                    <View style={[styles.activeFilterChip, { backgroundColor: theme.surface }]}>
                        <Ionicons name="calendar-outline" size={14} color={theme.tabIconDefault} style={{ marginRight: 4 }} />
                        <Text style={[styles.activeFilterText, { color: theme.text }]}>{getDateRangeLabel()}</Text>
                    </View>
                    {filterType !== 'all' && (
                        <View style={[styles.activeFilterChip, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.activeFilterText, { color: theme.text }]}>
                                {filterType === 'income' ? 'Gelir' : 'Gider'}
                            </Text>
                        </View>
                    )}
                    {isAdmin && selectedUserId && (
                        <View style={[styles.activeFilterChip, { backgroundColor: theme.surface }]}>
                            <Ionicons name="person-outline" size={14} color={theme.tabIconDefault} style={{ marginRight: 4 }} />
                            <Text style={[styles.activeFilterText, { color: theme.text }]}>
                                {users.find(u => u.id === selectedUserId)?.displayName || 'Kullanıcı'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
                    <Ionicons name="search" size={20} color={theme.tabIconDefault} style={{ marginRight: 10 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="İşlem ara..."
                        placeholderTextColor={theme.tabIconDefault}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={theme.tabIconDefault} />
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={filteredTransactions}
                        renderItem={renderTransactionItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="receipt-outline" size={50} color={theme.tabIconDefault} />
                                <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>İşlem bulunamadı</Text>
                            </View>
                        }
                    />
                )}
            </View>
            <FilterModal />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    filterIconBtn: { padding: 5 },
    content: { flex: 1, paddingHorizontal: 20 },
    activeFiltersContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
    activeFilterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    activeFilterText: { fontSize: 13, fontWeight: '500' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 15 },
    searchInput: { flex: 1, fontSize: 16 },
    listContent: { paddingBottom: 50 },
    transactionCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 10 },
    transactionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    transactionInfo: { flex: 1 },
    transactionDescription: { fontSize: 16, fontWeight: '500' },
    transactionDate: { fontSize: 13, marginTop: 2 },
    transactionAmount: { fontSize: 16, fontWeight: 'bold' },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 15, marginTop: 10 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 10 },
    optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(150,150,150,0.1)' },
    optionText: { fontSize: 14, fontWeight: '500' },
    userOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.1)', marginRight: 8 },
    userOptionText: { fontSize: 14, fontWeight: '500' },
    applyButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
    applyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
