import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Category, Transaction } from '../../services/BudgetService';

interface Props {
  data: Array<[string, Transaction[]]>;
  theme: any;
  categories: Category[];
  onDelete: (transactionId: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  showEmpty: boolean;
  emptyContext: {
    activeTab: 'overview' | 'transactions' | 'analysis';
    selectedDate: Date | null;
  };
}

export default function TransactionList({ data, theme, categories, onDelete, hasMore, isLoadingMore, onLoadMore, showEmpty, emptyContext }: Props) {
  const renderTransactionItem = useCallback(({ item: [dateKey, dayTransactions] }: { item: [string, Transaction[]] }) => {
    try {
      const missing = dayTransactions.filter(t => t.type === 'expense' && (!t.userName || String(t.userName).trim() === ''));
      if (missing.length > 0) {
        console.log('[Tx Debug] Missing userName on date', dateKey, 'count=', missing.length, missing.slice(0, 3).map(t => ({ id: t.id, amount: t.amount, category: t.category })));
      }
    } catch {}
    return (
      <View>
        <View style={styles.dateHeader}>
          <Text style={[styles.dateHeaderText, { color: theme.textDim }]}>
            {format(new Date(dateKey), 'd MMMM yyyy', { locale: tr })}
          </Text>
          <Text style={[styles.dateTotal, { color: theme.textDim }]}>
            ₺{dayTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0).toFixed(0)}
          </Text>
        </View>
        {dayTransactions.map((transaction, transactionIndex) => {
          const category = categories.find(cat => cat.id === transaction.category);
          return (
            <TouchableOpacity
              key={`${transaction.id}-${transactionIndex}-${dateKey}`}
              style={[styles.transactionCard, { backgroundColor: theme.surface }]}
            >
              <View style={[styles.transactionIcon, { backgroundColor: (category?.color || '#A8E6CF') + '15' }]}>
                <MaterialCommunityIcons name={category?.icon as any} size={20} color={category?.color} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionDescription, { color: theme.text }]}>
                  {transaction.description}
                </Text>
                <Text style={[styles.transactionCategory, { color: theme.textDim }]}>
                  {category?.name}
                </Text>
                <Text style={[styles.transactionUser, { color: theme.textDim }]}
                  numberOfLines={1}
                >
                  {transaction.userName || 'Bilinmeyen'}
                </Text>
              </View>
              <View style={styles.transactionAmountContainer}>
                <Text style={[styles.transactionAmount, { color: transaction.type === 'income' ? '#4CAF50' : '#FF6B6B' }]}>
                  {transaction.type === 'income' ? '+' : '-'}₺{transaction.amount.toFixed(0)}
                </Text>
                <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(transaction.id)}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color={theme.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [theme, categories, onDelete]);

  if (showEmpty) {
    return (
      <View style={[styles.emptyStateContainer, { backgroundColor: theme.surface }]}> 
        <MaterialCommunityIcons name="cash-remove" size={48} color={theme.textDim} style={styles.emptyStateIcon} />
        <Text style={[styles.emptyStateText, { color: theme.textDim }]}> 
          {emptyContext.activeTab === 'overview' ? 'Son 14 günde işlem bulunmuyor' : emptyContext.selectedDate ? `${format(emptyContext.selectedDate, 'd MMMM yyyy', { locale: tr })} tarihinde işlem bulunmuyor` : 'Bu dönemde işlem bulunmuyor'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderTransactionItem}
      keyExtractor={([dateKey], index) => `${dateKey}-${index}`}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        hasMore && !isLoadingMore ? (
          <TouchableOpacity style={[styles.loadMoreButton, { backgroundColor: theme.surface }]} onPress={onLoadMore}>
            <MaterialCommunityIcons name="chevron-down" size={20} color={theme.primary} />
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
}

const styles = StyleSheet.create({
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
  transactionUser: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
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
});


