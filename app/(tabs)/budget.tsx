import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Colors from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { format, subDays, subMonths, subYears, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Transaction,
  TransactionType,
  Category,
  defaultCategories,
  addTransaction as addBudgetTransaction,
  deleteTransaction as deleteBudgetTransaction,
  getTransactions as getBudgetTransactions,
  getUserCategories as getBudgetUserCategories,
  getTransactionsAdminAware,
  getTransactionsByRangePaged,
  getTopSpendersByRange,
} from '../../services/BudgetService';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

type TabType = 'overview' | 'transactions' | 'analysis';

interface DataPoint {
  x: number;
  y: number;
  index: number;
  dataPointText: string;
}

interface BudgetStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryTotals: { [key: string]: number };
  periodStats: {
    weekly: { income: number; expense: number };
    monthly: { income: number; expense: number };
    yearly: { income: number; expense: number };
  };
}

const ITEMS_PER_PAGE = 10;
const OVERVIEW_PERIOD_DAYS = 14; // Özet sayfası için son 2 hafta

function calculateStats(sourceTransactions: Transaction[], period: 'week' | 'month' | 'year' = 'month'): BudgetStats {
  const today = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = subDays(today, 7);
      break;
    case 'month':
      startDate = subMonths(today, 1);
      break;
    case 'year':
      startDate = subYears(today, 1);
      break;
    default:
      startDate = subMonths(today, 1);
  }

  const filteredTransactions = sourceTransactions.filter(t => t.date >= startDate && t.date <= today);

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const categoryTotals: { [key: string]: number } = {};
  filteredTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const calcPeriod = (days: number) => {
    const periodStart = subDays(today, days);
    const periodTransactions = sourceTransactions.filter(t => t.date >= periodStart && t.date <= today);
    return {
      income: periodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      expense: periodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    };
  };

  const calcWeeklyStats = () => {
    const weekStart = subDays(today, 7);
    const weekTransactions = sourceTransactions.filter(t => t.date >= weekStart && t.date <= today);
    return {
      income: weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      expense: weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    };
  };

  const calcMonthlyStats = () => {
    const monthStart = subMonths(today, 1);
    const monthTransactions = sourceTransactions.filter(t => t.date >= monthStart && t.date <= today);
    return {
      income: monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      expense: monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    };
  };

  const calcYearlyStats = () => {
    const yearStart = subYears(today, 1);
    const yearTransactions = sourceTransactions.filter(t => t.date >= yearStart && t.date <= today);
    return {
      income: yearTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      expense: yearTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    };
  };

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    categoryTotals,
    periodStats: {
      weekly: calcWeeklyStats(),
      monthly: calcMonthlyStats(),
      yearly: calcYearlyStats(),
    },
  };
}

