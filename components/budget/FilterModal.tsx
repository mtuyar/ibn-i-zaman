import { MaterialCommunityIcons } from '@expo/vector-icons';
import { subDays } from 'date-fns';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Category } from '../../services/BudgetService';

interface Props {
  visible: boolean;
  onClose: () => void;
  filterType: 'all' | 'income' | 'expense';
  setFilterType: (v: 'all' | 'income' | 'expense') => void;
  filterCategory: string | null;
  setFilterCategory: (id: string | null) => void;
  filterDateRange: { start: Date; end: Date };
  setFilterDateRange: (r: { start: Date; end: Date }) => void;
  categories: Category[];
  theme: any;
  colorScheme: any;
  onApply: () => void;
}

export default function FilterModal({ visible, onClose, filterType, setFilterType, filterCategory, setFilterCategory, filterDateRange, setFilterDateRange, categories, theme, colorScheme, onApply }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView style={StyleSheet.absoluteFill} intensity={Platform.OS === 'ios' ? 20 : 100} tint={colorScheme}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}> 
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filtrele</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>İşlem Tipi</Text>
              <View style={styles.filterTypeButtons}>
                {[
                  { id: 'all', label: 'Tümü', icon: 'swap-horizontal' },
                  { id: 'income', label: 'Gelir', icon: 'cash-plus' },
                  { id: 'expense', label: 'Gider', icon: 'cash-minus' },
                ].map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.filterTypeButton, { borderColor: theme.border }, filterType === (type.id as any) && { backgroundColor: theme.primary + '20' }]}
                    onPress={() => setFilterType(type.id as any)}
                  >
                    <MaterialCommunityIcons name={type.icon as any} size={20} color={filterType === (type.id as any) ? theme.primary : theme.textDim} />
                    <Text style={[styles.filterTypeButtonText, { color: filterType === (type.id as any) ? theme.primary : theme.textDim }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Kategori</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <TouchableOpacity
                  style={[styles.categoryButton, { borderColor: theme.border }, !filterCategory && { backgroundColor: theme.primary + '20' }]}
                  onPress={() => setFilterCategory(null)}
                >
                  <Text style={[styles.categoryText, { color: !filterCategory ? theme.primary : theme.textDim }]}>Tümü</Text>
                </TouchableOpacity>
                {categories
                  .filter(cat => filterType === 'all' || cat.type === filterType)
                  .map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categoryButton, { borderColor: theme.border }, filterCategory === category.id && { backgroundColor: category.color + '20' }]}
                      onPress={() => setFilterCategory(category.id)}
                    >
                      <MaterialCommunityIcons name={category.icon as any} size={20} color={filterCategory === category.id ? category.color : theme.textDim} />
                      <Text style={[styles.categoryText, { color: filterCategory === category.id ? category.color : theme.textDim }]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Tarih Aralığı</Text>
              <View style={styles.dateRangeButtons}>
                {[
                  { label: 'Son 7 Gün', days: 7 },
                  { label: 'Son 30 Gün', days: 30 },
                  { label: 'Son 90 Gün', days: 90 },
                ].map(range => (
                  <TouchableOpacity
                    key={range.days}
                    style={[styles.dateRangeButton, { borderColor: theme.border }, filterDateRange.start.getTime() === subDays(new Date(), range.days).getTime() && { backgroundColor: theme.primary + '20' }]}
                    onPress={() => setFilterDateRange({ start: subDays(new Date(), range.days), end: new Date() })}
                  >
                    <Text style={[styles.dateRangeButtonText, { color: filterDateRange.start.getTime() === subDays(new Date(), range.days).getTime() ? theme.primary : theme.textDim }]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={onApply}>
              <Text style={styles.modalButtonText}>Filtreleri Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  filterTypeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  dateRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  dateRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});


