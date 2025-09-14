import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Period = 'week' | 'month' | 'year';

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onChange: (period: Period) => void;
  theme: any;
  style?: any;
}

export default function PeriodSelector({ selectedPeriod, onChange, theme, style }: PeriodSelectorProps) {
  return (
    <View style={[styles.periodSelector, style]}> 
      {(['week', 'month', 'year'] as Period[]).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && { backgroundColor: theme.primary },
          ]}
          onPress={() => onChange(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              { color: selectedPeriod === period ? '#FFF' : theme.text },
            ]}
          >
            {period === 'week' ? 'Hafta' : period === 'month' ? 'Ay' : 'Yıl'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  periodSelector: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});


