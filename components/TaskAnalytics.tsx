import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { TaskAnalytics } from '../app/types/task.types';
import Colors from '../constants/Colors';

// Chart bileşenleri için temel yardımcı fonksiyonlar
const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;
const CHART_HEIGHT = 200;
const BAR_WIDTH = 28;

interface TaskAnalyticsComponentProps {
  analytics: TaskAnalytics | null;
  onClose: () => void;
}

type ChartType = 'daily' | 'weekly' | 'monthly' | 'task';

export default function TaskAnalyticsComponent({ analytics, onClose }: TaskAnalyticsComponentProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [selectedChart, setSelectedChart] = useState<ChartType>('daily');
  const [isLoading, setIsLoading] = useState(true);
  
  const hexToRgba = (hex: string, opacity = 1): string => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  const screenWidth = Dimensions.get('window').width;
  
  React.useEffect(() => {
    if (analytics) {
      setIsLoading(false);
    }
  }, [analytics]);

  if (isLoading) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.surface }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.emptyText, { color: theme.text }]}>
          Veriler yükleniyor...
        </Text>
      </View>
    );
  }
  
  if (!analytics) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="analytics-outline" size={48} color={theme.textDim} />
        <Text style={[styles.emptyText, { color: theme.text }]}>
          Henüz analiz verisi bulunmuyor
        </Text>
        <TouchableOpacity 
          style={[styles.refreshButton, { backgroundColor: theme.primary }]}
          onPress={onClose}
        >
          <Ionicons name="arrow-back" size={16} color="#FFF" />
          <Text style={styles.refreshButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: colorScheme === 'dark' ? theme.surface : '#FFFFFF',
    backgroundGradientTo: colorScheme === 'dark' ? theme.surface : '#FFFFFF',
    color: (opacity = 1) => hexToRgba(theme.primary, opacity),
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };
  
  // Prepare daily chart data
  const dailyData = {
    labels: analytics.daily.map(d => format(new Date(d.date), 'd MMM', { locale: tr })) || [],
    datasets: [
      {
        data: analytics.daily.map(d => (d.completed / d.total) * 100) || [],
        color: (opacity = 1) => hexToRgba(theme.primary, opacity),
        strokeWidth: 2,
      },
    ],
  };
  
  // Prepare weekly chart data
  const weeklyData = {
    labels: analytics.weekly.map(w => w.week) || [],
    datasets: [
      {
        data: analytics.weekly.map(w => (w.completed / w.total) * 100) || [],
        color: (opacity = 1) => hexToRgba(theme.primary, opacity),
        strokeWidth: 2,
      },
    ],
  };
  
  // Prepare monthly chart data
  const monthlyData = {
    labels: analytics.monthly.map(m => m.month) || [],
    datasets: [
      {
        data: analytics.monthly.map(m => (m.completed / m.total) * 100) || [],
        color: (opacity = 1) => hexToRgba(theme.primary, opacity),
        strokeWidth: 2,
      },
    ],
  };
  
  // Prepare task-based chart data
  const taskData = analytics?.taskBased.map(task => ({
    name: task.taskTitle,
    completionRate: task.completionRate,
    color: hexToRgba(theme.primary, Math.max(0.25, task.completionRate / 100)),
    legendFontColor: theme.text,
    legendFontSize: 12,
  })) || [];
  
  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onClose}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
          <Text style={[styles.backButtonText, { color: theme.text }]}>
            Vazifelere Dön
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Chart Selector */}
      <View style={[styles.chartSelector, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.chartButton,
            selectedChart === 'daily' && { backgroundColor: `${theme.primary}15` }
          ]}
          onPress={() => setSelectedChart('daily')}
        >
          <Text style={[
            styles.chartButtonText,
            { color: selectedChart === 'daily' ? theme.primary : theme.text }
          ]}>
            Günlük
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.chartButton,
            selectedChart === 'weekly' && { backgroundColor: `${theme.primary}15` }
          ]}
          onPress={() => setSelectedChart('weekly')}
        >
          <Text style={[
            styles.chartButtonText,
            { color: selectedChart === 'weekly' ? theme.primary : theme.text }
          ]}>
            Haftalık
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.chartButton,
            selectedChart === 'monthly' && { backgroundColor: `${theme.primary}15` }
          ]}
          onPress={() => setSelectedChart('monthly')}
        >
          <Text style={[
            styles.chartButtonText,
            { color: selectedChart === 'monthly' ? theme.primary : theme.text }
          ]}>
            Aylık
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.chartButton,
            selectedChart === 'task' && { backgroundColor: `${theme.primary}15` }
          ]}
          onPress={() => setSelectedChart('task')}
        >
          <Text style={[
            styles.chartButtonText,
            { color: selectedChart === 'task' ? theme.primary : theme.text }
          ]}>
            Vazife Bazlı
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Chart */}
      <View style={[styles.chartContainer, { backgroundColor: theme.card }]}>
        {selectedChart === 'daily' && (
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Günlük Tamamlanma Oranı
            </Text>
            <LineChart
              data={dailyData}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        )}
        
        {selectedChart === 'weekly' && (
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Haftalık Tamamlanma Oranı
            </Text>
            <BarChart
              data={weeklyData}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix="%"
              fromZero
            />
          </View>
        )}
        
        {selectedChart === 'monthly' && (
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Aylık Tamamlanma Oranı
            </Text>
            <BarChart
              data={monthlyData}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix="%"
              fromZero
            />
          </View>
        )}
        
        {selectedChart === 'task' && (
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Vazife Bazlı Tamamlanma Oranı
            </Text>
            <PieChart
              data={taskData}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              accessor="completionRate"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </View>
        )}
      </View>
      
      {/* İstatistik Kartı */}
      <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.statsTitle, { color: theme.text }]}>
          Genel Tamamlanma Oranı
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBackground, { backgroundColor: `${theme.textDim}15` }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${analytics.completionRate}%`,
                }
              ]}
            >
              <LinearGradient
                colors={[theme.primary, theme.accent]}
                style={styles.progressGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
          
          <Text style={[styles.progressText, { color: theme.text }]}>
            %{analytics.completionRate.toFixed(0)}
          </Text>
        </View>
        
        <Text style={[styles.statsSummary, { color: theme.textDim }]}>
          Toplam {analytics.totalTasks} vazifeden {analytics.completedTasks} tanesi tamamlandı.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    margin: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    margin: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  chartSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  chartButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  chartButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartContainer: {
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBackground: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 6,
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  statsSummary: {
    fontSize: 14,
  },
}); 