export default function BudgetScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isAdmin } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [stats, setStats] = useState<BudgetStats>(calculateStats([], 'month'));
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategories[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [showTabFilters, setShowTabFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [lastCursor, setLastCursor] = useState<any>(null);
  const [spenderRange, setSpenderRange] = useState<'month' | 'all'>('month');
  const [spenderMonth, setSpenderMonth] = useState<Date>(new Date());
  const [globalTopSpenders, setGlobalTopSpenders] = useState<Array<{ userId: string; userName: string; amount: number }>>([]);
  const [globalTopSpendersTotal, setGlobalTopSpendersTotal] = useState<number>(0);

  // Global top spenders, everyone can view; only admins see filters
  const fetchTopSpenders = useCallback(async () => {
    try {
      const today = new Date();
      let startDate: Date;
      let endDate: Date = today;
      if (spenderRange === 'all') {
        startDate = new Date(1970, 0, 1);
      } else {
        const base = spenderMonth || today;
        startDate = new Date(base.getFullYear(), base.getMonth(), 1);
        endDate = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
      }
      const res = await getTopSpendersByRange({ startDate, endDate, limit: 5 });
      setGlobalTopSpenders(res.top);
      setGlobalTopSpendersTotal(res.totalExpense || 0);
    } catch (e) {
      console.error('Top spenders fetch error', e);
      setGlobalTopSpenders([]);
      setGlobalTopSpendersTotal(0);
    }
  }, [spenderRange, spenderMonth]);

  useEffect(() => {
    fetchTopSpenders();
  }, [fetchTopSpenders, refreshing]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      // Determine date range - don't use selectedDate here to avoid reloading
      const today = new Date();
      let startDate: Date;
      let endDate: Date = today;
      
      if (activeTab === 'overview') {
        // Overview tab - load last 14 days
        startDate = subDays(today, 14);
        endDate = today;
      } else if (activeTab === 'transactions') {
        // Transactions tab - load last 6 months to have enough data for date filtering
        startDate = subMonths(today, 6);
        endDate = today;
      } else {
        // Analysis tab - load more data to ensure all periods have sufficient data
        startDate = subYears(today, 2); // Load 2 years of data to cover all periods
        endDate = today;
      }

      const [firstPage, cats] = await Promise.all([
        getTransactionsByRangePaged({
          user,
          isAdmin,
          startDate,
          endDate,
          pageSize: ITEMS_PER_PAGE,
          lastDoc: null,
        }),
        getBudgetUserCategories(user).catch(() => defaultCategories),
      ]);

      setTransactions(firstPage.items);
      setLastCursor(firstPage.lastDoc || null);
      setHasMore((firstPage.items?.length || 0) === ITEMS_PER_PAGE);
      setCategories(cats && cats.length ? cats : defaultCategories);
      setStats(calculateStats(firstPage.items, selectedPeriod));
      
      // Also fetch top spenders for analysis page
      if (activeTab === 'analysis' || refreshing) {
        fetchTopSpenders();
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user, isAdmin, selectedPeriod, activeTab, refreshing, fetchTopSpenders]);

  const handleDeleteTransaction = useCallback((transactionId: string) => {
    Alert.alert(
      'İşlemi Sil',
      'Bu işlemi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudgetTransaction(transactionId);
              setTransactions(prev => prev.filter(t => t.id !== transactionId));
              setStats(calculateStats(transactions.filter(t => t.id !== transactionId), selectedPeriod));
            } catch (error) {
              Alert.alert('Hata', 'İşlem silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  }, [transactions, selectedPeriod]);

  // Memoize filtered transactions
  const paginatedTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (activeTab === 'transactions') {
      // İşlemler sekmesinde önce periyot filtresini uygula
      const today = new Date();
      let startDate: Date;
      switch (selectedPeriod) {
        case 'week':
          startDate = subDays(today, 7);
          break;
        case 'month':
          startDate = subMonths(today, 1);
          break;
        case 'year':
          startDate = subYears(today, 1);
          break;
        default:
          startDate = subMonths(today, 1);
      }
      filtered = filtered.filter(t => t.date >= startDate && t.date <= today);
      
      // Eğer belirli bir tarih seçilmişse, onu da uygula
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        filtered = filtered.filter(t => format(t.date, 'yyyy-MM-dd') === dateStr);
      }
    } else if (activeTab === 'overview') {
      // Özet için son 14 gün
      const today = new Date();
      const startDate = subDays(today, 14);
      filtered = filtered.filter(t => t.date >= startDate && t.date <= today);
    } else {
      // Analiz sekmesi - transaction listesi için son 30 günü göster
      // (istatistikler ayrı olarak doğru periyotlarda hesaplanıyor)
      const today = new Date();
      const startDate = subDays(today, 30); // Son 30 günün transaction'larını göster
      filtered = filtered.filter(t => t.date >= startDate && t.date <= today);
    }

    // Tür ve kategori filtreleri
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    if (filterCategory) {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
    return filtered;
  }, [transactions, selectedDate, selectedPeriod, activeTab, filterType, filterCategory]);

  // Memoize grouped transactions
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    // First, remove duplicate transactions by ID
    const uniqueTransactions = paginatedTransactions.filter((transaction, index, self) => 
      index === self.findIndex(t => t.id === transaction.id)
    );
    
    uniqueTransactions.forEach(transaction => {
      const dateKey = format(transaction.date, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [paginatedTransactions]);

  const renderTransactionItem = useCallback(({ item: [dateKey, dayTransactions] }: { item: [string, Transaction[]] }) => {
    return (
      <View>
        <View style={styles.dateHeader}>
          <Text style={[styles.dateHeaderText, { color: theme.textDim }]}>
            {format(new Date(dateKey), 'd MMMM yyyy', { locale: tr })}
          </Text>
          <Text style={[styles.dateTotal, { color: theme.textDim }]}>
            ₺{dayTransactions.reduce((sum, t) => 
              sum + (t.type === 'income' ? t.amount : -t.amount), 0).toFixed(0)}
          </Text>
        </View>
        {dayTransactions.map((transaction, transactionIndex) => {
          const category = categories.find(cat => cat.id === transaction.category);
          return (
            <TouchableOpacity
              key={`${transaction.id}-${transactionIndex}-${dateKey}`}
              style={[styles.transactionCard, { backgroundColor: theme.surface }]}
              onPress={() => {/* TODO: İşlem detayı */}}
            >
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
                  {transaction.description}
                </Text>
                <Text style={[styles.transactionCategory, { color: theme.textDim }]}>
                  {category?.name}
                </Text>
              </View>
              <View style={styles.transactionAmountContainer}>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'income' ? '#4CAF50' : '#FF6B6B' },
                  ]}
                >
                  {transaction.type === 'income' ? '+' : '-'}₺{transaction.amount.toFixed(0)}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTransaction(transaction.id)}
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={18}
                    color={theme.error}
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [theme, categories, handleDeleteTransaction]);

  const renderTransactionList = () => {
    // Use the already filtered and memoized paginatedTransactions
    if (paginatedTransactions.length === 0) {
      return (
        <View style={[styles.emptyStateContainer, { backgroundColor: theme.surface }]}> 
          <MaterialCommunityIcons
            name="cash-remove"
            size={48}
            color={theme.textDim}
            style={styles.emptyStateIcon}
          />
          <Text style={[styles.emptyStateText, { color: theme.textDim }]}> 
            {activeTab === 'overview' ? 'Son 14 günde işlem bulunmuyor' : 
             selectedDate ? `${format(selectedDate, 'd MMMM yyyy', { locale: tr })} tarihinde işlem bulunmuyor` : 
             'Bu dönemde işlem bulunmuyor'}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={groupedTransactions}
        renderItem={renderTransactionItem}
        keyExtractor={([dateKey], index) => `${dateKey}-${index}`}
        onEndReached={loadMoreTransactions}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && !isLoadingMore ? (
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: theme.surface }]}
              onPress={loadMoreTransactions}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.loadMoreText, { color: theme.primary }]}> 
                Daha Fazla Göster
              </Text>
            </TouchableOpacity>
          ) : isLoadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null
        }
      />
    );
  };

  const loadMoreTransactions = useCallback(async () => {
    if (!hasMore || isLoadingMore || !user) return;
    setIsLoadingMore(true);
    try {
      const today = new Date();
      let startDate: Date;
      let endDate: Date = today;
      
      if (activeTab === 'overview') {
        // Overview tab - load last 14 days
        startDate = subDays(today, 14);
        endDate = today;
      } else if (activeTab === 'transactions') {
        // Transactions tab - load last 6 months to have enough data for date filtering
        startDate = subMonths(today, 6);
        endDate = today;
      } else {
        // Analysis tab - load more data to ensure all periods have sufficient data
        startDate = subYears(today, 2); // Load 2 years of data to cover all periods
        endDate = today;
      }

      const nextPage = await getTransactionsByRangePaged({
        user,
        isAdmin,
        startDate,
        endDate,
        pageSize: ITEMS_PER_PAGE,
        lastDoc: lastCursor,
      });
      setTransactions(prev => [...prev, ...nextPage.items]);
      setLastCursor(nextPage.lastDoc || null);
      setHasMore((nextPage.items?.length || 0) === ITEMS_PER_PAGE);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, user, isAdmin, selectedPeriod, activeTab, lastCursor]);

  // Memoize stats calculation
  const currentStats = useMemo(() => {
    // Use filtered transactions for stats calculation
    let transactionsForStats = paginatedTransactions;
    
    // For overview tab, use the same 14-day period as the display
    if (activeTab === 'overview') {
      const today = new Date();
      const startDate = subDays(today, 14);
      transactionsForStats = transactions.filter(t => t.date >= startDate && t.date <= today);
    }
    
    return calculateStats(transactionsForStats, selectedPeriod);
  }, [paginatedTransactions, transactions, selectedPeriod, activeTab]);

  // Update stats when transactions change
  useEffect(() => {
    setStats(currentStats);
  }, [currentStats]);

  useEffect(() => {
    // Reset paging when filters change (but not when just selectedDate changes)
    setLastCursor(null);
    setHasMore(true);
    setTransactions([]);
    loadData();
  }, [loadData, activeTab, selectedPeriod, filterType, filterCategory]);

  // Handle selectedDate changes separately - just filter existing data
  useEffect(() => {
    if (activeTab === 'transactions') {
      if (selectedDate) {
        // When a specific date is selected, filter existing data locally
        // No need to reload from server
        setLastCursor(null);
        setHasMore(false); // Since we're showing only one day, no more pages needed
      } else {
        // When date is cleared, reset pagination and allow more data
        setLastCursor(null);
        setHasMore(true);
      }
    }
  }, [selectedDate, activeTab]);

  const handlePeriodChange = useCallback((period: 'week' | 'month' | 'year') => {
    setSelectedPeriod(period);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleAmountChange = useCallback((text: string) => {
    // Allow only digits and one decimal separator
    let sanitized = text.replace(/,/g, '.');
    sanitized = sanitized.replace(/[^0-9.]/g, '');
    const firstDot = sanitized.indexOf('.');
    if (firstDot !== -1) {
      const before = sanitized.slice(0, firstDot + 1);
      const after = sanitized.slice(firstDot + 1).replace(/\./g, '');
      sanitized = before + after;
    }
    setAmount(sanitized);
  }, []);

  const handleAddTransaction = async () => {
    if (!amount || !description || !user) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      const newTransaction = await addBudgetTransaction({
        amount: parseFloat(amount),
        type: transactionType,
        description,
        category: selectedCategory,
        date,
      }, user);

      setTransactions(prev => [newTransaction, ...prev]);
      setIsAddModalVisible(false);
      setAmount('');
      setDescription('');
      setDate(new Date());
      setSelectedCategory(categories.find(c => c.type === transactionType)?.id || '');
      setStats(calculateStats([newTransaction, ...transactions], selectedPeriod));
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'İşlem eklenirken bir hata oluştu.');
    }
  };

  const renderSummaryCards = () => {
    return (
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}> 
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}> 
              {selectedPeriod === 'week' ? 'Bu Hafta' : 
               selectedPeriod === 'month' ? 'Bu Ay' : 'Bu Yıl'}
            </Text>
            <TouchableOpacity onPress={() => {/* TODO: Detaylı görünüm */}}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <MaterialCommunityIcons name="cash-plus" size={16} color="#4CAF50" />
                <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gelir</Text>
              </View>
              <Text style={[styles.summaryItemAmount, { color: '#4CAF50' }]}> 
                ₺{stats.totalIncome.toFixed(0)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <MaterialCommunityIcons name="cash-minus" size={16} color="#FF6B6B" />
                <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gider</Text>
              </View>
              <Text style={[styles.summaryItemAmount, { color: '#FF6B6B' }]}> 
                ₺{stats.totalExpense.toFixed(0)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <MaterialCommunityIcons 
                  name={stats.balance >= 0 ? "wallet" : "alert-circle"} 
                  size={16} 
                  color={stats.balance >= 0 ? '#2196F3' : '#FF6B6B'} 
                />
                <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Bakiye</Text>
              </View>
              <Text style={[
                styles.summaryItemAmount,
                { color: stats.balance >= 0 ? '#2196F3' : '#FF6B6B' }
              ]}>
                ₺{stats.balance.toFixed(0)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <MaterialCommunityIcons name="swap-horizontal" size={16} color="#9C27B0" />
                <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>İşlem</Text>
              </View>
              <Text style={[styles.summaryItemAmount, { color: '#9C27B0' }]}> 
                {transactions.filter(t => {
                  const today = new Date();
                  let startDate: Date;
                  switch (selectedPeriod) {
                    case 'week':
                      startDate = subDays(today, 7);
                      break;
                    case 'month':
                      startDate = subMonths(today, 1);
                      break;
                    case 'year':
                      startDate = subYears(today, 1);
                      break;
                    default:
                      startDate = subMonths(today, 1);
                  }
                  return t.date >= startDate && t.date <= today;
                }).length}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['week', 'month', 'year'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && { backgroundColor: theme.primary },
          ]}
          onPress={() => setSelectedPeriod(period as any)}
        >
          <Text
            style={[
              styles.periodButtonText,
              { color: selectedPeriod === period ? '#FFF' : theme.text },
            ]}
          >
            {period === 'week' ? 'Hafta' : period === 'month' ? 'Ay' : 'Yıl'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAnalysisCharts = () => {
    const topCategories = Object.entries(stats.categoryTotals)
      .filter(([_, amount]) => amount > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 1);

    const topCategoryEntry = topCategories[0];

    const totalExpense = Math.max(1, stats.totalExpense); // divide-by-zero guard

    // Tarih formatları için yardımcı fonksiyonlar
    const getWeekLabel = () => {
      const today = new Date();
      const startOfWeek = subDays(today, today.getDay());
      const endOfWeek = addDays(startOfWeek, 6);
      return `${format(startOfWeek, 'd MMM', { locale: tr })} - ${format(endOfWeek, 'd MMM', { locale: tr })}`;
    };

    const getMonthLabel = () => {
      return format(new Date(), 'MMMM yyyy', { locale: tr });
    };

    const getYearLabel = () => {
      return format(new Date(), 'yyyy', { locale: tr });
    };

    // En çok harcama yapan kullanıcılar (alt kısım) - varsayılan Bu Ay
    const today = new Date();
    let spendStart: Date;
    let spendEnd: Date = today;
    if (spenderRange === 'all') {
      spendStart = new Date(1970, 0, 1);
    } else {
      const base = spenderMonth || today;
      spendStart = new Date(base.getFullYear(), base.getMonth(), 1);
      spendEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    const spendRangeExpenses = transactions.filter(
      t => t.type === 'expense' && t.date >= spendStart && t.date <= spendEnd
    );
    const userExpenseTotals: { [key: string]: { amount: number; name: string } } = {};
    spendRangeExpenses.forEach(t => {
      const key = (t as any).userId || t.userName || 'unknown';
      if (!userExpenseTotals[key]) {
        userExpenseTotals[key] = { amount: 0, name: t.userName || 'Bilinmeyen' };
      }
      userExpenseTotals[key].amount += t.amount;
    });
    const topSpenders = Object.entries(userExpenseTotals)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 5);
    const totalExpenseInRange = Math.max(1, spendRangeExpenses.reduce((s, t) => s + t.amount, 0));

    return (
      <ScrollView
        style={styles.chartsContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
      >
        {/* Finansal Özet Kartları */}
        <View style={styles.analysisGrid}>
          {/* Haftalık Özet */}
          <View style={[styles.chartCard, { backgroundColor: theme.surface }]}> 
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: theme.text }]}> 
                  Haftalık Özet
                </Text>
                <Text style={[styles.periodLabel, { color: theme.textDim }]}> 
                  {getWeekLabel()}
                </Text>
              </View>
              <View style={[styles.periodBadge, { backgroundColor: theme.primary + '15' }]}> 
                <MaterialCommunityIcons name="calendar-week" size={16} color={theme.primary} />
              </View>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons name="cash-plus" size={16} color="#4CAF50" />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gelir</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}> 
                  ₺{stats.periodStats.weekly.income.toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons name="cash-minus" size={16} color="#FF6B6B" />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gider</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}> 
                  ₺{stats.periodStats.weekly.expense.toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons 
                    name={stats.periodStats.weekly.income - stats.periodStats.weekly.expense >= 0 ? "wallet" : "alert-circle"} 
                    size={16} 
                    color={stats.periodStats.weekly.income - stats.periodStats.weekly.expense >= 0 ? '#4CAF50' : '#FF6B6B'} 
                  />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Bakiye</Text>
                </View>
                <Text style={[styles.summaryValue, { 
                  color: stats.periodStats.weekly.income - stats.periodStats.weekly.expense >= 0 
                    ? '#4CAF50' 
                    : '#FF6B6B' 
                }]}> 
                  ₺{(stats.periodStats.weekly.income - stats.periodStats.weekly.expense).toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons name="swap-horizontal" size={16} color={theme.primary} />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>İşlem</Text>
                </View>
                <Text style={[styles.summaryValue, { color: theme.text }]}> 
                  {transactions.filter(t => 
                    t.date >= subDays(new Date(), 7) && 
                    t.date <= new Date()
                  ).length}
                </Text>
              </View>
            </View>
        </View>

          {/* Aylık Özet */}
          <View style={[styles.chartCard, { backgroundColor: theme.surface }]}> 
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: theme.text }]}> 
                  Aylık Özet
                </Text>
                <Text style={[styles.periodLabel, { color: theme.textDim }]}> 
                  {getMonthLabel()}
                </Text>
              </View>
              <View style={[styles.periodBadge, { backgroundColor: theme.primary + '15' }]}> 
                <MaterialCommunityIcons name="calendar-month" size={16} color={theme.primary} />
              </View>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons name="cash-plus" size={16} color="#4CAF50" />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gelir</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}> 
                  ₺{stats.periodStats.monthly.income.toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons name="cash-minus" size={16} color="#FF6B6B" />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gider</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}> 
                  ₺{stats.periodStats.monthly.expense.toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons 
                    name={stats.periodStats.monthly.income - stats.periodStats.monthly.expense >= 0 ? "wallet" : "alert-circle"} 
                    size={16} 
                    color={stats.periodStats.monthly.income - stats.periodStats.monthly.expense >= 0 ? '#4CAF50' : '#FF6B6B'} 
                  />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Bakiye</Text>
                </View>
                <Text style={[styles.summaryValue, { 
                  color: stats.periodStats.monthly.income - stats.periodStats.monthly.expense >= 0 
                    ? '#4CAF50' 
                    : '#FF6B6B' 
                }]}> 
                  ₺{(stats.periodStats.monthly.income - stats.periodStats.monthly.expense).toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons name="swap-horizontal" size={16} color={theme.primary} />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>İşlem</Text>
                </View>
                <Text style={[styles.summaryValue, { color: theme.text }]}> 
                  {transactions.filter(t => 
                    t.date >= subMonths(new Date(), 1) && 
                    t.date <= new Date()
                  ).length}
                </Text>
              </View>
            </View>
        </View>

          {/* Yıllık Özet */}
          <View style={[styles.chartCard, { backgroundColor: theme.surface }]}> 
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: theme.text }]}> 
                  Yıllık Özet
            </Text>
                <Text style={[styles.periodLabel, { color: theme.textDim }]}> 
                  {getYearLabel()}
                </Text>
        </View>
              <View style={[styles.periodBadge, { backgroundColor: theme.primary + '15' }]}> 
                <MaterialCommunityIcons name="calendar-star" size={16} color={theme.primary} />
      </View>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons name="cash-plus" size={16} color="#4CAF50" />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gelir</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}> 
                  ₺{stats.periodStats.yearly.income.toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons name="cash-minus" size={16} color="#FF6B6B" />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gider</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}> 
                  ₺{stats.periodStats.yearly.expense.toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons 
                    name={stats.periodStats.yearly.income - stats.periodStats.yearly.expense >= 0 ? "wallet" : "alert-circle"} 
                    size={16} 
                    color={stats.periodStats.yearly.income - stats.periodStats.yearly.expense >= 0 ? '#4CAF50' : '#FF6B6B'} 
                  />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Bakiye</Text>
                </View>
                <Text style={[styles.summaryValue, { 
                  color: stats.periodStats.yearly.income - stats.periodStats.yearly.expense >= 0 
                    ? '#4CAF50' 
                    : '#FF6B6B' 
                }]}> 
                  ₺{(stats.periodStats.yearly.income - stats.periodStats.yearly.expense).toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <MaterialCommunityIcons name="swap-horizontal" size={16} color={theme.primary} />
                  <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>İşlem</Text>
                </View>
                <Text style={[styles.summaryValue, { color: theme.text }]}> 
                  {transactions.filter(t => 
                    t.date >= subYears(new Date(), 1) && 
                    t.date <= new Date()
                  ).length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Kategori Dağılımı */}
        <View style={[styles.chartCard, { backgroundColor: theme.surface }]}> 
          <View style={styles.chartHeader}>
            <View>
              <Text style={[styles.chartTitle, { color: theme.text }]}> 
                En Yüksek Kategori
              </Text>
              <Text style={[styles.periodLabel, { color: theme.textDim }]}> 
                Son 30 Gün
            </Text>
          </View>
            <View style={[styles.periodBadge, { backgroundColor: theme.primary + '15' }]}> 
              <MaterialCommunityIcons name="chart-pie" size={16} color={theme.primary} />
        </View>
          </View>
          <View style={styles.categoryList}>
            {topCategories.map(([category, amount], index) => {
              const categoryInfo = categories.find(c => c.id === category);
              const percentage = ((amount / totalExpense) * 100).toFixed(1);

    return (
                <View key={category} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <View style={[
                      styles.categoryIcon,
                      { backgroundColor: (categoryInfo?.color || '#A8E6CF') + '20' }
                    ]}>
                      <MaterialCommunityIcons
                        name={categoryInfo?.icon as any}
                        size={20}
                        color={categoryInfo?.color}
                      />
                    </View>
                    <View style={styles.categoryDetails}>
                    <Text style={[styles.categoryName, { color: theme.text }]}> 
                        {categoryInfo?.name || 'Diğer'}
                    </Text>
                      <View style={styles.progressBar}>
                  <View
                    style={[
                            styles.progressFill,
                            { 
                              width: `${Number(percentage)}%` as any,
                              backgroundColor: categoryInfo?.color || '#A8E6CF'
                            }
                    ]}
                  />
                </View>
                    </View>
                  </View>
                  <View style={styles.categoryAmount}>
                    <Text style={[styles.categoryValue, { color: theme.text }]}> 
                      ₺{amount.toFixed(2)}
                    </Text>
                <Text style={[styles.categoryPercentage, { color: theme.textDim }]}> 
                      {percentage}%
                </Text>
                  </View>
              </View>
            );
          })}
        </View>
        </View>

        {/* En çok harcayanlar */}
        <View style={[styles.chartCard, { backgroundColor: theme.surface }]}> 
          <View style={styles.chartHeader}>
            <View>
              <Text style={[styles.chartTitle, { color: theme.text }]}> 
                Aylık En Çok Harcayan 5 Kişi
              </Text>
              <Text style={[styles.periodLabel, { color: theme.textDim }]}> 
                {spenderRange === 'all' ? 'Tüm Zamanlar' : format(spenderMonth, 'MMMM yyyy', { locale: tr })}
              </Text>
            </View>
            {isAdmin && (
              <View style={styles.spenderFilters}>
                <View style={styles.monthNavigator}>
                  <TouchableOpacity
                    style={styles.monthNavBtn}
                    onPress={() => {
                      const d = new Date(spenderMonth);
                      d.setMonth(d.getMonth() - 1);
                      setSpenderMonth(d);
                      setSpenderRange('month');
                    }}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={20} color={theme.textDim} />
                  </TouchableOpacity>
                  <Text style={[styles.spenderMonthLabel, { color: theme.text }]}>
                    {format(spenderMonth, 'MMMM yyyy', { locale: tr })}
                  </Text>
                  <TouchableOpacity
                    style={styles.monthNavBtn}
                    onPress={() => {
                      const d = new Date(spenderMonth);
                      d.setMonth(d.getMonth() + 1);
                      setSpenderMonth(d);
                      setSpenderRange('month');
                    }}
                  >
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textDim} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.spenderChip, spenderRange === 'all' && { backgroundColor: theme.primary + '20' }]}
                  onPress={() => setSpenderRange(spenderRange === 'all' ? 'month' : 'all')}
                >
                  <Text style={[styles.spenderChipText, { color: spenderRange === 'all' ? theme.primary : theme.textDim }]}>Tüm Zamanlar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

                    <View style={styles.topSpendersList}>
            {globalTopSpenders.length === 0 ? (
              <Text style={{ color: theme.textDim }}>Veri yok</Text>
            ) : (
              globalTopSpenders.map((s) => (
                <View key={s.userId} style={styles.spenderItem}>
                  <View style={styles.spenderInfo}>
                    <View style={[styles.spenderAvatar, { backgroundColor: theme.primary + '15' }]}>
                      <MaterialCommunityIcons name="account-circle" size={20} color={theme.primary} />
                    </View>
                    <Text style={[styles.spenderName, { color: theme.text }]} numberOfLines={1}>
                      {s.userName}
                    </Text>
                  </View>
                  <View style={styles.spenderAmountBlock}>
                    <Text style={[styles.spenderAmount, { color: '#FF6B6B' }]}>₺{s.amount.toFixed(0)}</Text>
                    <Text style={[styles.spenderPercent, { color: theme.textDim }]}> 
                      {((s.amount / Math.max(1, globalTopSpendersTotal)) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderAddTransactionModal = () => (
    <Modal
      visible={isAddModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsAddModalVisible(false)}
    >
      <BlurView style={StyleSheet.absoluteFill} intensity={Platform.OS === 'ios' ? 20 : 100} tint={colorScheme}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}> 
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Yeni İşlem</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.transactionTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  transactionType === 'income' && { backgroundColor: '#4CAF50' },
                ]}
                onPress={() => {
                  setTransactionType('income');
                  setSelectedCategory(categories.find(c => c.type === 'income')?.id || '');
                }}
              >
                <MaterialCommunityIcons
                  name="cash-plus"
                  size={24}
                  color={transactionType === 'income' ? '#FFF' : theme.text}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: transactionType === 'income' ? '#FFF' : theme.text },
                  ]}
                >
                  Gelir
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  transactionType === 'expense' && { backgroundColor: '#FF6B6B' },
                ]}
                onPress={() => {
                  setTransactionType('expense');
                  setSelectedCategory(categories.find(c => c.type === 'expense')?.id || '');
                }}
              >
                <MaterialCommunityIcons
                  name="cash-minus"
                  size={24}
                  color={transactionType === 'expense' ? '#FFF' : theme.text}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: transactionType === 'expense' ? '#FFF' : theme.text },
                  ]}
                >
                  Gider
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Kategori</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {categories
                  .filter(category => category.type === transactionType)
                  .map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        selectedCategory === category.id && { backgroundColor: category.color + '20' },
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <MaterialCommunityIcons
                        name={category.icon as any}
                        size={24}
                        color={selectedCategory === category.id ? category.color : theme.textDim}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          { color: selectedCategory === category.id ? category.color : theme.textDim },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Tutar (₺)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.textDim}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Açıklama</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder="İşlem açıklaması"
                placeholderTextColor={theme.textDim}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Tarih</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.background }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateButtonText, { color: theme.text }]}> 
                  {format(date, 'd MMMM yyyy', { locale: tr })}
                </Text>
                <MaterialCommunityIcons name="calendar" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
              />
            )}

            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: transactionType === 'income' ? '#4CAF50' : '#FF6B6B' }
              ]}
              onPress={handleAddTransaction}
            >
              <Text style={styles.modalButtonText}>
                {transactionType === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <BlurView style={StyleSheet.absoluteFill} intensity={Platform.OS === 'ios' ? 20 : 100} tint={colorScheme}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filtrele</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>İşlem Tipi</Text>
              <View style={styles.filterTypeButtons}>
                {[
                  { id: 'all', label: 'Tümü', icon: 'swap-horizontal' },
                  { id: 'income', label: 'Gelir', icon: 'cash-plus' },
                  { id: 'expense', label: 'Gider', icon: 'cash-minus' },
                ].map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.filterTypeButton,
                      filterType === type.id && { backgroundColor: theme.primary + '20' },
                    ]}
                    onPress={() => setFilterType(type.id as any)}
                  >
            <MaterialCommunityIcons
                      name={type.icon as any}
                      size={20}
                      color={filterType === type.id ? theme.primary : theme.textDim}
                    />
                    <Text
                      style={[
                        styles.filterTypeButtonText,
                        { color: filterType === type.id ? theme.primary : theme.textDim },
                      ]}
                    >
                      {type.label}
            </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Kategori</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
            <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    !filterCategory && { backgroundColor: theme.primary + '20' },
                  ]}
                  onPress={() => setFilterCategory(null)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: !filterCategory ? theme.primary : theme.textDim },
                    ]}
                  >
                    Tümü
                  </Text>
            </TouchableOpacity>
                {categories
                  .filter(cat => filterType === 'all' || cat.type === filterType)
                  .map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        filterCategory === category.id && { backgroundColor: category.color + '20' },
                      ]}
                      onPress={() => setFilterCategory(category.id)}
                    >
                      <MaterialCommunityIcons
                        name={category.icon as any}
                        size={20}
                        color={filterCategory === category.id ? category.color : theme.textDim}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          { color: filterCategory === category.id ? category.color : theme.textDim },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
          </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Tarih Aralığı</Text>
              <View style={styles.dateRangeButtons}>
                {[
                  { label: 'Son 7 Gün', days: 7 },
                  { label: 'Son 30 Gün', days: 30 },
                  { label: 'Son 90 Gün', days: 90 },
                ].map(range => (
                  <TouchableOpacity
                    key={range.days}
                    style={[
                      styles.dateRangeButton,
                      filterDateRange.start.getTime() === subDays(new Date(), range.days).getTime() &&
                        { backgroundColor: theme.primary + '20' },
                    ]}
                    onPress={() => setFilterDateRange({
                      start: subDays(new Date(), range.days),
                      end: new Date(),
                    })}
                  >
                    <Text
                      style={[
                        styles.dateRangeButtonText,
                        {
                          color: filterDateRange.start.getTime() === subDays(new Date(), range.days).getTime()
                            ? theme.primary
                            : theme.textDim,
                        },
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
        </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setFilterModalVisible(false);
                setPage(1); // Filtreleri uyguladıktan sonra sayfayı sıfırla
              }}
            >
              <Text style={styles.modalButtonText}>Filtreleri Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  const renderTabFilters = () => (
    <Modal
      visible={showTabFilters}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTabFilters(false)}
    >
      <BlurView style={StyleSheet.absoluteFill} intensity={Platform.OS === 'ios' ? 20 : 100} tint={colorScheme}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Sıralama ve Filtreleme</Text>
              <TouchableOpacity onPress={() => setShowTabFilters(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Sıralama</Text>
              <View style={styles.sortButtons}>
                {[
                  { id: 'date', label: 'Tarih', icon: 'calendar' },
                  { id: 'amount', label: 'Tutar', icon: 'cash' },
                  { id: 'category', label: 'Kategori', icon: 'tag' },
                ].map(sort => (
                  <TouchableOpacity
                    key={sort.id}
                    style={[
                      styles.sortButton,
                      sortBy === sort.id && { backgroundColor: theme.primary + '20' },
                    ]}
                    onPress={() => {
                      if (sortBy === sort.id) {
                        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(sort.id as any);
                        setSortOrder('desc');
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name={sort.icon as any}
                      size={20}
                      color={sortBy === sort.id ? theme.primary : theme.textDim}
                    />
                    <Text
                      style={[
                        styles.sortButtonText,
                        { color: sortBy === sort.id ? theme.primary : theme.textDim },
                      ]}
                    >
                      {sort.label}
                    </Text>
                    {sortBy === sort.id && (
                      <MaterialCommunityIcons
                        name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                        size={16}
                        color={theme.primary}
                        style={styles.sortOrderIcon}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Özel Tarih Aralığı</Text>
              <View style={styles.customDateButtons}>
                <TouchableOpacity
                  style={[styles.customDateButton, { backgroundColor: theme.background }]}
                  onPress={() => setShowCustomDatePicker(true)}
                >
                  <Text style={[styles.customDateButtonText, { color: theme.text }]}>
                    {format(customDateRange.start, 'd MMM yyyy', { locale: tr })} - {format(customDateRange.end, 'd MMM yyyy', { locale: tr })}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>En Çok Harcama</Text>
              <View style={styles.spendingStats}>
                {(() => {
                  const dailySpending = transactions.reduce((acc, t) => {
                    const date = format(t.date, 'yyyy-MM-dd');
                    if (!acc[date]) acc[date] = 0;
                    if (t.type === 'expense') acc[date] += t.amount;
                    return acc;
                  }, {} as { [key: string]: number });

                  const maxSpendingDay = Object.entries(dailySpending)
                    .sort(([, a], [, b]) => b - a)[0];

                  return maxSpendingDay ? (
                    <View style={styles.spendingStatItem}>
                      <MaterialCommunityIcons name="calendar-star" size={20} color={theme.primary} />
                      <View style={styles.spendingStatInfo}>
                        <Text style={[styles.spendingStatLabel, { color: theme.textDim }]}>
                          En Yüksek Harcama
                        </Text>
                        <Text style={[styles.spendingStatValue, { color: theme.text }]}>
                          {format(new Date(maxSpendingDay[0]), 'd MMMM yyyy', { locale: tr })}
                        </Text>
                        <Text style={[styles.spendingStatAmount, { color: '#FF6B6B' }]}>
                          ₺{maxSpendingDay[1].toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ) : null;
                })()}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setShowTabFilters(false);
                setPage(1);
              }}
            >
              <Text style={styles.modalButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  const renderStatsModal = () => (
    <Modal
      visible={showStats}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStats(false)}
    >
      <BlurView style={StyleSheet.absoluteFill} intensity={Platform.OS === 'ios' ? 20 : 100} tint={colorScheme}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Önemli Günler</Text>
              <TouchableOpacity onPress={() => setShowStats(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
              {(() => {
                const dailyStats = transactions.reduce((acc, t) => {
                  const date = format(t.date, 'yyyy-MM-dd');
                  if (!acc[date]) {
                    acc[date] = { income: 0, expense: 0, count: 0 };
                  }
                  if (t.type === 'income') {
                    acc[date].income += t.amount;
                  } else {
                    acc[date].expense += t.amount;
                  }
                  acc[date].count++;
                  return acc;
                }, {} as { [key: string]: { income: number; expense: number; count: number } });

                const sortedDays = Object.entries(dailyStats)
                  .sort(([, a], [, b]) => b.expense - a.expense)
                  .slice(0, 3);

                const mostTransactionsDay = Object.entries(dailyStats)
                  .sort(([, a], [, b]) => b.count - a.count)[0];
          
          return (
                  <>
                    {mostTransactionsDay && (
                      <TouchableOpacity
                        style={[styles.statCard, { backgroundColor: theme.background }]}
                        onPress={() => {
                          setSelectedDate(new Date(mostTransactionsDay[0]));
                          setShowStats(false);
                        }}
                      >
                        <MaterialCommunityIcons name="calendar-multiple" size={24} color={theme.primary} />
                        <View style={styles.statInfo}>
                          <Text style={[styles.statLabel, { color: theme.textDim }]}>
                            En Çok İşlem Yapılan Gün
                          </Text>
                          <Text style={[styles.statValue, { color: theme.text }]}>
                            {format(new Date(mostTransactionsDay[0]), 'd MMMM yyyy', { locale: tr })}
                          </Text>
                          <Text style={[styles.statDetail, { color: theme.textDim }]}>
                            {mostTransactionsDay[1].count} işlem
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {sortedDays.map(([date, stats], index) => (
                      <TouchableOpacity
                        key={date}
                        style={[styles.statCard, { backgroundColor: theme.background }]}
                        onPress={() => {
                          setSelectedDate(new Date(date));
                          setShowStats(false);
                        }}
                      >
                <MaterialCommunityIcons
                          name={index === 0 ? "trophy" : "cash-multiple"} 
                  size={24}
                          color={index === 0 ? "#FFD700" : theme.primary} 
                        />
                        <View style={styles.statInfo}>
                          <Text style={[styles.statLabel, { color: theme.textDim }]}>
                            {index === 0 ? "En Yüksek Harcama" : `${index + 1}. En Yüksek Harcama`}
                </Text>
                          <Text style={[styles.statValue, { color: theme.text }]}>
                            {format(new Date(date), 'd MMMM yyyy', { locale: tr })}
                </Text>
                          <Text style={[styles.statDetail, { color: '#FF6B6B' }]}>
                            ₺{stats.expense.toFixed(2)}
                </Text>
              </View>
                      </TouchableOpacity>
                    ))}
                  </>
                );
              })()}
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <View style={styles.pageHeader}>
              <Text style={[styles.transactionsTitle, { color: theme.text }]}>
                Bütçe Özeti
                </Text>
            </View>

            {renderSummaryCards()}
            {renderTransactionList()}
          </>
        );
      case 'transactions':
        return (
          <>
            <View style={styles.transactionsHeader}>
              <View style={styles.transactionsHeaderTop}>
                <Text style={[styles.transactionsTitle, { color: theme.text }]}>
                  İşlemler
                </Text>
                <View style={styles.headerButtons}>
                  <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: theme.primary + '20' }]}
                    onPress={() => setShowStats(true)}
                  >
                    <MaterialCommunityIcons
                      name="chart-box"
                      size={24}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: theme.primary + '20' }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <MaterialCommunityIcons
                      name="calendar"
                      size={24}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {selectedDate && (
                <TouchableOpacity
                  style={[styles.selectedDateContainer, { backgroundColor: theme.background }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.selectedDateText, { color: theme.text }]}>
                    {format(selectedDate, 'd MMMM yyyy', { locale: tr })}
                  </Text>
                  <TouchableOpacity
                    style={styles.clearDateButton}
                    onPress={() => setSelectedDate(null)}
                  >
                    <MaterialCommunityIcons name="close" size={16} color={theme.textDim} />
                  </TouchableOpacity>
                  </TouchableOpacity>
                )}
              <View style={styles.periodSelectorContainer}>
                {renderPeriodSelector()}
              </View>
            </View>
            {renderTransactionList()}
          </>
        );
      case 'analysis':
        return (
          <>
            <View style={styles.pageHeader}>
              <Text style={[styles.transactionsTitle, { color: theme.text }]}>
                Bütçe Analizi
              </Text>
      </View>
            {renderAnalysisCharts()}
          </>
    );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background }]}> 
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={[styles.tabBar, { 
        backgroundColor: theme.surface,
        paddingTop: insets.top,
        paddingBottom: 8,
      }]}> 
          {[
            { id: 'overview', label: 'Özet', icon: 'chart-box' },
            { id: 'transactions', label: 'İşlemler', icon: 'swap-horizontal' },
          { id: 'analysis', label: 'Analiz', icon: 'chart-line' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                activeTab === tab.id && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab(tab.id as TabType)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={24}
                color={activeTab === tab.id ? theme.primary : theme.textDim}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: activeTab === tab.id ? theme.primary : theme.textDim,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      <View style={styles.contentContainer}>
        {activeTab === 'transactions' && (
          <>
            <View style={styles.transactionsHeader}>
              <View style={styles.transactionsHeaderTop}>
                <Text style={[styles.transactionsTitle, { color: theme.text }]}>
                  İşlemler
                </Text>
                <View style={styles.headerButtons}>
                  <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: theme.primary + '20' }]}
                    onPress={() => setShowStats(true)}
                  >
                    <MaterialCommunityIcons
                      name="chart-box"
                      size={24}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: theme.primary + '20' }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <MaterialCommunityIcons
                      name="calendar"
                      size={24}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              {selectedDate && (
                <TouchableOpacity
                  style={[styles.selectedDateContainer, { backgroundColor: theme.background }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.selectedDateText, { color: theme.text }]}>
                    {format(selectedDate, 'd MMMM yyyy', { locale: tr })}
                  </Text>
                  <TouchableOpacity
                    style={styles.clearDateButton}
                    onPress={() => setSelectedDate(null)}
                  >
                    <MaterialCommunityIcons name="close" size={16} color={theme.textDim} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              
              {/* Periyot Seçici */}
              <View style={styles.periodSelector}>
                {['week', 'month', 'year'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => setSelectedPeriod(period as any)}
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        { color: selectedPeriod === period ? '#FFF' : theme.text },
                      ]}
                    >
                      {period === 'week' ? 'Hafta' : period === 'month' ? 'Ay' : 'Yıl'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {renderTransactionList()}
          </>
        )}

        {activeTab === 'overview' && (
          <>
            <View style={styles.pageHeader}>
              <Text style={[styles.transactionsTitle, { color: theme.text }]}>
                Bütçe Özeti
              </Text>
            </View>

            {renderSummaryCards()}
            {renderTransactionList()}
          </>
        )}

        {activeTab === 'analysis' && (
          <>
            <View style={styles.pageHeader}>
              <Text style={[styles.transactionsTitle, { color: theme.text }]}>
                Bütçe Analizi
              </Text>
            </View>
            
            {/* Periyot Seçici */}
            <View style={styles.periodSelector}>
              {['week', 'month', 'year'].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setSelectedPeriod(period as any)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      { color: selectedPeriod === period ? '#FFF' : theme.text },
                    ]}
                  >
                    {period === 'week' ? 'Hafta' : period === 'month' ? 'Ay' : 'Yıl'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {renderAnalysisCharts()}
          </>
        )}
      </View>

      {activeTab === 'overview' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => setIsAddModalVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      )}

      {renderAddTransactionModal()}
      {renderFilterModal()}
      {renderTabFilters()}
      {showCustomDatePicker && (
        <DateTimePicker
          value={customDateRange.start}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              setCustomDateRange(prev => ({ ...prev, start: selectedDate }));
            }
            setShowCustomDatePicker(false);
          }}
        />
      )}
      {showStats && renderStatsModal()}

      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <BlurView style={StyleSheet.absoluteFill} intensity={Platform.OS === 'ios' ? 20 : 100} tint={colorScheme}>
            <View style={styles.modalContainer}>
              <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Tarih Seç</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <MaterialCommunityIcons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
              </View>
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (date) {
                      setSelectedDate(date);
                      if (Platform.OS === 'ios') {
                        // iOS'ta kullanıcı manuel olarak kapatacak
                      } else {
                        setShowDatePicker(false);
                      }
                    }
                  }}
                  style={Platform.OS === 'ios' ? { width: '100%', height: 200 } : undefined}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.primary }]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.modalButtonText}>Tamam</Text>
                  </TouchableOpacity>
        )}
      </View>
            </View>
          </BlurView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  pageHeader: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  summaryItem: {
    width: '50%',
    padding: 8,
  },
  summaryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryItemLabel: {
    fontSize: 13,
    marginLeft: 4,
  },
  summaryItemAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  trendContainer: {
    marginTop: 8,
  },
  trendItem: {
    marginBottom: 16,
  },
  trendLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  trendValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryDetails: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  transactionsContainer: {
    marginBottom: 24,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  deleteButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  dateButtonText: {
    fontSize: 16,
  },
  transactionTypeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  chartsContainer: {
    flex: 1,
  },
  analysisGrid: {
    gap: 16,
    marginBottom: 16,
  },
  chartCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  periodLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  periodBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryList: {
    marginTop: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryAmount: {
    alignItems: 'flex-end',
  },
  categoryValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryPercentage: {
    fontSize: 12,
    marginTop: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateTotal: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  loadMoreText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionsHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    marginBottom: 8,
  },
  transactionsHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodSelectorContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearDateButton: {
    marginLeft: 8,
    padding: 4,
  },
  statsContainer: {
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  statInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statDetail: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  sortButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  sortOrderIcon: {
    marginLeft: 4,
  },
  customDateButtons: {
    marginTop: 8,
  },
  customDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  customDateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  spendingStats: {
    marginTop: 8,
  },
  spendingStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  spendingStatInfo: {
    marginLeft: 12,
    flex: 1,
  },
  spendingStatLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  spendingStatValue: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  spendingStatAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabFilterButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spenderFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  spenderChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  spenderChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  topSpendersList: {
    marginTop: 8,
  },
  spenderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  spenderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  spenderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  spenderName: {
    fontSize: 14,
    fontWeight: '500',
  },
  spenderAmountBlock: {
    alignItems: 'flex-end',
  },
  spenderAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  spenderPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  monthNavBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spenderMonthLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  filterTypeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  dateRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  dateRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});