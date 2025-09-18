import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Header from '../../components/Header';
import { TaskList } from '../../components/TaskList';
import Colors from '../../constants/Colors';
import { TaskCategory } from '../../types/firestore';

const categories: TaskCategory[] = ['daily', 'weekly', 'monthly'];
const categoryLabels: Record<TaskCategory, string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
  monthly: 'Aylık',
};

export default function TasksScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('daily');
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const navigation = useNavigation<any>();

  // Sayfa odaklandığında StatusBar'ı güncelleyelim
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
        StatusBar.setBarStyle(colorScheme === 'dark' ? 'light-content' : 'dark-content');
      }
      return () => {};
    }, [])
  );

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  // Mock analiz verisi
  const mockAnalytics = {
    daily: { total: 10, completed: 7 },
    weekly: { total: 4, completed: 2 },
    monthly: { total: 2, completed: 1 },
    totalCompleted: 45,
    totalTasks: 60,
    bestDay: 'Çarşamba',
    streak: 5,
    last7Days: [2, 3, 1, 4, 0, 5, 2], // Son 7 gün tamamlanan
  };

  const analyticsCards = [
    {
      key: 'daily',
      title: 'Günlük Vazifeler',
      icon: 'sunny',
      colors: ['#FDEB71', '#F8D800'], // soft sarı
      ...mockAnalytics.daily,
    },
    {
      key: 'weekly',
      title: 'Haftalık Vazifeler',
      icon: 'calendar',
      colors: ['#ABDCFF', '#0396FF'], // soft mavi
      ...mockAnalytics.weekly,
    },
    {
      key: 'monthly',
      title: 'Aylık Vazifeler',
      icon: 'moon',
      colors: ['#CE9FFC', '#7367F0'], // soft mor
      ...mockAnalytics.monthly,
    },
  ];

  // Genel başarı oranı
  const overallPercent = mockAnalytics.totalTasks > 0 ? Math.round((mockAnalytics.totalCompleted / mockAnalytics.totalTasks) * 100) : 0;

  // Son 7 gün grafiği için gün isimleri
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Vazifelerim"
        showNotification={true}
        isProfileScreen={false}
        leftButton={
          <TouchableOpacity 
            style={styles.analyticsButton}
            onPress={() => navigation.navigate('analytics' as never)}
          >
            <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
            <Text style={[styles.analyticsButtonText, { color: '#FFFFFF' }]}>Analiz</Text>
          </TouchableOpacity>
        }
        onLeftButtonPress={() => {}}
      />

      <View style={[styles.categoryContainer, { backgroundColor: theme.surface }]}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
              { backgroundColor: selectedCategory === category ? theme.primary : 'transparent' }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
              styles.categoryText,
              { color: selectedCategory === category ? '#fff' : theme.text }
              ]}
            >
              {categoryLabels[category]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TaskList
        date={formattedDate}
        category={selectedCategory}
        onDateChange={handleDateChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  categoryButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  analyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyticsButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
}); 