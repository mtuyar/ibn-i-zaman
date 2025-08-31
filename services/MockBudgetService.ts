import { subDays, subMonths, subYears, format } from 'date-fns';
import { tr } from 'date-fns/locale';

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: Date;
  userName: string;
}

export interface BudgetStats {
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

// Kategorileri güncelle
export const mockCategories: Category[] = [
  // Gelir kategorileri
  { id: 'salary', name: 'Maaş', icon: 'cash', color: '#4CAF50', type: 'income' },
  { id: 'investment', name: 'Yatırım', icon: 'chart-line', color: '#2196F3', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: 'laptop', color: '#9C27B0', type: 'income' },
  { id: 'other_income', name: 'Diğer Gelir', icon: 'cash-plus', color: '#00BCD4', type: 'income' },
  
  // Gider kategorileri
  { id: 'food', name: 'Yemek', icon: 'food', color: '#FF9800', type: 'expense' },
  { id: 'transport', name: 'Ulaşım', icon: 'car', color: '#F44336', type: 'expense' },
  { id: 'shopping', name: 'Alışveriş', icon: 'cart', color: '#E91E63', type: 'expense' },
  { id: 'bills', name: 'Faturalar', icon: 'file-document', color: '#607D8B', type: 'expense' },
  { id: 'entertainment', name: 'Eğlence', icon: 'movie', color: '#9C27B0', type: 'expense' },
  { id: 'health', name: 'Sağlık', icon: 'medical-bag', color: '#4CAF50', type: 'expense' },
  { id: 'education', name: 'Eğitim', icon: 'school', color: '#2196F3', type: 'expense' },
  { id: 'other_expense', name: 'Diğer Gider', icon: 'cash-minus', color: '#757575', type: 'expense' },
];

// Gerçekçi mock veri oluştur
const generateMockTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const today = new Date();
  const users = ['Ahmet Y.', 'Mehmet K.', 'Ayşe S.', 'Fatma M.'];

  // Son 1 yıllık veri
  for (let i = 0; i < 365; i++) {
    const date = subDays(today, i);
    
    // Gelir işlemleri (haftada 1-2 kez)
    if (i % 4 === 0) {
      const incomeCategories = mockCategories.filter(c => c.type === 'income');
      const category = incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
      
      let amount = 0;
      switch (category.id) {
        case 'salary':
          amount = 15000 + Math.random() * 5000; // Maaş
          break;
        case 'investment':
          amount = 500 + Math.random() * 2000; // Yatırım geliri
          break;
        case 'freelance':
          amount = 1000 + Math.random() * 3000; // Freelance
          break;
        default:
          amount = 200 + Math.random() * 1000; // Diğer gelirler
      }

      transactions.push({
        id: `income_${i}`,
        amount: Math.round(amount),
        type: 'income',
        category: category.id,
        description: `${category.name} geliri`,
        date,
        userName: users[Math.floor(Math.random() * users.length)],
      });
    }

    // Gider işlemleri (günde 1-3 kez)
    const expenseCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < expenseCount; j++) {
      const expenseCategories = mockCategories.filter(c => c.type === 'expense');
      const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      
      let amount = 0;
      switch (category.id) {
        case 'food':
          amount = 50 + Math.random() * 150; // Yemek
          break;
        case 'transport':
          amount = 20 + Math.random() * 80; // Ulaşım
          break;
        case 'shopping':
          amount = 100 + Math.random() * 400; // Alışveriş
          break;
        case 'bills':
          amount = 200 + Math.random() * 800; // Faturalar
          break;
        case 'entertainment':
          amount = 100 + Math.random() * 300; // Eğlence
          break;
        case 'health':
          amount = 150 + Math.random() * 350; // Sağlık
          break;
        case 'education':
          amount = 300 + Math.random() * 700; // Eğitim
          break;
        default:
          amount = 50 + Math.random() * 200; // Diğer giderler
      }

      transactions.push({
        id: `expense_${i}_${j}`,
        amount: Math.round(amount),
        type: 'expense',
        category: category.id,
        description: `${category.name} harcaması`,
        date,
        userName: users[Math.floor(Math.random() * users.length)],
      });
    }
  }

  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const mockTransactions = generateMockTransactions();

// İstatistikleri hesapla
export const calculateStats = (period: 'week' | 'month' | 'year' = 'month'): BudgetStats => {
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

  const filteredTransactions = mockTransactions.filter(t => t.date >= startDate && t.date <= today);

  // Toplam gelir ve gider
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Kategori bazlı toplamlar
  const categoryTotals: { [key: string]: number } = {};
  filteredTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  // Periyot bazlı istatistikler
  const calculatePeriodStats = (days: number) => {
    const periodStart = subDays(today, days);
    const periodTransactions = mockTransactions.filter(
      t => t.date >= periodStart && t.date <= today
    );

    return {
      income: periodTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      expense: periodTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    };
  };

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    categoryTotals,
    periodStats: {
      weekly: calculatePeriodStats(7),
      monthly: calculatePeriodStats(30),
      yearly: calculatePeriodStats(365),
    },
  };
};

// CRUD işlemleri
export const addMockTransaction = (transaction: Omit<Transaction, 'id' | 'userName'>): Transaction => {
  const newTransaction: Transaction = {
    ...transaction,
    id: `transaction_${Date.now()}`,
    userName: 'Mevcut Kullanıcı',
  };
  mockTransactions.unshift(newTransaction);
  return newTransaction;
};

export const deleteMockTransaction = (id: string): void => {
  const index = mockTransactions.findIndex(t => t.id === id);
  if (index !== -1) {
    mockTransactions.splice(index, 1);
  }
};

export const getMockTransactions = () => [...mockTransactions];
export const getMockCategories = () => [...mockCategories]; 