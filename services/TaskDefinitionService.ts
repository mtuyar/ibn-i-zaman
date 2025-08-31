import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TaskDefinition, TaskCategory } from '../app/types/task.types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

const DAILY_TASKS_COLLECTION = 'dailyTasks';
const WEEKLY_TASKS_COLLECTION = 'weeklyTasks';
const MONTHLY_TASKS_COLLECTION = 'monthlyTasks';

// Koleksiyon adını kategoriye göre belirle
const getCollectionName = (category: TaskCategory): string => {
  switch (category) {
    case 'daily':
      return DAILY_TASKS_COLLECTION;
    case 'weekly':
      return WEEKLY_TASKS_COLLECTION;
    case 'monthly':
      return MONTHLY_TASKS_COLLECTION;
  }
};

// Tüm vazife tanımlarını getir
export const getAllTaskDefinitions = async (): Promise<TaskDefinition[]> => {
  try {
    const [dailyTasks, weeklyTasks, monthlyTasks] = await Promise.all([
      getTaskDefinitionsByCategory('daily'),
      getTaskDefinitionsByCategory('weekly'),
      getTaskDefinitionsByCategory('monthly')
    ]);

    return [...dailyTasks, ...weeklyTasks, ...monthlyTasks];
  } catch (error) {
    console.error('Vazife tanımları getirme hatası:', error);
    throw error;
  }
};

// Kategoriye göre vazife tanımlarını getir
export const getTaskDefinitionsByCategory = async (category: TaskCategory): Promise<TaskDefinition[]> => {
  try {
    const collectionName = getCollectionName(category);
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      category,
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as TaskDefinition[];
  } catch (error) {
    console.error('Kategori bazlı vazife tanımları getirme hatası:', error);
    throw error;
  }
};

// Yeni vazife tanımı ekle
export const addTaskDefinition = async (taskDefinition: Omit<TaskDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const collectionName = getCollectionName(taskDefinition.category);
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, collectionName), {
      ...taskDefinition,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('Vazife tanımı ekleme hatası:', error);
    throw error;
  }
};

// Vazife tanımını güncelle
export const updateTaskDefinition = async (id: string, category: TaskCategory, updates: Partial<TaskDefinition>): Promise<void> => {
  try {
    const collectionName = getCollectionName(category);
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Vazife tanımı güncelleme hatası:', error);
    throw error;
  }
};

// Vazife tanımını sil
export const deleteTaskDefinition = async (id: string, category: TaskCategory): Promise<void> => {
  try {
    const collectionName = getCollectionName(category);
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Vazife tanımı silme hatası:', error);
    throw error;
  }
};

// Haftalık görünüm için tarih formatı
export const getWeeklyDateRange = (date: Date): string => {
  const start = startOfWeek(date, { locale: tr });
  const end = endOfWeek(date, { locale: tr });
  return `${format(start, 'd MMMM', { locale: tr })} - ${format(end, 'd MMMM', { locale: tr })}`;
};

// Aylık görünüm için tarih formatı
export const getMonthlyDateRange = (date: Date): string => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return `${format(start, 'd MMMM', { locale: tr })} - ${format(end, 'd MMMM', { locale: tr })}`;
};

// Tüm vazife tanımlarını sil
export const deleteAllTaskDefinitions = async (): Promise<void> => {
  try {
    // Tüm kategorilerdeki vazifeleri sil
    const [dailyTasks, weeklyTasks, monthlyTasks] = await Promise.all([
      getTaskDefinitionsByCategory('daily'),
      getTaskDefinitionsByCategory('weekly'),
      getTaskDefinitionsByCategory('monthly')
    ]);

    // Her kategorideki vazifeleri sil
    await Promise.all([
      ...dailyTasks.map(task => deleteTaskDefinition(task.id, 'daily')),
      ...weeklyTasks.map(task => deleteTaskDefinition(task.id, 'weekly')),
      ...monthlyTasks.map(task => deleteTaskDefinition(task.id, 'monthly'))
    ]);
  } catch (error) {
    console.error('Vazife tanımlarını silme hatası:', error);
    throw error;
  }
};

// Örnek vazifeleri ekle
export const addSampleTasks = async (userId: string): Promise<void> => {
  try {
    // Önce mevcut vazifeleri sil
    await deleteAllTaskDefinitions();

    // Günlük vazifeler (5 adet)
    const dailyTasks = [
      {
        title: 'Günlük Vazife 1',
        description: 'Günlük vazife açıklaması 1',
        category: 'daily' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      },
      {
        title: 'Günlük Vazife 2',
        description: 'Günlük vazife açıklaması 2',
        category: 'daily' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      },
      {
        title: 'Günlük Vazife 3',
        description: 'Günlük vazife açıklaması 3',
        category: 'daily' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      },
      {
        title: 'Günlük Vazife 4',
        description: 'Günlük vazife açıklaması 4',
        category: 'daily' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      },
      {
        title: 'Günlük Vazife 5',
        description: 'Günlük vazife açıklaması 5',
        category: 'daily' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      }
    ];

    // Haftalık vazifeler (3 adet)
    const weeklyTasks = [
      {
        title: 'Haftalık Vazife 1',
        description: 'Haftalık vazife açıklaması 1',
        category: 'weekly' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      },
      {
        title: 'Haftalık Vazife 2',
        description: 'Haftalık vazife açıklaması 2',
        category: 'weekly' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      },
      {
        title: 'Haftalık Vazife 3',
        description: 'Haftalık vazife açıklaması 3',
        category: 'weekly' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      }
    ];

    // Aylık vazifeler (2 adet)
    const monthlyTasks = [
      {
        title: 'Aylık Vazife 1',
        description: 'Aylık vazife açıklaması 1',
        category: 'monthly' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      },
      {
        title: 'Aylık Vazife 2',
        description: 'Aylık vazife açıklaması 2',
        category: 'monthly' as TaskCategory,
        isImportant: true,
        createdBy: userId,
        date: new Date(),
      }
    ];

    // Tüm örnek vazifeleri ekle
    await Promise.all([
      ...dailyTasks.map(task => addTaskDefinition(task)),
      ...weeklyTasks.map(task => addTaskDefinition(task)),
      ...monthlyTasks.map(task => addTaskDefinition(task))
    ]);

  } catch (error) {
    console.error('Örnek vazifeleri ekleme hatası:', error);
    throw error;
  }
}; 