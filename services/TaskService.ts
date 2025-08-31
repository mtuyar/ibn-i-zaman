import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDoc,
  startAfter,
  writeBatch,
  endAt,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Task, 
  TaskAnalytics, 
  TaskDefinition, 
  UserTaskStatus, 
  TaskCategory,
  TaskStatus 
} from '../app/types/task.types';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Koleksiyon referansları
const TASKS_COLLECTION = 'tasks'; // Kullanıcı bazlı görev durumları
const TASK_DEFINITIONS_COLLECTION = 'taskDefinitions'; // Görev tanımları

// Yeni koleksiyon isimleri
const DAILY_TASKS_COLLECTION = 'dailyTasks';
const WEEKLY_TASKS_COLLECTION = 'weeklyTasks';
const MONTHLY_TASKS_COLLECTION = 'monthlyTasks';

// Cache süresi (5 dakika)
const CACHE_DURATION = 5 * 60 * 1000;

// Görev tanımı oluşturma (Admin tarafından)
export const createTaskDefinition = async (taskDef: Omit<TaskDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const taskDefRef = await addDoc(collection(db, TASK_DEFINITIONS_COLLECTION), {
      ...taskDef,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true
    });
    return taskDefRef.id;
  } catch (error) {
    console.error('Görev tanımı oluşturma hatası:', error);
    throw error;
  }
};

