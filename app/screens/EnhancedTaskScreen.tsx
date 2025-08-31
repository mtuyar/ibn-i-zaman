import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { format, isToday, isYesterday, isSameDay, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

// Components
import DateSelector from '../../components/DateSelector';
import { TaskItem } from '../../components/TaskItem';
import EnhancedTaskAnalytics from '../../components/EnhancedTaskAnalytics';
import NotificationSettings from '../../components/NotificationSettings';
import Header from '../../components/Header';

// Services
import { TaskService } from '../../services/TaskService';

// Types
import { Task, TaskAnalytics as TaskAnalyticsType } from '../types/task.types';

// Extended analytics type
interface EnhancedAnalyticsType extends TaskAnalyticsType {
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
}

// Theme
import Colors from '../../constants/Colors';

// Context
import { useAuth } from '../../context/AuthContext';

type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function EnhancedTaskScreen() {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, isAdmin } = useAuth();
  
  // States
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<EnhancedAnalyticsType | null>(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  
  // Load tasks when user, view mode or selected date changes
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, selectedDate, viewMode]);

  // Her uygulama açılışında ve yenilemede güncel veri çek
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, []);

  // Filter tasks based on date and view mode
  useEffect(() => {
    filterTasksForView();
  }, [tasks, selectedDate, viewMode]);

  const filterTasksForView = useCallback(() => {
    let filtered: Task[] = [];

    switch (viewMode) {
      case 'daily':
        filtered = tasks.filter(task => 
          task.category === 'daily' && 
          isSameDay(new Date(task.date), selectedDate)
        );
        break;
      case 'weekly':
        filtered = tasks.filter(task => task.category === 'weekly');
        break;
      case 'monthly':
        filtered = tasks.filter(task => task.category === 'monthly');
        break;
    }

    filtered.sort((a, b) => {
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      return a.title.localeCompare(b.title);
    });

    setFilteredTasks(filtered);
  }, [tasks, selectedDate, viewMode]);

  const loadTasks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Her zaman Firestore'dan güncel veri çek
      const tasks = await TaskService.getTasksWithStatus(
        user.uid,
        viewMode,
        selectedDate
      );
      setTasks(tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, []);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleNotificationPress = () => {
    setShowNotificationSettings(true);
  };

  const handleViewAnalytics = async () => {
    try {
      setIsLoading(true);
      const analyticsData = await TaskService.getTaskAnalytics();
      
      const totalTasks = analyticsData.daily.reduce((sum, day) => sum + day.total, 0);
      const completedTasks = analyticsData.daily.reduce((sum, day) => sum + day.completed, 0);
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      const enhancedAnalytics: EnhancedAnalyticsType = {
        ...analyticsData,
        completionRate,
        totalTasks,
        completedTasks
      };
      
      setAnalytics(enhancedAnalytics);
      setShowAnalytics(true);
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Hata', 'Analiz verileri yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Statü güncellendiğinde tekrar veri çek
  const handleToggleTaskStatus = async (taskId: string) => {
    if (!user) return;
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      await TaskService.updateTaskStatus(
        user.uid,
        taskId,
        task.category,
        selectedDate,
        task.status !== 'completed'
      );
      await loadTasks(); // Statü güncellendikten sonra tekrar çek
    } catch (error) {
      console.error('Error toggling task status:', error);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  // Function to check if a task is editable
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

  const renderHeader = () => {
    let title = '';
    switch (viewMode) {
      case 'daily':
        title = 'Günlük Vazifeler';
        break;
      case 'weekly':
        title = 'Haftalık Vazifeler';
        break;
      case 'monthly':
        title = 'Aylık Vazifeler';
        break;
    }

    return (
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.primary + '15' }]}
            onPress={handleNotificationPress}
          >
            <Ionicons name="notifications" size={18} color={theme.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleViewAnalytics}
          >
            <Ionicons name="analytics" size={18} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
              Analiz
            </Text>
          </TouchableOpacity>
        </View>
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
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode(mode);
          }}
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

  const renderSelectedDateHeader = () => {
    if (viewMode !== 'daily') return null;
    
    return (
      <View style={[styles.selectedDateHeader, { backgroundColor: theme.primary + '10' }]}>
        <Ionicons name="calendar" size={18} color={theme.primary} />
        <Text style={[styles.selectedDateText, { color: theme.primary }]}>
          {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="checkmark-done-circle-outline" 
        size={64} 
        color={theme.textDim} 
      />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Vazife Bulunamadı
      </Text>
      <Text style={[styles.emptyText, { color: theme.textDim }]}>
        {viewMode === 'daily' 
          ? 'Bu tarih için vazife bulunmuyor' 
          : viewMode === 'weekly'
          ? 'Haftalık vazife bulunmuyor'
          : 'Aylık vazife bulunmuyor'}
      </Text>
    </View>
  );

  const renderTaskList = () => {
    if (filteredTasks.length === 0 && !isLoading) {
      return renderEmptyState();
    }

    return filteredTasks.map((task) => (
      <View
        key={task.id}
        style={[
          styles.taskCard,
          { 
            backgroundColor: theme.surface,
            shadowColor: theme.text
          }
        ]}
      >
        <TaskItem
          task={task}
          isEditable={isTaskEditable(task.date)}
          onUpdate={loadTasks}
          isAdmin={isAdmin}
          onToggleStatus={handleToggleTaskStatus}
        />
      </View>
    ));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Vazifeler"
        showNotification={true}
        onNotificationPress={handleNotificationPress}
        isProfileScreen={false}
      />
      <ScrollView
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderViewModeSelector()}
        {viewMode === 'daily' && (
          <>
            <DateSelector
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
              maxDays={14}
            />
            {renderSelectedDateHeader()}
          </>
        )}
        {renderTaskList()}
      </ScrollView>

      {showNotificationSettings && (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={Platform.OS === 'ios' ? 20 : 100}
          tint={colorScheme}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Bildirim Ayarları
                </Text>
                <TouchableOpacity
                  onPress={() => setShowNotificationSettings(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <NotificationSettings />
            </View>
          </View>
        </BlurView>
      )}

      {showAnalytics && (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={Platform.OS === 'ios' ? 20 : 100}
          tint={colorScheme}
        >
          <EnhancedTaskAnalytics
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
    paddingVertical: 12,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewModeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
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
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedDateText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    padding: 16,
    gap: 8,
    paddingBottom: 100,
  },
  taskCard: {
    borderRadius: 16,
    marginBottom: 8,
    elevation: 2,
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
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
}); 