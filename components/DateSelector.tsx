import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { format, isToday, isYesterday, addDays, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface DateSelectorProps {
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  maxDays?: number;
}

export default function DateSelector({ onSelectDate, selectedDate, maxDays = 14 }: DateSelectorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  const [dates] = useState(() => {
    const today = new Date();
    const dateArray = [];
    
    // Add dates in order from oldest to newest (left to right)
    for (let i = maxDays - 1; i >= 0; i--) {
      dateArray.push(subDays(today, i));
    }
    
    // Reverse to get oldest to newest (left to right)
    return dateArray.reverse();
  });

  const handleDateSelect = (date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectDate(date);
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Bugün';
    if (isYesterday(date)) return 'Dün';
    return format(date, 'd MMM', { locale: tr });
  };

  const getDayLabel = (date: Date) => {
    return format(date, 'EEE', { locale: tr });
  };

  // Tarihin düzenlenebilir olup olmadığını kontrol et
  const isDateEditable = (date: Date) => {
    return isToday(date) || isYesterday(date);
  };

  // Tarihin görüntülenebilir olup olmadığını kontrol et (her zaman true)
  const isDateViewable = (date: Date) => {
    return true;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.selectorTitle, { color: theme.textDim }]}>
        Son 14 Gün
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((date, index) => {
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const editable = isDateEditable(date);
          const viewable = isDateViewable(date);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateButton,
                { 
                  backgroundColor: isSelected 
                    ? theme.primary 
                    : editable 
                      ? `${theme.primary}10`
                      : theme.surface,
                  borderColor: isSelected 
                    ? theme.primary 
                    : editable 
                      ? theme.primary
                      : theme.border,
                  borderWidth: 1,
                  opacity: viewable ? 1 : 0.6
                }
              ]}
              onPress={() => viewable && handleDateSelect(date)}
              disabled={!viewable}
            >
              <Text style={[
                styles.dayLabel,
                { color: isSelected ? '#FFFFFF' : theme.textDim }
              ]}>
                {getDayLabel(date)}
              </Text>
              <Text style={[
                styles.dateLabel,
                { 
                  color: isSelected 
                    ? '#FFFFFF' 
                    : editable 
                      ? theme.primary
                      : theme.text,
                  fontWeight: editable ? '700' : '500'
                }
              ]}>
                {getDateLabel(date)}
              </Text>
              {editable && (
                <View style={[
                  styles.editableBadge,
                  { backgroundColor: isSelected ? '#FFFFFF20' : theme.primary }
                ]}>
                  <Ionicons name="pencil" size={10} color={isSelected ? '#FFFFFF' : '#FFFFFF'} />
                </View>
              )}
              {!editable && (
                <View style={[
                  styles.editableBadge,
                  { backgroundColor: theme.textDim }
                ]}>
                  <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  selectorTitle: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
    width: '100%',
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  editableBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 