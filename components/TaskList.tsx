import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Switch,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { TaskItem } from './TaskItem';
import { TaskDefinition, TaskCategory } from '../types/firestore';
import { Task } from '../app/types/task.types';
import { getDailyTasks, getWeeklyTasks, getMonthlyTasks } from '../services/TaskService';
import { useAuth } from '../context/AuthContext';
import { format, subDays, isToday, isYesterday, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '../services/NotificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DATE_ITEM_WIDTH = 65;

interface TaskListProps {
  category?: TaskCategory;
  onError?: (error: Error) => void;
  date?: string;
  onDateChange?: (date: Date) => void;
}

interface NotificationSettings {
  enabled: boolean;
  time: Date;
}

export function TaskList({ category, onError, date, onDateChange }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: false,
    time: new Date(),
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Sadece günlük görevler için tarih listesi oluştur
  const dates = useMemo(() => {
    if (category !== 'daily') return [];
    
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - i); // Geriye doğru tarihler oluştur
      return date;
    });
  }, [category]);

  // Bildirim ayarlarını yükle
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  // Bildirim izinlerini kontrol et ve handler'ı ayarla
  useEffect(() => {
    setupNotifications();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setNotificationSettings({
          ...parsedSettings,
          time: new Date(parsedSettings.time),
        });
      }
    } catch (error) {
      console.error('Bildirim ayarları yüklenirken hata:', error);
    }
  };

  const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  };

  const scheduleNotification = async (time: Date) => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (!notificationSettings.enabled) return;

      // Use shared NotificationService to schedule cross-platform
      await NotificationService.scheduleDailyReminder(time.getHours(), time.getMinutes());

      await AsyncStorage.setItem('notificationSettings', JSON.stringify({
        enabled: notificationSettings.enabled,
        time: time.toISOString(),
      }));
    } catch (error) {
      console.error('Bildirim ayarlanırken hata:', error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSettings = { ...notificationSettings, enabled: value };
    setNotificationSettings(newSettings);
    
    if (value) {
      await scheduleNotification(notificationSettings.time);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const handleTimeChange = async (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (Platform.OS === 'android') {
      if (event?.type !== 'set' || !selectedTime) return;
    }
    if (selectedTime) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newSettings = { ...notificationSettings, time: selectedTime };
      setNotificationSettings(newSettings);
      if (notificationSettings.enabled) {
        await scheduleNotification(selectedTime);
      }
    }
  };

  const loadTasks = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      let fetchedTasks: Task[] = [];

      switch (category) {
        case 'daily':
          fetchedTasks = await getDailyTasks(user.uid, selectedDate);
          break;
        case 'weekly':
          fetchedTasks = await getWeeklyTasks(user.uid);
          break;
        case 'monthly':
          fetchedTasks = await getMonthlyTasks(user.uid);
          break;
      }

      // Görevleri önem durumuna ve başlığa göre sırala
      fetchedTasks.sort((a, b) => {
        if (a.isImportant && !b.isImportant) return -1;
        if (!a.isImportant && b.isImportant) return 1;
        return a.title.localeCompare(b.title);
      });

      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, category, selectedDate, onError]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const isDateEditable = (date: Date) => {
    // Haftalık ve aylık görünümlerde tüm görevler düzenlenebilir
    if (category === 'weekly' || category === 'monthly') return true;
    
    // Günlük görünümde sadece bugün ve dün düzenlenebilir
    return isToday(date) || isYesterday(date);
  };

  const renderDateItem = ({ item: date, index }: { item: Date; index: number }) => {
    const isSelected = isSameDay(date, selectedDate);
    const isToday = isSameDay(date, new Date());
    const isYesterday = isSameDay(date, subDays(new Date(), 1));
    const isEditable = isDateEditable(date);

    return (
      <TouchableOpacity
        style={[
          styles.dateItemContainer,
          !isEditable && styles.readonlyItem
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedDate(date);
          onDateChange?.(date);
        }}
      >
        <View style={[
          styles.dateItem,
          isSelected && styles.dateItemSelected,
        ]}>
          <View style={[
            styles.dateCircle,
            isSelected && styles.dateCircleSelected,
            isToday && styles.todayCircle,
            isYesterday && styles.yesterdayCircle,
            !isEditable && styles.readonlyCircle,
            isSelected && !isEditable && styles.readonlySelectedCircle,
          ]}>
            <Text style={[
              styles.dateNumber,
              isSelected && styles.dateNumberSelected,
              isToday && styles.todayNumber,
              isYesterday && styles.yesterdayNumber,
              !isEditable && styles.readonlyNumber,
              isSelected && !isEditable && styles.readonlySelectedNumber,
            ]}>
              {format(date, 'd')}
            </Text>
            {isSelected && (
              <View style={[
                styles.selectedDot,
                !isEditable && styles.readonlySelectedDot
              ]} />
            )}
          </View>
          {!isEditable && (
            <View style={[
              styles.lockIcon,
              isSelected && styles.lockIconSelected
            ]}>
              <MaterialCommunityIcons
                name="lock"
                size={12}
                color={isSelected ? '#1976D2' : '#9E9E9E'}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Kategori ve Bildirim Başlığı */}
      <View style={[styles.headerContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.categoryContainer}>
          <Text style={[styles.categoryTitle, { color: theme.text }]}>
            {category === 'daily' ? 'Günlük Görevler' : 
             category === 'weekly' ? 'Haftalık Görevler' : 
             'Aylık Görevler'}
          </Text>
          {notificationSettings.enabled && (
            <TouchableOpacity
              style={[styles.notificationBadge, { backgroundColor: theme.primary + '15' }]}
              onPress={() => setShowNotificationModal(true)}
            >
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={14}
                color={theme.primary}
                style={styles.notificationInfoIcon}
              />
              <Text style={[styles.notificationTime, { color: theme.primary }]}>
                {format(notificationSettings.time, 'HH:mm', { locale: tr })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.notificationButton, notificationSettings.enabled && styles.notificationButtonActive]}
          onPress={() => setShowNotificationModal(true)}
        >
          <MaterialCommunityIcons
            name={notificationSettings.enabled ? "bell-ring" : "bell-outline"}
            size={20}
            color={notificationSettings.enabled ? theme.primary : theme.textDim}
          />
        </TouchableOpacity>
      </View>

      {/* Tarih Seçici - Sadece günlük görünümde göster */}
      {category === 'daily' && (
        <View style={styles.dateSelector}>
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScrollContent}
            decelerationRate="fast"
            snapToInterval={DATE_ITEM_WIDTH}
            snapToAlignment="center"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          >
            {dates.map((date, index) => (
              <View key={index}>
                {renderDateItem({ item: date, index })}
              </View>
            ))}
          </Animated.ScrollView>
        </View>
      )}

      {/* Seçili Tarih Bilgisi - Sadece günlük görünümde göster */}
      {category === 'daily' && (
        <View style={[styles.dateInfoContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.dateInfoContent}>
            <View style={styles.dateInfoLeft}>
              <View style={styles.dateHeaderContainer}>
                {isToday(selectedDate) && (
                  <View style={[styles.todayBadge, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.todayBadgeText, { color: theme.primary }]}>
                      Bugün
                    </Text>
                  </View>
                )}
                <Text style={[styles.dateText, { color: theme.text }]}>
                  {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Task List */}
      <FlatList
        data={tasks}
        renderItem={({ item: task }) => (
          <View style={styles.taskCard}>
            <TaskItem
              task={task}
              userId={user?.uid || ''}
              date={format(new Date(task.date), 'yyyy-MM-dd')}
              onError={onError}
              isEditable={isDateEditable(new Date(task.date))}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.taskList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadTasks}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="calendar-check"
                size={48}
                color={theme.textDim}
              />
              <Text style={[styles.emptyText, { color: theme.textDim }]}>
                {category === 'daily' 
                  ? 'Bu tarih için görev bulunmuyor'
                  : category === 'weekly'
                  ? 'Bu hafta için görev bulunmuyor'
                  : 'Bu ay için görev bulunmuyor'}
              </Text>
            </View>
          )
        }
      />

      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNotificationModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                  <View style={styles.modalTitleContainer}>
                    <MaterialCommunityIcons
                      name="bell-ring-outline"
                      size={24}
                      color={theme.primary}
                      style={styles.modalTitleIcon}
                    />
                    <Text style={[styles.modalTitle, { color: theme.text }]}>
                      Günlük Hatırlatıcı
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowNotificationModal(false)}
                    style={[styles.closeButton, { backgroundColor: theme.background }]}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={18}
                      color={theme.textDim}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={[styles.notificationSetting, { backgroundColor: theme.background, borderRadius: 12 }]}>
                    <View style={styles.settingInfo}>
                      <View style={[styles.settingIconContainer, { backgroundColor: theme.primary + '15' }]}>
                        <MaterialCommunityIcons
                          name="bell-outline"
                          size={20}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.settingTextContainer}>
                        <Text style={[styles.settingTitle, { color: theme.text }]}>
                          Günlük Hatırlatma
                        </Text>
                        <Text style={[styles.settingDescription, { color: theme.textDim }]}>
                          Her gün seçtiğiniz saatte vazifelerinizi hatırlatır
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={notificationSettings.enabled}
                      onValueChange={handleNotificationToggle}
                      trackColor={{ false: '#E0E0E0', true: theme.primary + '40' }}
                      thumbColor={notificationSettings.enabled ? theme.primary : '#FFFFFF'}
                      ios_backgroundColor="#E0E0E0"
                    />
                  </View>

                  {notificationSettings.enabled && (
                    <>
                      <TouchableOpacity
                        style={[styles.timeSetting, { 
                          backgroundColor: theme.background,
                          borderRadius: 12,
                          marginTop: 12
                        }]}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <View style={styles.settingInfo}>
                          <View style={[styles.settingIconContainer, { backgroundColor: theme.primary + '15' }]}>
                            <MaterialCommunityIcons
                              name="clock-outline"
                              size={20}
                              color={theme.primary}
                            />
                          </View>
                          <View style={styles.settingTextContainer}>
                            <Text style={[styles.settingTitle, { color: theme.text }]}>
                              Bildirim Saati
                            </Text>
                            <Text style={[styles.timeText, { color: theme.primary }]}>
                              {format(notificationSettings.time, 'HH:mm', { locale: tr })}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.timeChevronContainer, { backgroundColor: theme.primary + '10' }]}>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={20}
                            color={theme.primary}
                          />
                        </View>
                      </TouchableOpacity>

                      {showTimePicker && (
                        <View style={[styles.timePickerContainer, { 
                          backgroundColor: theme.background,
                          borderRadius: 12,
                          marginTop: 12
                        }]}>
                          <DateTimePicker
                            value={notificationSettings.time}
                            mode="time"
                            is24Hour={true}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleTimeChange}
                            style={styles.timePicker}
                            textColor={theme.text}
                          />
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {showTimePicker && (
        <DateTimePicker
          value={notificationSettings.time}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          style={styles.timePicker}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 12,
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notificationInfoIcon: {
    marginRight: 4,
  },
  notificationTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  notificationButtonActive: {
    backgroundColor: 'rgba(25, 118, 210, 0.15)',
  },
  dateSelector: {
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  dateScrollContent: {
    paddingHorizontal: 20,
  },
  dateItemContainer: {
    width: DATE_ITEM_WIDTH,
    paddingHorizontal: 2,
  },
  dateItem: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
  },
  dateItemSelected: {
    backgroundColor: 'transparent',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    color: '#757575',
    letterSpacing: 0.5,
    paddingRight: 16,
  },
  dayNameSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  todayText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  yesterdayText: {
    color: '#424242',
    fontWeight: '500',
  },
  dateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  dateCircleSelected: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  todayCircle: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
    borderWidth: 1.5,
  },
  yesterdayCircle: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    borderWidth: 1.5,
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  dateNumberSelected: {
    color: '#FFFFFF',
  },
  todayNumber: {
    color: '#1976D2',
  },
  yesterdayNumber: {
    color: '#424242',
  },
  selectedDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  lockIcon: {
    position: 'absolute',
    top: 0,
    right: -4,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
    padding: 2,
    zIndex: 1,
  },
  taskList: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  todayItem: {
    backgroundColor: 'transparent',
  },
  yesterdayItem: {
    backgroundColor: 'transparent',
  },
  todaySelectedCircle: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  yesterdaySelectedCircle: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  todaySelectedNumber: {
    color: '#FFFFFF',
  },
  yesterdaySelectedNumber: {
    color: '#FFFFFF',
  },
  todaySelectedDot: {
    backgroundColor: '#FFFFFF',
  },
  yesterdaySelectedDot: {
    backgroundColor: '#FFFFFF',
  },
  readonlyItem: {
    opacity: 0.9,
  },
  readonlyText: {
    color: '#9E9E9E',
  },
  readonlyCircle: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    borderWidth: 1.5,
  },
  readonlySelectedCircle: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  readonlyNumber: {
    color: '#9E9E9E',
  },
  readonlySelectedNumber: {
    color: '#FFFFFF',
  },
  readonlySelectedDot: {
    backgroundColor: '#FFFFFF',
  },
  lockIconSelected: {
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  dateInfoContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
  },
  dateInfoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfoLeft: {
    flex: 1,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleIcon: {
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  notificationSetting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  timeSetting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  timeChevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  timePickerContainer: {
    padding: 16,
    alignItems: 'center',
  },
  timePicker: {
    width: Platform.OS === 'ios' ? '100%' : 200,
    height: Platform.OS === 'ios' ? 200 : 50,
  },
  taskCard: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
}); 