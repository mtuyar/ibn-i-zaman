import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { Task } from '../app/types/task.types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onToggleStatus: (task: Task) => void;
  onPress: (task: Task) => void;
  isEditable: boolean;
}

export default function TaskCard({ task, onToggleStatus, onPress, isEditable }: TaskCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isCompleted = task.status === 'completed';

  const getCategoryColor = () => {
    switch (task.category) {
      case 'daily':
        return theme.primary;
      case 'weekly':
        return theme.secondary;
      case 'monthly':
        return theme.warning;
      default:
        return theme.primary;
    }
  };

  const getCategoryIcon = () => {
    switch (task.category) {
      case 'daily':
        return 'calendar-today';
      case 'weekly':
        return 'calendar-week';
      case 'monthly':
        return 'calendar-month';
      default:
        return 'calendar';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderLeftColor: getCategoryColor(),
          opacity: isCompleted ? 0.7 : 1,
        },
      ]}
      onPress={() => onPress(task)}
      disabled={!isEditable}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons
              name={getCategoryIcon()}
              size={20}
              color={getCategoryColor()}
              style={styles.categoryIcon}
            />
            <Text
              style={[
                styles.title,
                { color: theme.text },
                isCompleted && styles.completedText,
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
          </View>
          {task.isImportant && (
            <MaterialCommunityIcons
              name="star"
              size={20}
              color={theme.warning}
              style={styles.importantIcon}
            />
          )}
        </View>

        {task.description && (
          <Text
            style={[styles.description, { color: theme.textDim }]}
            numberOfLines={2}
          >
            {task.description}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color={theme.textDim}
            />
            <Text style={[styles.dateText, { color: theme.textDim }]}>
              {format(task.date, 'd MMMM yyyy', { locale: tr })}
            </Text>
          </View>

          {isEditable && (
            <TouchableOpacity
              style={[
                styles.statusButton,
                {
                  backgroundColor: isCompleted
                    ? theme.success + '20'
                    : theme.primary + '20',
                },
              ]}
              onPress={() => onToggleStatus(task)}
            >
              <MaterialCommunityIcons
                name={isCompleted ? 'check-circle' : 'circle-outline'}
                size={20}
                color={isCompleted ? theme.success : theme.primary}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isCompleted ? theme.success : theme.primary,
                  },
                ]}
              >
                {isCompleted ? 'Tamamlandı' : 'Tamamla'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  importantIcon: {
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 