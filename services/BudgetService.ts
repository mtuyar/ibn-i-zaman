import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, deleteDoc, doc, updateDoc, limit, startAfter } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from 'firebase/auth';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string;
  category: string;
  date: Date;
  userId: string;
  userName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  userId?: string; // özel kategoriler için
}

export interface PagedResult {
  items: Transaction[];
  lastDoc: any;
}

export const defaultCategories: Category[] = [
  // Gelir Kategorileri
  { id: 'donation', name: 'Bağış', icon: 'hand-heart', color: '#4CAF50', type: 'income' },
  { id: 'zekat', name: 'Zekat', icon: 'hand-coin', color: '#43A047', type: 'income' },
  { id: 'fitre', name: 'Fitre', icon: 'handshake', color: '#2E7D32', type: 'income' },
  { id: 'sadaka', name: 'Sadaka', icon: 'charity', color: '#66BB6A', type: 'income' },
  { id: 'aid', name: 'Yardım', icon: 'account-heart', color: '#81C784', type: 'income' },
  { id: 'promotion_income', name: 'Promosyon', icon: 'cash-plus', color: '#009688', type: 'income' },
  { id: 'grant', name: 'Hibe/Proje', icon: 'file-document', color: '#26A69A', type: 'income' },
  { id: 'other_income', name: 'Diğer Gelir', icon: 'plus-circle', color: '#9C27B0', type: 'income' },
  
  // Gider Kategorileri
  { id: 'ikramlik', name: 'İkramlık', icon: 'food', color: '#FF8A65', type: 'expense' },
  { id: 'food', name: 'Yemek', icon: 'silverware-fork-knife', color: '#FF7043', type: 'expense' },
  { id: 'transport', name: 'Ulaşım', icon: 'car', color: '#4ECDC4', type: 'expense' },
  { id: 'utilities', name: 'Faturalar', icon: 'flash', color: '#FFD93D', type: 'expense' },
  { id: 'promo', name: 'Promosyon', icon: 'tshirt-crew', color: '#42A5F5', type: 'expense' },
  { id: 'event', name: 'Etkinlik', icon: 'account-group', color: '#7E57C2', type: 'expense' },
  { id: 'gezi', name: 'Gezi', icon: 'map', color: '#29B6F6', type: 'expense' },
  { id: 'camp', name: 'Kamp', icon: 'tent', color: '#26C6DA', type: 'expense' },
  { id: 'education', name: 'Eğitim', icon: 'school', color: '#7C4DFF', type: 'expense' },
  { id: 'tech', name: 'Teknoloji', icon: 'laptop', color: '#90CAF9', type: 'expense' },
  { id: 'health', name: 'Sağlık', icon: 'medical-bag', color: '#EF5350', type: 'expense' },
  { id: 'rent', name: 'Kira', icon: 'home-city', color: '#8D6E63', type: 'expense' },
  { id: 'other_expense', name: 'Diğer Gider', icon: 'dots-horizontal', color: '#A8E6CF', type: 'expense' },
];

// Yeni işlem ekle
export const addTransaction = async (
  transaction: Omit<Transaction, 'id' | 'userId' | 'userName' | 'createdAt' | 'updatedAt'>,
  user: User
) => {
  if (!user) throw new Error('Kullanıcı girişi gerekli');

  const now = new Date();
  const transactionData = {
    ...transaction,
    userId: user.uid,
    userName: user.displayName || 'İsimsiz Kullanıcı',
    date: Timestamp.fromDate(transaction.date),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };

  const docRef = await addDoc(collection(db, 'transactions'), transactionData);
  return {
    id: docRef.id,
    ...transactionData,
    date: transaction.date,
    createdAt: now,
    updatedAt: now,
  };
};

// Tarih aralığına göre sayfalı işlemleri getir (admin farkındalıklı)
export const getTransactionsByRangePaged = async (
  params: {
    user: User;
    isAdmin: boolean;
    startDate: Date;
    endDate: Date;
    pageSize: number;
    lastDoc?: any;
  }
): Promise<PagedResult> => {
  const { user, isAdmin, startDate, endDate, pageSize, lastDoc } = params;
  if (!user) return { items: [], lastDoc: null };

  let q: any = query(
    collection(db, 'transactions'),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc'),
    limit(pageSize)
  );

  if (!isAdmin) {
    q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc'),
      limit(pageSize)
    );
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const items: Transaction[] = snapshot.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      date: data.date.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Transaction;
  });

  const nextCursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  return { items, lastDoc: nextCursor };
};

// Tüm işlemleri getir (kullanıcı bazlı)
export const getTransactions = async (user: User): Promise<Transaction[]> => {
  try {
    if (!user) {
      console.log('Kullanıcı girişi olmadığı için işlemler getirilemiyor');
      return [];
    }

    console.log(`${user.uid} kullanıcısı için işlemler getiriliyor...`);
    
    // Geçici olarak sadece userId'ye göre filtreleme yapıyoruz
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const snapshot = await getDocs(transactionsQuery);
    const transactions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Transaction;
    });

    // Sonuçları JavaScript tarafında sıralıyoruz
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    console.log(`${transactions.length} adet işlem bulundu`);
    return transactions;
  } catch (error) {
    console.error('İşlemler getirilirken hata:', error);
    throw error;
  }
};

