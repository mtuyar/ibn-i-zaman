import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { endOfMonth, endOfWeek, endOfYear, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getTransactionsByDateRange, getTransactionsByDateRangeAllUsers, Transaction } from '../../services/BudgetService';

interface BudgetStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

type Period = 'week' | 'month' | 'year';

interface SummaryCardsProps {
  stats: BudgetStats;
  transactions: Array<{ date: Date }>;
  selectedPeriod: Period;
  theme: any;
}

export default function SummaryCards({ stats, transactions, selectedPeriod, theme }: SummaryCardsProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [summaryPeriod, setSummaryPeriod] = useState<Period>('month');
  const [summaryStats, setSummaryStats] = useState<BudgetStats>({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [summaryCount, setSummaryCount] = useState<number>(0);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('budget_summary_collapsed');
        if (saved !== null) {
          setCollapsed(saved === 'true');
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const toggleCollapsed = async () => {
    try {
      const next = !collapsed;
      setCollapsed(next);
      await AsyncStorage.setItem('budget_summary_collapsed', next ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
  };

  const maskNumber = (num: number) => {
    const len = Math.max(3, Math.min(8, Math.floor(Math.abs(num)).toString().length));
    return '•'.repeat(len);
  };

  const displayCurrency = (num: number) => (collapsed ? `₺${maskNumber(num)}` : `₺${num.toFixed(0)}`);
  const displayCount = (num: number) => (collapsed ? maskNumber(num) : `${num}`);

  const getRangeForPeriod = (period: Period) => {
    const now = new Date();
    if (period === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (period === 'month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    // year
    const start = startOfYear(now);
    const end = endOfYear(now);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const { start, end } = getRangeForPeriod(summaryPeriod);
        const list: Transaction[] = isAdmin
          ? await getTransactionsByDateRangeAllUsers(start, end)
          : await getTransactionsByDateRange(start, end, user);
        const totals = list.reduce(
          (acc, t) => {
            if (t.type === 'income') acc.totalIncome += Number(t.amount) || 0;
            else acc.totalExpense += Number(t.amount) || 0;
            return acc;
          },
          { totalIncome: 0, totalExpense: 0 }
        ) as any;
        const balance = totals.totalIncome - totals.totalExpense;
        setSummaryStats({ totalIncome: totals.totalIncome, totalExpense: totals.totalExpense, balance });
        setSummaryCount(list.length);
      } catch (e) {
        setSummaryStats({ totalIncome: 0, totalExpense: 0, balance: 0 });
        setSummaryCount(0);
      }
    };
    load();
  }, [user, summaryPeriod]);

  return (
    <View style={styles.summaryContainer}>
      <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}> 
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}> 
            {summaryPeriod === 'week' ? 'Bu Hafta' : 
             summaryPeriod === 'month' ? 'Bu Ay' : 'Bu Yıl'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={toggleCollapsed} style={{ padding: 6, marginRight: 2 }}>
              <MaterialCommunityIcons
                name={collapsed ? 'eye-off' : 'eye'}
                size={22}
                color={theme.textDim}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.periodSelector, { backgroundColor: `${theme.text}10` }]}>
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, summaryPeriod === p && { backgroundColor: theme.primary }]}
              onPress={() => setSummaryPeriod(p)}
            >
              <Text style={[styles.periodButtonText, { color: summaryPeriod === p ? '#FFF' : theme.text }]}>
                {p === 'week' ? 'Hafta' : p === 'month' ? 'Ay' : 'Yıl'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryItemHeader}>
              <MaterialCommunityIcons name="cash-plus" size={16} color={theme.success} />
              <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gelir</Text>
            </View>
            <Text style={[styles.summaryItemAmount, { color: theme.success }]}> 
              {displayCurrency(summaryStats.totalIncome)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryItemHeader}>
              <MaterialCommunityIcons name="cash-minus" size={16} color={theme.error} />
              <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Gider</Text>
            </View>
            <Text style={[styles.summaryItemAmount, { color: theme.error }]}> 
              {displayCurrency(summaryStats.totalExpense)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryItemHeader}>
              <MaterialCommunityIcons 
                name={summaryStats.balance >= 0 ? 'wallet' : 'alert-circle'} 
                size={16} 
                color={summaryStats.balance >= 0 ? theme.primary : theme.error} 
              />
              <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>Bakiye</Text>
            </View>
            <Text style={[styles.summaryItemAmount, { color: summaryStats.balance >= 0 ? theme.primary : theme.error }]}> 
              {displayCurrency(Math.abs(summaryStats.balance))}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <View style={styles.summaryItemHeader}>
              <MaterialCommunityIcons name="swap-horizontal" size={16} color={theme.accent} />
              <Text style={[styles.summaryItemLabel, { color: theme.textDim }]}>İşlem</Text>
            </View>
            <Text style={[styles.summaryItemAmount, { color: theme.accent }]}> 
              {displayCount(summaryCount)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  periodSelector: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});


