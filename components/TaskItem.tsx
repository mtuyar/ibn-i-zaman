import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';
import { TaskDefinition, TaskStatus } from '../types/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';
import { useTaskStatus } from '../hooks/useTaskStatus';
import { LinearGradient } from 'expo-linear-gradient';

interface TaskItemProps {
  task: TaskDefinition;
  userId: string;
  date: string;
  onError?: (error: Error) => void;
  isEditable?: boolean;
}

export function TaskItem({ task, userId, date, onError, isEditable = true }: TaskItemProps) {
  const { updateStatus, getTaskStatus, isLoading } = useTaskStatus({ userId, date });
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const status = getTaskStatus(task.id);
  const isCompleted = status === 'completed';
  const isPending = status === 'not_done';

  const handleToggleStatus = async () => {
    if (!user || !isEditable) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newStatus: TaskStatus = isCompleted ? 'not_done' : 'completed';
      await updateStatus(task.id, newStatus);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const getStatusColor = () => {
    if (isCompleted) return '#4CAF50';
    if (!isEditable) return '#9E9E9E';
    return '#1976D2';
  };

  const getStatusIcon = () => {
    if (isCompleted) return 'check-circle';
    if (!isEditable) return 'lock-outline';
    return 'circle-outline';
  };

  const getStatusText = () => {
    if (isCompleted) return 'Tamamlandı';
    if (!isEditable) return 'Düzenlenemez';
    return 'Beklemede';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleToggleStatus}
      disabled={!isEditable || isLoading}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[
          isCompleted 
            ? 'rgba(76, 175, 80, 0.03)' 
            : 'rgba(240, 247, 255, 0.8)',
          isCompleted 
            ? 'rgba(76, 175, 80, 0.01)' 
            : 'rgba(240, 247, 255, 0.6)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[
          styles.content,
          { borderLeftColor: getStatusColor(), borderLeftWidth: 3 }
        ]}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: theme.text }]}>
                {task.title}
              </Text>
              {task.isImportant && (
                <View style={styles.importantBadge}>
                  <MaterialCommunityIcons
                    name="star"
                    size={12}
                    color="#FFC107"
                  />
                </View>
              )}
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color={getStatusColor()} />
            ) : (
              <MaterialCommunityIcons
                name={getStatusIcon()}
                size={24}
                color={getStatusColor()}
              />
            )}
          </View>

          {task.description && (
            <Text style={[styles.description, { color: theme.textDim }]}>
              {task.description}
            </Text>
          )}

          <View style={styles.footer}>
            <View style={styles.metaContainer}>
              {task.category && (
                <View style={styles.categoryContainer}>
                  <MaterialCommunityIcons
                    name={
                      task.category === 'daily'
                        ? 'calendar-today'
                        : task.category === 'weekly'
                        ? 'calendar-week'
                        : 'calendar-month'
                    }
                    size={14}
                    color={theme.textDim}
                    style={styles.categoryIcon}
                  />
                  <Text style={[styles.categoryText, { color: theme.textDim }]}>
                    {task.category === 'daily'
                      ? 'Günlük'
                      : task.category === 'weekly'
                      ? 'Haftalık'
                      : 'Aylık'}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={[
              styles.statusContainer,
              { backgroundColor: isCompleted ? 'rgba(76, 175, 80, 0.1)' : 'rgba(25, 118, 210, 0.1)' }
            ]}>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    borderRadius: 16,
  },
  content: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  importantBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 