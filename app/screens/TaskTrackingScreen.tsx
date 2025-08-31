import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import DateSelector from '../../components/DateSelector';
import { TaskItem } from '@/components/TaskItem';
import TaskAnalytics from '../../components/TaskAnalytics';
import { Task, TaskAnalytics as TaskAnalyticsType } from '../types/task.types';
import { 
  getTasksByDate,
  getTaskAnalytics,
  getDailyTasks,
  getWeeklyTasks,
  getMonthlyTasks,
} from '../../services/TaskService';
import { useAuth } from '../../context/AuthContext';
import { BlurView } from 'expo-blur';
import { format, isSameDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';

type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function TaskTrackingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, isAdmin } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<TaskAnalyticsType | null>(null);
  
  useEffect(() => {
    loadTasks();
  }, [selectedDate, viewMode]);

  const loadTasks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let tasksData: Task[] = [];
      
      switch (viewMode) {
        case 'daily':
          // Günlük görevler için seçili günün görevlerini getir
          tasksData = await getDailyTasks(user.uid);
          // Sadece günlük kategorideki ve seçili günün görevlerini filtrele
          tasksData = tasksData.filter(task => 
            task.category === 'daily' && 
            isSameDay(new Date(task.date), selectedDate)
          );
          break;
        case 'weekly':
          // Haftalık görevler için mevcut haftanın görevlerini getir
          tasksData = await getWeeklyTasks(user.uid);
          // Sadece haftalık kategorideki görevleri filtrele
          tasksData = tasksData.filter(task => task.category === 'weekly');
          break;
        case 'monthly':
          // Aylık görevler için mevcut ayın görevlerini getir
          tasksData = await getMonthlyTasks(user.uid);
          // Sadece aylık kategorideki görevleri filtrele
          tasksData = tasksData.filter(task => task.category === 'monthly');
          break;
      }

      // Vazifeleri önem durumuna ve başlığa göre sırala
      tasksData.sort((a, b) => {
        if (a.isImportant && !b.isImportant) return -1;
        if (!a.isImportant && b.isImportant) return 1;
        return a.title.localeCompare(b.title);
      });

      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Hata', 'Vazifeler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAnalytics = async () => {
    try {
      const analyticsData = await getTaskAnalytics();
      setAnalytics(analyticsData);
      setShowAnalytics(true);
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Hata', 'Analiz verileri yüklenirken bir hata oluştu.');
    }
  };

  const isTaskEditable = (taskDate: Date | string) => {
    if (isAdmin) return true;
    
    const today = new Date();
    const yesterday = subDays(today, 1);
    const taskDateObj = typeof taskDate === 'string' ? new Date(taskDate) : taskDate;
    
    return viewMode === 'daily' && (
      isSameDay(taskDateObj, today) || 
      isSameDay(taskDateObj, yesterday)
    );
  };

  const getWeekRange = () => {
    const start = startOfWeek(selectedDate, { locale: tr });
    const end = endOfWeek(selectedDate, { locale: tr });
    return `${format(start, 'd')} - ${format(end, 'd MMMM yyyy', { locale: tr })}`;
  };

  const renderHeader = () => {
    let title = '';
    let subtitle = '';

    switch (viewMode) {
      case 'daily':
        title = 'Günlük Vazifeler';
        subtitle = format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr });
        break;
      case 'weekly':
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Pazartesi başlangıç
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }); // Pazar bitiş
        title = 'Haftalık Vazifeler';
        subtitle = `${format(weekStart, 'd MMMM', { locale: tr })} - ${format(weekEnd, 'd MMMM yyyy', { locale: tr })}`;
        break;
      case 'monthly':
        const monthStart = startOfMonth(new Date());
        title = 'Aylık Vazifeler';
        subtitle = format(monthStart, 'MMMM yyyy', { locale: tr });
        break;
    }

    return (
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.headerSubtitle, { color: theme.textDim }]}>{subtitle}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.analyticsButton, { backgroundColor: theme.primary }]}
          onPress={handleViewAnalytics}
        >
          <Ionicons name="analytics" size={20} color="#FFFFFF" />
          <Text style={styles.analyticsButtonText}>Analiz</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderViewModeSelector = () => (
    <View style={[styles.viewModeSelector, { backgroundColor: theme.surface }]}>
      {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.viewModeButton,
            viewMode === mode && { backgroundColor: theme.primary }
          ]}
          onPress={() => setViewMode(mode)}
        >
          <Text
            style={[
              styles.viewModeText,
              { color: viewMode === mode ? '#FFFFFF' : theme.text }
            ]}
          >
            {mode === 'daily' ? 'Günlük' : mode === 'weekly' ? 'Haftalık' : 'Aylık'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTaskList = () => {
    if (tasks.length === 0 && !isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textDim }]}>
            {viewMode === 'daily' 
              ? 'Bu tarih için vazife bulunmuyor' 
              : viewMode === 'weekly'
              ? 'Bu hafta için vazife bulunmuyor'
              : 'Bu ay için vazife bulunmuyor'}
          </Text>
        </View>
      );
    }

    // Görevleri kategorilerine göre filtrele
    const filteredTasks = tasks.filter(task => {
      switch (viewMode) {
        case 'daily':
          return task.category === 'daily' && isSameDay(new Date(task.date), selectedDate);
        case 'weekly':
          return task.category === 'weekly';
        case 'monthly':
          return task.category === 'monthly';
        default:
          return false;
      }
    });

    return filteredTasks.map((task) => (
      <View
        key={task.id}
        style={[
          styles.taskCard,
          { backgroundColor: theme.surface }
        ]}
      >
        <TaskItem
          task={task}
          userId={user?.uid || ''}
          date={format(new Date(task.date), 'yyyy-MM-dd')}
          onError={(error) => Alert.alert('Hata', error.message)}
          isEditable={isTaskEditable(task.date)}
        />
      </View>
    ));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      {renderViewModeSelector()}
      
      {/* Sadece günlük görünümde tarih seçici göster */}
      {viewMode === 'daily' && (
        <View style={styles.dateSelectorContainer}>
          <DateSelector
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            maxDays={14}
          />
        </View>
      )}

      <ScrollView
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadTasks}
            tintColor={theme.text}
          />
        }
      >
        {renderTaskList()}
      </ScrollView>

      {showAnalytics && (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={Platform.OS === 'ios' ? 20 : 100}
          tint={colorScheme}
        >
          <TaskAnalytics
            analytics={analytics}
            onClose={() => setShowAnalytics(false)}
          />
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  analyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  analyticsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewModeSelector: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  dateSelectorContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
}); 