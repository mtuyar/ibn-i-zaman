import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import {
  Transaction,
  getTransactionsByDateRange,
  getTransactionStats,
  defaultCategories,
  TransactionType,
  addTransaction
} from '../../services/BudgetService';
import AddTransactionModal from '../../components/budget/AddTransactionModal';

export default function BudgetScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategories[0]?.id || '');

  const loadData = async () => {
    if (!user) return;
    try {
      const today = new Date();
      const start = startOfMonth(today);
      const end = endOfMonth(today);

      const [txs, monthlyStats] = await Promise.all([
        getTransactionsByDateRange(subDays(today, 30), today, user, isAdmin),
        getTransactionStats('month', user, isAdmin)
      ]);

      setTransactions(txs.slice(0, 5)); // Show only last 5 transactions
      setStats(monthlyStats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user, isAdmin])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddTransaction = async () => {
    if (!user) return;
    if (!amount) {
      Alert.alert('Hata', 'Lütfen bir tutar girin');
      return;
    }

    try {
      await addTransaction({
        amount: parseFloat(amount),
        type: transactionType,
        description,
        category: selectedCategory,
        date: date,
      }, user);

      setIsAddModalVisible(false);
      setAmount('');
      setDescription('');
      setDate(new Date());
      loadData();
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'İşlem eklenirken bir hata oluştu');
    }
  };

  const renderTransactionItem = ({ item, index }: { item: Transaction, index: number }) => {
    const category = defaultCategories.find(c => c.id === item.category);
    return (
      <Animated.View entering={FadeInDown.delay(index * 50)} key={item.id}>
        <TouchableOpacity
          style={[styles.transactionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
          onPress={() => {/* TODO: Detail */ }}
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
              {item.description || category?.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.transactionDate, { color: theme.tabIconDefault }]}>
                {format(item.date, 'd MMMM', { locale: tr })}
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
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bütçe</Text>
        <TouchableOpacity onPress={() => router.push('/budget/analytics' as any)} style={styles.headerBtn}>
          <Ionicons name="analytics" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)' }]}>
            <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>Gelir</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>₺{stats.totalIncome.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 107, 107, 0.1)' }]}>
            <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>Gider</Text>
            <Text style={[styles.statValue, { color: '#FF6B6B' }]}>₺{stats.totalExpense.toLocaleString('tr-TR')}</Text>
          </View>
        </View>

        <View style={[styles.balanceCard, { backgroundColor: theme.tint }]}>
          <View>
            <Text style={styles.balanceLabel}>Toplam Bakiye</Text>
            <Text style={styles.balanceValue}>₺{stats.balance.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet" size={32} color="#fff" />
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 25 }]}>Hızlı İşlemler</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: isDark ? 'rgba(79, 172, 254, 0.15)' : 'rgba(79, 172, 254, 0.1)' }]}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Ionicons name="add-circle" size={28} color="#4facfe" />
            <Text style={[styles.actionText, { color: theme.text }]}>İşlem Ekle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: isDark ? 'rgba(161, 140, 209, 0.15)' : 'rgba(161, 140, 209, 0.1)' }]}
            onPress={() => router.push('/budget/donors' as any)}
          >
            <Ionicons name="people" size={28} color="#a18cd1" />
            <Text style={[styles.actionText, { color: theme.text }]}>Bağışçılar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: isDark ? 'rgba(250, 112, 154, 0.15)' : 'rgba(250, 112, 154, 0.1)' }]}
            onPress={() => router.push('/budget/donors/incoming' as any)}
          >
            <Ionicons name="calendar" size={28} color="#fa709a" />
            <Text style={[styles.actionText, { color: theme.text }]}>Beklenen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: isDark ? 'rgba(255, 159, 67, 0.15)' : 'rgba(255, 159, 67, 0.1)' }]}
            onPress={() => router.push('/budget/donors/analytics' as any)}
          >
            <Ionicons name="pie-chart" size={28} color="#ff9f43" />
            <Text style={[styles.actionText, { color: theme.text }]}>Bağış Analiz</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Son İşlemler</Text>
          <TouchableOpacity onPress={() => router.push('/budget/transactions' as any)}>
            <Text style={{ color: theme.tint, fontSize: 14 }}>Tümü</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={50} color={theme.tabIconDefault} />
            <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>Henüz işlem yok</Text>
          </View>
        ) : (
          transactions.map((item, index) => renderTransactionItem({ item, index }))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <AddTransactionModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        transactionType={transactionType}
        setTransactionType={setTransactionType}
        categories={defaultCategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        amount={amount}
        onAmountChange={setAmount}
        description={description}
        onDescriptionChange={setDescription}
        date={date}
        setDate={setDate}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        onSubmit={handleAddTransaction}
        theme={theme}
        colorScheme={colorScheme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15 },
  headerBtn: { padding: 5 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20 },
  statsContainer: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  statCard: { flex: 1, padding: 15, borderRadius: 16 },
  statLabel: { fontSize: 13, marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  balanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 10 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 5 },
  balanceValue: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  balanceIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  actionCard: { flex: 1, alignItems: 'center', padding: 15, borderRadius: 15 },
  actionText: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  transactionCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 10 },
  transactionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionInfo: { flex: 1 },
  transactionDescription: { fontSize: 16, fontWeight: '500' },
  transactionDate: { fontSize: 13, marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, marginTop: 10 },
});