// Admin görünümü için tüm işlemler
export const getAllTransactions = async (): Promise<Transaction[]> => {
  const snapshot = await getDocs(collection(db, 'transactions'));
  const transactions = snapshot.docs.map(doc => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      ...data,
      date: data.date.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Transaction;
  });
  transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  return transactions;
};

// Admin aware: eğer admin ise tüm işlemler, değilse kendi işlemleri
export const getTransactionsAdminAware = async (user: User, isAdmin: boolean): Promise<Transaction[]> => {
  if (!user) return [];
  if (isAdmin) {
    return getAllTransactions();
  }
  return getTransactions(user);
};

// Tipe göre işlemleri getir (kullanıcı bazlı)
export const getTransactionsByType = async (type: TransactionType, user: User): Promise<Transaction[]> => {
  if (!user) throw new Error('Kullanıcı girişi gerekli');

  const transactionsQuery = query(
    collection(db, 'transactions'),
    where('userId', '==', user.uid),
    where('type', '==', type),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(transactionsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  } as Transaction));
};

// Kategori bazlı işlemleri getir (kullanıcı bazlı)
export const getTransactionsByCategory = async (category: string, user: User): Promise<Transaction[]> => {
  if (!user) throw new Error('Kullanıcı girişi gerekli');

  const transactionsQuery = query(
    collection(db, 'transactions'),
    where('userId', '==', user.uid),
    where('category', '==', category),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(transactionsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  } as Transaction));
};

// Tarih aralığına göre işlemleri getir (kullanıcı bazlı)
export const getTransactionsByDateRange = async (startDate: Date, endDate: Date, user: User): Promise<Transaction[]> => {
  if (!user) throw new Error('Kullanıcı girişi gerekli');

  const transactionsQuery = query(
    collection(db, 'transactions'),
    where('userId', '==', user.uid),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(transactionsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  } as Transaction));
};

// İşlem sil
export const deleteTransaction = async (transactionId: string) => {
  await deleteDoc(doc(db, 'transactions', transactionId));
};

// İşlem güncelle
export const updateTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
  const transactionRef = doc(db, 'transactions', transactionId);
  const updateData = {
    ...updates,
    date: updates.date ? Timestamp.fromDate(updates.date) : undefined,
    updatedAt: Timestamp.fromDate(new Date()),
  };
  await updateDoc(transactionRef, updateData);
};

// Özel kategori ekle
export const addCustomCategory = async (
  category: Omit<Category, 'id'>,
  user: User
) => {
  if (!user) throw new Error('Kullanıcı girişi gerekli');

  const categoryData = {
    ...category,
    userId: user.uid,
  };

  const docRef = await addDoc(collection(db, 'categories'), categoryData);
  return {
    id: docRef.id,
    ...categoryData,
  };
};

// Kullanıcının kategorilerini getir
export const getUserCategories = async (user: User): Promise<Category[]> => {
  if (!user) throw new Error('Kullanıcı girişi gerekli');

  const categoriesQuery = query(
    collection(db, 'categories'),
    where('userId', '==', user.uid)
  );

  const snapshot = await getDocs(categoriesQuery);
  const customCategories = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Category));

  return [...defaultCategories, ...customCategories];
};

// İstatistikler (kullanıcı bazlı)
export const getTransactionStats = async (
  period: 'week' | 'month' | 'year',
  user: User
): Promise<{
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryTotals: { [key: string]: number };
}> => {
  if (!user) throw new Error('Kullanıcı girişi gerekli');

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  const transactions = await getTransactionsByDateRange(startDate, new Date(), user);
  
  const stats = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'income') {
      acc.totalIncome += transaction.amount;
    } else {
      acc.totalExpense += transaction.amount;
      acc.categoryTotals[transaction.category] = (acc.categoryTotals[transaction.category] || 0) + transaction.amount;
    }
    return acc;
  }, {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    categoryTotals: {} as { [key: string]: number },
  });

  stats.balance = stats.totalIncome - stats.totalExpense;
  return stats;
};

// Yeni: Tarih aralığında tüm kullanıcılar için en çok harcayanları getir (top N)
export const getTopSpendersByRange = async (
  params: { startDate: Date; endDate: Date; limit?: number }
): Promise<{ top: Array<{ userId: string; userName: string; amount: number }>; totalExpense: number }> => {
  const { startDate, endDate, limit = 5 } = params;

  // Yalnızca gider türündeki işlemler alınır
  const q = query(
    collection(db, 'transactions'),
    where('type', '==', 'expense'),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate))
  );

  const snapshot = await getDocs(q);

  const totalsMap = new Map<string, { userId: string; userName: string; amount: number }>();
  let totalExpense = 0;

  snapshot.forEach(docSnap => {
    const data = docSnap.data() as any;
    const userId = data.userId || 'unknown';
    const userName = data.userName || 'Bilinmeyen';
    const amount = Number(data.amount) || 0;

    totalExpense += amount;

    const existing = totalsMap.get(userId) || { userId, userName, amount: 0 };
    existing.amount += amount;
    totalsMap.set(userId, existing);
  });

  const sorted = Array.from(totalsMap.values()).sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, limit);

  return { top, totalExpense };
}; 