// Görev tanımı güncelleme (Admin tarafından)
export const updateTaskDefinition = async (taskDefId: string, updatedData: Partial<TaskDefinition>): Promise<void> => {
  try {
    const taskDefRef = doc(db, TASK_DEFINITIONS_COLLECTION, taskDefId);
    await updateDoc(taskDefRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Görev tanımı güncelleme hatası:', error);
    throw error;
  }
};

// Görev tanımı silme (Admin tarafından)
export const deleteTaskDefinition = async (taskDefId: string): Promise<void> => {
  try {
    const taskDefRef = doc(db, TASK_DEFINITIONS_COLLECTION, taskDefId);
    await deleteDoc(taskDefRef);
  } catch (error) {
    console.error('Görev tanımı silme hatası:', error);
    throw error;
  }
};

// Tüm görev tanımlarını getirme (Admin için)
export const getAllTaskDefinitions = async (limitCount: number = 100, startAfterDoc: any = null): Promise<{tasks: TaskDefinition[], lastDoc: any}> => {
  try {
    let tasksQuery;
    
    if (startAfterDoc) {
      tasksQuery = query(
        collection(db, TASK_DEFINITIONS_COLLECTION),
        orderBy('createdAt', 'desc'),
        startAfter(startAfterDoc),
        limit(limitCount)
      );
    } else {
      tasksQuery = query(
        collection(db, TASK_DEFINITIONS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }
    
    const querySnapshot = await getDocs(tasksQuery);
    const tasks: TaskDefinition[] = [];
    let lastVisible = null;
    
    if (!querySnapshot.empty) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      
      querySnapshot.forEach((doc) => {
        const taskData = doc.data();
        tasks.push({
          id: doc.id,
          ...taskData,
          date: taskData.date?.toDate(),
          createdAt: taskData.createdAt?.toDate(),
          updatedAt: taskData.updatedAt?.toDate(),
        } as TaskDefinition);
      });
    }
    
    return { tasks, lastDoc: lastVisible };
  } catch (error) {
    console.error('Görev tanımlarını getirme hatası:', error);
    throw error;
  }
};

// Görev tanımını aktif/pasif yapma
export const toggleTaskDefinitionStatus = async (taskDefId: string, isActive: boolean): Promise<void> => {
  try {
    const taskDefRef = doc(db, TASK_DEFINITIONS_COLLECTION, taskDefId);
    await updateDoc(taskDefRef, {
      isActive: isActive,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Görev tanımı durum değiştirme hatası:', error);
    throw error;
  }
};

// Kullanıcı için görev durumu oluştur/güncelle
export const setUserTaskStatus = async (
  userId: string,
  taskDefId: string,
  status: 'pending' | 'completed'
): Promise<void> => {
  try {
    // Create a unique ID for the task status document
    const taskStatusId = `${userId}_${taskDefId}`;
    const taskStatusRef = doc(db, 'userTaskStatuses', taskStatusId);
    
    // Get task definition
    const taskDefRef = doc(db, TASK_DEFINITIONS_COLLECTION, taskDefId);
    const taskDefDoc = await getDoc(taskDefRef);
    
    if (!taskDefDoc.exists()) {
      throw new Error('Task definition not found');
    }
    
    const taskDef = taskDefDoc.data();
    const now = serverTimestamp();
    
    // Create or update the task status document
    await setDoc(taskStatusRef, {
      userId,
      taskDefId,
      status,
      completedAt: status === 'completed' ? now : null,
      createdAt: now,
      updatedAt: now,
      date: taskDef.date || now,
      category: taskDef.category,
      title: taskDef.title,
      description: taskDef.description || '',
      isImportant: taskDef.isImportant || false,
      isActive: taskDef.isActive || true,
      createdBy: taskDef.createdBy || 'system',
      isAdminOnly: taskDef.isAdminOnly || false,
      taskId: taskDefId
    }, { merge: true });

    // Clear cache by reading the document again
    await getDoc(taskStatusRef);
  } catch (error) {
    console.error('Error setting user task status:', error);
    throw error;
  }
};

// Kullanıcı görev durumunu oku veya yoksa oluştur
export const getUserTaskStatus = async (
  userId: string,
  taskDefId: string
): Promise<TaskStatus | null> => {
  try {
    // Önce userTaskStatuses koleksiyonuna bak
    const userTaskRef = doc(db, 'userTaskStatuses', `${userId}_${taskDefId}`);
    const userTaskDoc = await getDoc(userTaskRef);

    if (userTaskDoc.exists()) {
      const data = userTaskDoc.data();
      return {
        id: String(userTaskDoc.id),
        userId: String(data.userId || userId),
        taskId: String(data.taskId || userTaskDoc.id),
        taskDefId: String(data.taskDefId || taskDefId),
        category: (data.category || 'daily') as 'daily' | 'weekly' | 'monthly',
        status: (data.status || 'pending') as 'completed' | 'pending',
        date: (data.date?.toDate ? data.date.toDate() : (data.date ? new Date(data.date) : new Date())) as Date,
        completedAt: (data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : null)) as Date | null,
        updatedAt: (data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date())) as Date,
      };
    }

    // Yoksa taskDefinitions'dan çek ve kişiye özel kaydet
    const taskDefRef = doc(db, 'taskDefinitions', taskDefId);
    const taskDefDoc = await getDoc(taskDefRef);
    if (!taskDefDoc.exists()) {
      return null;
    }
    const taskDef = taskDefDoc.data();
    const now = new Date();
    const userTaskData: TaskStatus = {
      id: `${userId}_${taskDefId}`,
      userId: String(userId),
      taskId: String(taskDefId),
      taskDefId: String(taskDefId),
      category: (taskDef.category || 'daily') as 'daily' | 'weekly' | 'monthly',
      status: 'pending',
      date: taskDef.date?.toDate ? taskDef.date.toDate() : (taskDef.date ? new Date(taskDef.date) : now),
      completedAt: null,
      updatedAt: now,
    };
    await setDoc(userTaskRef, userTaskData, { merge: true });
    return userTaskData;
  } catch (error) {
    console.error('Error getting user task status:', error);
    throw error;
  }
};

// Kullanıcı için tüm görev durumlarını getir veya eksik olanları oluştur
export const getUserTaskStatuses = async (
  userId: string,
  category?: TaskCategory,
  date?: Date
): Promise<TaskStatus[]> => {
  try {
    // 1. Tüm aktif görev tanımlarını çek
    let taskDefsQuery = query(collection(db, 'taskDefinitions'), where('isActive', '==', true));
    if (category) {
      taskDefsQuery = query(taskDefsQuery, where('category', '==', category));
    }
    const taskDefsSnapshot = await getDocs(taskDefsQuery);
    const taskDefs = taskDefsSnapshot.docs;

    // 2. Her görev için kişiye özel taskStatus'u getir veya oluştur
    const statuses: TaskStatus[] = [];
    for (const docSnap of taskDefs) {
      const taskDef = docSnap.data();
      const status = await getUserTaskStatus(userId, docSnap.id);
      if (status) {
        // Tarih filtresi varsa uygula
        if (date) {
          const d = status.date;
          if (d && d instanceof Date && d.toDateString() === date.toDateString()) {
            statuses.push(status);
          }
        } else {
          statuses.push(status);
        }
      }
    }
    return statuses;
  } catch (error) {
    console.error('Error getting user task statuses:', error);
    throw error;
  }
};

// Vazifeyi tamamlama/tamamlamama
export const toggleTaskStatus = async (taskId: string): Promise<void> => {
  try {
    // API'ye gönder
    await fetch(`/api/tasks/${taskId}/toggle`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Görev durumu güncelleme hatası:', error);
    throw error;
  }
};

// Örnek görev tanımları ve kullanıcı durumları eklemek için yardımcı fonksiyon
export const addSampleTaskDefinitions = async (): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Örnek görev tanımları
    const taskDefs = [
      // Günlük vazifeler (5 adet)
      {
        title: "Günlük Vazife 1",
        description: "Günlük vazife açıklaması 1",
        category: "daily",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Günlük Vazife 2",
        description: "Günlük vazife açıklaması 2",
        category: "daily",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Günlük Vazife 3",
        description: "Günlük vazife açıklaması 3",
        category: "daily",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Günlük Vazife 4",
        description: "Günlük vazife açıklaması 4",
        category: "daily",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Günlük Vazife 5",
        description: "Günlük vazife açıklaması 5",
        category: "daily",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Haftalık vazifeler (3 adet)
      {
        title: "Haftalık Vazife 1",
        description: "Haftalık vazife açıklaması 1",
        category: "weekly",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Haftalık Vazife 2",
        description: "Haftalık vazife açıklaması 2",
        category: "weekly",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Haftalık Vazife 3",
        description: "Haftalık vazife açıklaması 3",
        category: "weekly",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Aylık vazifeler (2 adet)
      {
        title: "Aylık Vazife 1",
        description: "Aylık vazife açıklaması 1",
        category: "monthly",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Aylık Vazife 2",
        description: "Aylık vazife açıklaması 2",
        category: "monthly",
        isImportant: true,
        createdBy: "admin",
        isActive: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Görev tanımlarını firestore'a ekle
    for (const taskDef of taskDefs) {
      const taskDefRef = doc(collection(db, TASK_DEFINITIONS_COLLECTION));
      batch.set(taskDefRef, {
        ...taskDef,
        createdAt: Timestamp.fromDate(taskDef.createdAt),
        updatedAt: Timestamp.fromDate(taskDef.updatedAt),
        date: Timestamp.fromDate(taskDef.date)
      });
    }
    
    await batch.commit();
    console.log('Örnek görev tanımları başarıyla eklendi');
    
  } catch (error) {
    console.error('Örnek görev tanımları ekleme hatası:', error);
    throw error;
  }
};

// Belirli bir tarih için görevleri getir (KULLANICI BAZSIZ, sadece taskDefinitions)
export const getTasksByDate = async (_: string, date: Date): Promise<Task[]> => {
  try {
    // Tarih aralığını belirle (seçilen günün başlangıcı ve sonu)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Aktif görev tanımlarını al
    const taskDefsQuery = query(
      collection(db, TASK_DEFINITIONS_COLLECTION),
      where('isActive', '==', true)
    );
    const taskDefsSnapshot = await getDocs(taskDefsQuery);
    const taskDefinitions = taskDefsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as TaskDefinition[];

    // Görevleri oluştur
    const tasks: Task[] = [];
    for (const taskDef of taskDefinitions) {
      let isTaskForDate = false;
      switch (taskDef.category) {
        case 'daily':
          isTaskForDate = true;
          break;
        case 'weekly':
          // Haftanın herhangi bir günü için haftalık görev göster
          isTaskForDate = true;
          break;
        case 'monthly':
          // Ayın herhangi bir günü için aylık görev göster
          isTaskForDate = true;
          break;
        default:
          isTaskForDate = false;
      }
      if (isTaskForDate) {
        tasks.push({
          id: taskDef.id,
          title: taskDef.title,
          description: taskDef.description,
          assignedTo: '',
          status: 'pending',
          date: date,
          createdAt: taskDef.createdAt,
          updatedAt: taskDef.updatedAt,
          category: taskDef.category,
          isImportant: taskDef.isImportant,
          isEditable: false
        });
      }
    }
    return tasks;
  } catch (error) {
    console.error('Tarih bazlı görevleri getirme hatası:', error);
    throw error;
  }
};

// Son 2 haftalık görevleri getirme
export const getRecentTasks = async (userId: string): Promise<Task[]> => {
  try {
    const today = new Date();
    const twoWeeksAgo = subDays(today, 14);
    
    const tasksQuery = query(
      collection(db, TASKS_COLLECTION),
      where('assignedTo', '==', userId),
      where('date', '>=', twoWeeksAgo),
      where('date', '<=', today),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(tasksQuery);
    const tasks: Task[] = [];
    
    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      tasks.push({
        id: doc.id,
        ...taskData,
        date: taskData.date?.toDate(),
        createdAt: taskData.createdAt?.toDate(),
        updatedAt: taskData.updatedAt?.toDate(),
        completedAt: taskData.completedAt?.toDate(),
        reminderTime: taskData.reminderTime?.toDate(),
      } as Task);
    });
    
    return tasks;
  } catch (error) {
    console.error('Son görevleri getirme hatası:', error);
    throw error;
  }
};

// Vazife hatırlatıcı ayarlama
export const setTaskReminder = async (taskId: string, reminderTime: Date | null): Promise<void> => {
  try {
    // API'ye gönder
    await fetch(`/api/tasks/${taskId}/reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reminderTime }),
    });
  } catch (error) {
    console.error('Hatırlatıcı ayarlanırken hata:', error);
    throw error;
  }
};

// Bugün ve dünün görevlerini getirme
export const getTodayAndYesterdayTasks = async (userId: string): Promise<{today: Task[], yesterday: Task[]}> => {
  try {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    const todayTasks = await getTasksByDate(userId, today);
    const yesterdayTasks = await getTasksByDate(userId, yesterday);
    
    return {
      today: todayTasks,
      yesterday: yesterdayTasks
    };
  } catch (error) {
    console.error('Bugün ve dünün görevlerini getirme hatası:', error);
    throw error;
  }
};

// Vazife analizlerini getirme
export const getTaskAnalytics = async (): Promise<TaskAnalytics> => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Get all tasks for the current month
    const tasksRef = collection(db, 'userTaskStatuses');
    const q = query(
      tasksRef,
      where('date', '>=', Timestamp.fromDate(startOfMonth)),
      where('date', '<=', Timestamp.fromDate(endOfMonth)),
      orderBy('date', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskStatus[];
    
    // Process daily analytics
    const daily = tasks.reduce((acc: any[], task) => {
      const date = format(new Date(task.date), 'yyyy-MM-dd');
      const existingDay = acc.find(d => d.date === date);
      
      if (existingDay) {
        existingDay.total++;
        if (task.status === 'completed') {
          existingDay.completed++;
        }
      } else {
        acc.push({
          date,
          total: 1,
          completed: task.status === 'completed' ? 1 : 0
        });
      }
      
      return acc;
    }, []);
    
    // Process weekly analytics
    const weekly = tasks.reduce((acc: any[], task) => {
      const week = format(new Date(task.date), "'Week' w");
      const existingWeek = acc.find(w => w.week === week);
      
      if (existingWeek) {
        existingWeek.total++;
        if (task.status === 'completed') {
          existingWeek.completed++;
        }
      } else {
        acc.push({
          week,
          total: 1,
          completed: task.status === 'completed' ? 1 : 0
        });
      }
      
      return acc;
    }, []);
    
    // Process monthly analytics
    const monthly = tasks.reduce((acc: any[], task) => {
      const month = format(new Date(task.date), 'MMMM yyyy');
      const existingMonth = acc.find(m => m.month === month);
      
      if (existingMonth) {
        existingMonth.total++;
        if (task.status === 'completed') {
          existingMonth.completed++;
        }
      } else {
        acc.push({
          month,
          total: 1,
          completed: task.status === 'completed' ? 1 : 0
        });
      }
      
      return acc;
    }, []);
    
    // Process task-based analytics
    const taskBased = tasks.reduce((acc: any[], task) => {
      const existingTask = acc.find(t => t.taskId === task.taskDefId);
      
      if (existingTask) {
        existingTask.total++;
        if (task.status === 'completed') {
          existingTask.completed++;
        }
      } else {
        acc.push({
          taskId: task.taskDefId,
          taskTitle: task.taskDefId, // We'll need to fetch task titles separately
          total: 1,
          completed: task.status === 'completed' ? 1 : 0
        });
      }
      
      return acc;
    }, []).map(task => ({
      taskId: task.taskId,
      taskTitle: task.taskTitle,
      completionRate: (task.completed / task.total) * 100
    }));
    
    return {
      daily,
      weekly,
      monthly,
      taskBased
    };
  } catch (error) {
    console.error('Error getting task analytics:', error);
    throw error;
  }
};

// Belirli bir tarih için tüm kullanıcılara atanmış vazifeleri getir
export const getTaskStatusForAllUsers = async (date: Date): Promise<Task[]> => {
  try {
    // Tarih aralığını belirle (seçilen günün başlangıcı ve sonu)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Vazifeleri getir
    const tasksQuery = query(
      collection(db, TASKS_COLLECTION),
      where('date', '>=', startOfDay),
      where('date', '<=', endOfDay)
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks: Task[] = [];
    
    tasksSnapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        status: data.status,
        date: data.date.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        completedAt: data.completedAt ? data.completedAt.toDate() : undefined,
        reminderTime: data.reminderTime ? data.reminderTime.toDate() : undefined,
        category: data.category,
        isImportant: data.isImportant
      });
    });
    
    return tasks;
  } catch (error) {
    console.error('Tüm kullanıcı vazifeleri getirme hatası:', error);
    throw error;
  }
};

export const getTasksByDateRange = async (startDate: Date, endDate: Date): Promise<Task[]> => {
  try {
    // Ensure dates are valid
    if (!(startDate instanceof Date) || !(endDate instanceof Date) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date range');
    }

    // Normalize dates to start of day
    const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // Get task definitions
    const taskDefinitionsSnapshot = await getDocs(collection(db, 'taskDefinitions'));
    const taskDefinitions = taskDefinitionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskDefinition[];

    // Get user task statuses
    const userTaskStatusesSnapshot = await getDocs(collection(db, 'userTaskStatuses'));
    const userTaskStatuses = userTaskStatusesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      notificationEnabled: false // Add default value
    })) as UserTaskStatus[];

    const tasks: Task[] = [];

    // Process each day in the range
    const currentDate = new Date(normalizedStartDate);
    while (currentDate <= normalizedEndDate) {
      // Process daily tasks
      const dailyTasks = taskDefinitions.filter(def => def.category === 'daily');
      for (const taskDef of dailyTasks) {
        const existingStatus = userTaskStatuses.find(
          status => status.taskDefId === taskDef.id && 
          new Date(status.date).getTime() === currentDate.getTime()
        );

        if (!existingStatus) {
          // Create new task status
          const newTaskStatus: UserTaskStatus = {
            id: `${taskDef.id}_${currentDate.getTime()}`,
            userId: 'system',
            taskDefId: taskDef.id,
            title: taskDef.title,
            description: taskDef.description,
            category: taskDef.category as TaskCategory,
            status: 'pending',
            date: currentDate.toISOString(),
            assignedTo: taskDef.assignedTo,
            isImportant: taskDef.isImportant,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            reminderTime: null,
            notificationEnabled: false
          };

          // Add to tasks array
          tasks.push({
            ...newTaskStatus,
            isPredefined: true,
            completedAt: null
          });
        } else {
          // Add existing task
          tasks.push({
            ...existingStatus,
            isPredefined: true,
            completedAt: existingStatus.completedAt || null
          });
        }
      }

      // Process weekly tasks
      if (currentDate.getDay() === 1) { // Monday
        const weeklyTasks = taskDefinitions.filter(def => def.category === 'weekly');
        for (const taskDef of weeklyTasks) {
          const existingStatus = userTaskStatuses.find(
            status => status.taskDefId === taskDef.id && 
            new Date(status.date).getTime() === currentDate.getTime()
          );

          if (!existingStatus) {
            const newTaskStatus: UserTaskStatus = {
              id: `${taskDef.id}_${currentDate.getTime()}`,
              userId: 'system',
              taskDefId: taskDef.id,
              title: taskDef.title,
              description: taskDef.description,
              category: taskDef.category as TaskCategory,
              status: 'pending',
              date: currentDate.toISOString(),
              assignedTo: taskDef.assignedTo,
              isImportant: taskDef.isImportant,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              reminderTime: null,
              notificationEnabled: false
            };

            tasks.push({
              ...newTaskStatus,
              isPredefined: true,
              completedAt: null
            });
          } else {
            tasks.push({
              ...existingStatus,
              isPredefined: true,
              completedAt: existingStatus.completedAt || null
            });
          }
        }
      }

      // Process monthly tasks
      if (currentDate.getDate() === 1) { // First day of month
        const monthlyTasks = taskDefinitions.filter(def => def.category === 'monthly');
        for (const taskDef of monthlyTasks) {
          const existingStatus = userTaskStatuses.find(
            status => status.taskDefId === taskDef.id && 
            new Date(status.date).getTime() === currentDate.getTime()
          );

          if (!existingStatus) {
            const newTaskStatus: UserTaskStatus = {
              id: `${taskDef.id}_${currentDate.getTime()}`,
              userId: 'system',
              taskDefId: taskDef.id,
              title: taskDef.title,
              description: taskDef.description,
              category: taskDef.category as TaskCategory,
              status: 'pending',
              date: currentDate.toISOString(),
              assignedTo: taskDef.assignedTo,
              isImportant: taskDef.isImportant,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              reminderTime: null,
              notificationEnabled: false
            };

            tasks.push({
              ...newTaskStatus,
              isPredefined: true,
              completedAt: null
            });
          } else {
            tasks.push({
              ...existingStatus,
              isPredefined: true,
              completedAt: existingStatus.completedAt || null
            });
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return tasks;
  } catch (error) {
    console.error('Tarih bazlı görevleri getirme hatası:', error);
    throw error;
  }
};

// Günlük görevleri getir
export const getDailyTasks = async (userId?: string, selectedDate?: Date): Promise<Task[]> => {
  try {
    // 1. Aktif günlük görev tanımlarını getir
    const taskDefsQuery = query(
      collection(db, TASK_DEFINITIONS_COLLECTION),
      where('category', '==', 'daily'),
      where('isActive', '==', true)
    );
    
    const taskDefsSnapshot = await getDocs(taskDefsQuery);
    const taskDefinitions = taskDefsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskDefinition[];

    // 2. Kullanıcı görev durumlarını getir (eğer userId verilmişse)
    let userTaskStatuses: { [key: string]: any } = {};
    if (userId) {
      // Seçili tarih için tarih aralığını belirle
      const startOfDay = selectedDate ? new Date(selectedDate) : new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // Tarih aralığı için sorgu oluştur
      const statusesQuery = query(
        collection(db, 'userTaskStatuses'),
        where('userId', '==', userId),
        where('category', '==', 'daily'),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      );
      
      const statusesSnapshot = await getDocs(statusesQuery);
      
      // Her görev için durumu kaydet
      statusesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const taskDefId = data.taskDefId;
        if (taskDefId) {
          userTaskStatuses[taskDefId] = {
            id: doc.id,
            ...data,
            date: data.date?.toDate() || startOfDay,
            completedAt: data.completedAt?.toDate() || null,
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }
      });
    }

    // 3. Görev tanımları ve kullanıcı durumlarını birleştir
    const tasks = taskDefinitions.map(taskDef => {
      const userStatus = userTaskStatuses[taskDef.id];
      const taskDate = selectedDate || new Date();
      
      // Eğer bu görev için kullanıcı durumu yoksa, yeni bir durum oluştur
      if (!userStatus && userId) {
        const newStatusId = `${userId}_${taskDef.id}_${taskDate.getTime()}`;
        const newStatus = {
          id: newStatusId,
          userId: userId,
          taskDefId: taskDef.id,
          taskId: taskDef.id,
          category: 'daily',
          status: 'pending',
          date: taskDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
          reminderTime: null,
          title: taskDef.title,
          description: taskDef.description || '',
          isImportant: taskDef.isImportant || false
        };

        // Yeni durumu veritabanına kaydet
        setDoc(doc(db, 'userTaskStatuses', newStatusId), newStatus).catch(console.error);
        
        return {
          ...newStatus,
          isActive: taskDef.isActive,
          createdBy: taskDef.createdBy || 'system'
        } as Task;
      }

      // Mevcut durumu kullan
      return {
        id: userStatus?.id || `${taskDef.id}_${taskDate.getTime()}`,
        taskDefId: taskDef.id,
        title: taskDef.title,
        description: taskDef.description || '',
        category: 'daily',
        isImportant: taskDef.isImportant,
        status: userStatus?.status || 'pending',
        date: userStatus?.date || taskDate,
        assignedTo: userId || '',
        createdAt: userStatus?.createdAt || taskDef.createdAt?.toDate() || new Date(),
        updatedAt: userStatus?.updatedAt || taskDef.updatedAt?.toDate() || new Date(),
        completedAt: userStatus?.completedAt || null,
        reminderTime: userStatus?.reminderTime?.toDate() || null,
        isActive: taskDef.isActive,
        createdBy: taskDef.createdBy || 'system'
      } as Task;
    });

    return tasks;
  } catch (error) {
    console.error('Günlük vazifeler getirme hatası:', error);
    return [];
  }
};

// Haftalık görevleri getir
export const getWeeklyTasks = async (userId?: string): Promise<Task[]> => {
  try {
    // 1. Aktif haftalık görev tanımlarını getir
    const taskDefsQuery = query(
      collection(db, TASK_DEFINITIONS_COLLECTION),
      where('category', '==', 'weekly'),
      where('isActive', '==', true)
    );
    
    const taskDefsSnapshot = await getDocs(taskDefsQuery);
    const taskDefinitions = taskDefsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskDefinition[];

    // 2. Kullanıcı görev durumlarını getir (eğer userId verilmişse)
    let userTaskStatuses: { [key: string]: any } = {};
    if (userId) {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Pazartesi başlangıç
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Pazar bitiş
      
      const statusesQuery = query(
        collection(db, 'userTaskStatuses'),
        where('userId', '==', userId),
        where('category', '==', 'weekly'),
        where('date', '>=', Timestamp.fromDate(weekStart)),
        where('date', '<=', Timestamp.fromDate(weekEnd))
      );
      
      const statusesSnapshot = await getDocs(statusesQuery);
      userTaskStatuses = statusesSnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        acc[data.taskDefId] = {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || weekStart,
          completedAt: data.completedAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
        return acc;
      }, {});
    }

    // 3. Görev tanımları ve kullanıcı durumlarını birleştir
    return taskDefinitions.map(taskDef => {
      const userStatus = userTaskStatuses[taskDef.id];
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      
      return {
        id: userStatus?.id || taskDef.id,
        taskDefId: taskDef.id,
        title: taskDef.title,
        description: taskDef.description || '',
        category: 'weekly',
        isImportant: taskDef.isImportant,
        status: userStatus?.status || 'pending',
        date: userStatus?.date || weekStart,
        createdAt: taskDef.createdAt?.toDate() || new Date(),
        updatedAt: taskDef.updatedAt?.toDate() || new Date(),
        completedAt: userStatus?.completedAt || null,
        reminderTime: userStatus?.reminderTime?.toDate() || null,
        isActive: taskDef.isActive,
        createdBy: taskDef.createdBy || 'admin',
        isAdminOnly: taskDef.isAdminOnly || false
      } as Task;
    });
  } catch (error) {
    console.error('Haftalık vazifeler getirme hatası:', error);
    return [];
  }
};

// Aylık görevleri getir
export const getMonthlyTasks = async (userId?: string): Promise<Task[]> => {
  try {
    // 1. Aktif aylık görev tanımlarını getir
    const taskDefsQuery = query(
      collection(db, TASK_DEFINITIONS_COLLECTION),
      where('category', '==', 'monthly'),
      where('isActive', '==', true)
    );
    
    const taskDefsSnapshot = await getDocs(taskDefsQuery);
    const taskDefinitions = taskDefsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskDefinition[];

    // 2. Kullanıcı görev durumlarını getir (eğer userId verilmişse)
    let userTaskStatuses: { [key: string]: any } = {};
    if (userId) {
      const today = new Date();
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      
      const statusesQuery = query(
        collection(db, 'userTaskStatuses'),
        where('userId', '==', userId),
        where('category', '==', 'monthly'),
        where('date', '>=', Timestamp.fromDate(monthStart)),
        where('date', '<=', Timestamp.fromDate(monthEnd))
      );
      
      const statusesSnapshot = await getDocs(statusesQuery);
      userTaskStatuses = statusesSnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        acc[data.taskDefId] = {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || monthStart,
          completedAt: data.completedAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
        return acc;
      }, {});
    }

    // 3. Görev tanımları ve kullanıcı durumlarını birleştir
    return taskDefinitions.map(taskDef => {
      const userStatus = userTaskStatuses[taskDef.id];
      const today = new Date();
      const monthStart = startOfMonth(today);
      
      return {
        id: userStatus?.id || taskDef.id,
        taskDefId: taskDef.id,
        title: taskDef.title,
        description: taskDef.description || '',
        category: 'monthly',
        isImportant: taskDef.isImportant,
        status: userStatus?.status || 'pending',
        date: userStatus?.date || monthStart,
        createdAt: taskDef.createdAt?.toDate() || new Date(),
        updatedAt: taskDef.updatedAt?.toDate() || new Date(),
        completedAt: userStatus?.completedAt || null,
        reminderTime: userStatus?.reminderTime?.toDate() || null,
        isActive: taskDef.isActive,
        createdBy: taskDef.createdBy || 'admin',
        isAdminOnly: taskDef.isAdminOnly || false
      } as Task;
    });
  } catch (error) {
    console.error('Aylık vazifeler getirme hatası:', error);
    return [];
  }
};

// Seçili tarih için tüm görevleri getir (kullanıcıdan bağımsız)
export const getAllTasksForDate = async (date: Date): Promise<Task[]> => {
  // Tarih parametresi ileride filtre için kullanılabilir, şimdilik tüm görevler döner
  const [daily, weekly, monthly] = await Promise.all([
    getDailyTasks(),
    getWeeklyTasks(),
    getMonthlyTasks()
  ]);
  return [...daily, ...weekly, ...monthly];
};

// Test verisi ekle (5 günlük, 3 haftalık, 2 aylık)
export const addSampleTasks = async (): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();
    
    // Günlük vazifeler
    const dailyTasks = [
      {
        title: 'Sabah Namazı',
        description: 'Sabah namazını cemaatle kılmak',
        category: 'daily',
        isImportant: true,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Kuran-ı Kerim',
        description: 'Günlük en az 1 sayfa Kuran okuma',
        category: 'daily',
        isImportant: true,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Zikir',
        description: 'Sabah ve akşam zikirlerini çekmek',
        category: 'daily',
        isImportant: true,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Hadis Okuma',
        description: 'Günlük en az 1 hadis okuma ve üzerinde tefekkür etme',
        category: 'daily',
        isImportant: false,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Yatsı Namazı',
        description: 'Yatsı namazını cemaatle kılmak',
        category: 'daily',
        isImportant: true,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Haftalık vazifeler
    const weeklyTasks = [
      {
        title: 'Cuma Namazı',
        description: 'Cuma namazına erken gitme ve hutbeyi dinleme',
        category: 'weekly',
        isImportant: true,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Kehf Suresi',
        description: 'Cuma günü Kehf suresini okuma',
        category: 'weekly',
        isImportant: true,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'İlmihal Dersi',
        description: 'Haftalık ilmihal dersine katılma',
        category: 'weekly',
        isImportant: false,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Aylık vazifeler
    const monthlyTasks = [
      {
        title: 'Hatim Programı',
        description: 'Aylık hatim programına katılma',
        category: 'monthly',
        isImportant: true,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Sohbet Programı',
        description: 'Aylık sohbet programına katılma',
        category: 'monthly',
        isImportant: true,
        isActive: true,
        status: 'pending',
        createdBy: 'admin',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Tüm görevleri Firestore'a ekle
    const allTasks = [...dailyTasks, ...weeklyTasks, ...monthlyTasks];
    
    for (const task of allTasks) {
      const docRef = doc(collection(db, TASK_DEFINITIONS_COLLECTION));
      batch.set(docRef, {
        ...task,
        date: Timestamp.fromDate(task.date),
        createdAt: Timestamp.fromDate(task.createdAt),
        updatedAt: Timestamp.fromDate(task.updatedAt)
      });
    }

    await batch.commit();
    console.log('Örnek vazifeler başarıyla eklendi');
    
  } catch (error) {
    console.error('Örnek vazife ekleme hatası:', error);
    throw error;
  }
};

export const fetchTasks = async (selectedDate: Date, viewMode: 'daily' | 'weekly' | 'monthly'): Promise<Task[]> => {
  try {
    // Implement your API call here
    // For now, returning mock data
    return [
      {
        id: '1',
        title: 'Sabah Namazı',
        description: 'Sabah namazını cemaatle kılmak',
        category: 'daily',
        isImportant: true,
        status: 'pending',
        date: format(selectedDate, 'yyyy-MM-dd'),
        reminderTime: null,
      },
      {
        id: '2',
        title: 'Kuran-ı Kerim',
        description: 'Günlük Kuran okuma',
        category: 'daily',
        isImportant: true,
        status: 'completed',
        date: format(selectedDate, 'yyyy-MM-dd'),
        reminderTime: null,
      },
      // Add more mock tasks as needed
    ];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

export const fetchTaskAnalytics = async (): Promise<TaskAnalytics> => {
  try {
    // Implement your API call here
    // For now, returning mock data
    return {
      daily: [
        { date: '2024-03-01', completed: 8, total: 10 },
        { date: '2024-03-02', completed: 7, total: 10 },
        // Add more daily data
      ],
      weekly: [
        { week: 'Hafta 9', completed: 35, total: 50 },
        { week: 'Hafta 10', completed: 40, total: 50 },
        // Add more weekly data
      ],
      monthly: [
        { month: 'Mart', completed: 150, total: 200 },
        { month: 'Nisan', completed: 160, total: 200 },
        // Add more monthly data
      ],
      taskBased: [
        { taskTitle: 'Sabah Namazı', completionRate: 85 },
        { taskTitle: 'Kuran-ı Kerim', completionRate: 90 },
        // Add more task-based data
      ],
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

// Define functions before TaskService export
const getTaskDefinitions = async (category: 'daily' | 'weekly' | 'monthly'): Promise<TaskDefinition[]> => {
  try {
    const taskDefsQuery = query(
      collection(db, 'taskDefinitions'),
      where('category', '==', category),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const taskDefsSnapshot = await getDocs(taskDefsQuery);
    return taskDefsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskDefinition[];
  } catch (error) {
    console.error('Error fetching task definitions:', error);
    throw error;
  }
};

const getTaskStatuses = async (
  userId: string,
  category: 'daily' | 'weekly' | 'monthly',
  date: Date
): Promise<TaskStatus[]> => {
  try {
    let startDate: Date;
    let endDate: Date = date;
    
    if (category === 'daily') {
      startDate = new Date(date);
      startDate.setDate(startDate.getDate() - 1); // Last 2 days
    } else if (category === 'weekly') {
      startDate = new Date(date);
      startDate.setDate(startDate.getDate() - 6); // Current week
    } else {
      startDate = new Date(date.getFullYear(), date.getMonth(), 1); // Current month
    }
    
    const statusesQuery = query(
      collection(db, 'userTaskStatuses'),
      where('userId', '==', userId),
      where('category', '==', category),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    
    const statusesSnapshot = await getDocs(statusesQuery);
    return statusesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskStatus[];
  } catch (error) {
    console.error('Error fetching task statuses:', error);
    throw error;
  }
};

export const updateTaskStatus = async (
  userId: string,
  taskId: string,
  category: string,
  date: Date,
  isCompleted: boolean,
  reminderTime?: Date
): Promise<void> => {
  try {
    const docId = `${userId}_${taskId}`;
    const taskRef = doc(db, 'userTaskStatuses', docId);
    const docSnap = await getDoc(taskRef);

    if (docSnap.exists()) {
      await updateDoc(taskRef, {
        status: isCompleted ? 'completed' : 'pending',
        completedAt: isCompleted ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
        reminderTime: reminderTime ? reminderTime.toISOString() : null
      });
    } else {
      // Eksik alanları doldurmak için taskDefinitions'dan taskDef'i çek
      const taskDefRef = doc(db, 'taskDefinitions', taskId);
      const taskDefSnap = await getDoc(taskDefRef);
      if (!taskDefSnap.exists()) {
        throw new Error('Task definition not found');
      }
      const taskDef = taskDefSnap.data();
      const now = serverTimestamp();
      await setDoc(taskRef, {
        id: docId,
        userId,
        taskDefId: taskId,
        taskId: taskId,
        title: taskDef.title || '',
        description: taskDef.description || '',
        category: taskDef.category || category,
        isImportant: taskDef.isImportant || false,
        status: isCompleted ? 'completed' : 'pending',
        date: date,
        reminderTime: reminderTime ? reminderTime.toISOString() : null,
        completedAt: isCompleted ? now : null,
        createdAt: now,
        updatedAt: now
      });
    }

    // Shadow write for daily analytics snapshots
    try {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      const dateKey = `${normalized.getFullYear()}-${String(normalized.getMonth() + 1).padStart(2, '0')}-${String(normalized.getDate()).padStart(2, '0')}`;
      const compDocId = `${userId}_${taskId}_${dateKey}`;
      const compRef = doc(db, 'userTaskCompletions', compDocId);
      await setDoc(compRef, {
        id: compDocId,
        userId,
        taskDefId: taskId,
        taskId: taskId,
        category,
        date: normalized,
        status: isCompleted ? 'completed' : 'pending',
        completedAt: isCompleted ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error('Shadow completion write failed:', e);
    }
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

const getTasksWithStatus = async (
  userId: string,
  category: 'daily' | 'weekly' | 'monthly',
  date: Date
): Promise<Task[]> => {
  try {
    // Get task definitions
    const taskDefinitions = await getTaskDefinitions(category);
    
    // Get task statuses for the date
    const taskStatusesQuery = query(
      collection(db, 'userTaskStatuses'),
      where('userId', '==', userId),
      where('category', '==', category),
      where('date', '>=', startOfDay(date)),
      where('date', '<=', endOfDay(date))
    );
    
    const taskStatusesSnapshot = await getDocs(taskStatusesQuery);
    const taskStatuses = taskStatusesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Combine task definitions with their statuses
    const tasks = taskDefinitions.map(taskDef => {
      const status = taskStatuses.find(s => s.taskDefId === taskDef.id);
      const completedAt = status?.completedAt ? new Date(status.completedAt) : null;
      
      return {
        id: taskDef.id,
        taskDefId: taskDef.id,
        title: taskDef.title,
        description: taskDef.description || '',
        category: taskDef.category,
        isActive: taskDef.isActive,
        createdAt: taskDef.createdAt,
        updatedAt: taskDef.updatedAt,
        isCompleted: status?.status === 'completed',
        completedAt: completedAt,
        status: status?.status || 'pending',
        date: date,
        isImportant: taskDef.isImportant || false,
        createdBy: taskDef.createdBy || 'system',
        reminderTime: null,
        isAdminOnly: false
      };
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting tasks with status:', error);
    throw error;
  }
};

// Export TaskService after all function definitions
export const TaskService = {
  getTasksWithStatus,
  updateTaskStatus,
  getTaskDefinitions,
  getTaskStatuses,
  getTaskAnalytics,
  setTaskReminder
}; 