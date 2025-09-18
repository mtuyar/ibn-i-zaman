import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Category, TransactionType } from '../../services/BudgetService';

interface Props {
  visible: boolean;
  onClose: () => void;
  transactionType: TransactionType;
  setTransactionType: (t: TransactionType) => void;
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  amount: string;
  onAmountChange: (text: string) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  date: Date;
  setDate: (d: Date) => void;
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean) => void;
  onSubmit: () => void;
  theme: any;
  colorScheme: 'light' | 'dark' | string | null | undefined;
}

export default function AddTransactionModal({ visible, onClose, transactionType, setTransactionType, categories, selectedCategory, setSelectedCategory, amount, onAmountChange, description, onDescriptionChange, date, setDate, showDatePicker, setShowDatePicker, onSubmit, theme, colorScheme }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView style={StyleSheet.absoluteFill} intensity={Platform.OS === 'ios' ? 20 : 100} tint={colorScheme as any}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}> 
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Yeni İşlem</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.transactionTypeSelector, { backgroundColor: `${theme.text}10` }]}>
              <TouchableOpacity
                style={[styles.typeButton, transactionType === 'income' && { backgroundColor: theme.success }]}
                onPress={() => {
                  setTransactionType('income');
                  const c = categories.find(c => c.type === 'income');
                  if (c) setSelectedCategory(c.id);
                }}
              >
                <MaterialCommunityIcons name="cash-plus" size={24} color={transactionType === 'income' ? '#FFF' : theme.text} />
                <Text style={[styles.typeButtonText, { color: transactionType === 'income' ? '#FFF' : theme.text }]}>Gelir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, transactionType === 'expense' && { backgroundColor: theme.error }]}
                onPress={() => {
                  setTransactionType('expense');
                  const c = categories.find(c => c.type === 'expense');
                  if (c) setSelectedCategory(c.id);
                }}
              >
                <MaterialCommunityIcons name="cash-minus" size={24} color={transactionType === 'expense' ? '#FFF' : theme.text} />
                <Text style={[styles.typeButtonText, { color: transactionType === 'expense' ? '#FFF' : theme.text }]}>Gider</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Kategori</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories
                  .filter(category => category.type === transactionType)
                  .map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categoryButton, selectedCategory === category.id && { backgroundColor: category.color + '20' }]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <MaterialCommunityIcons name={category.icon as any} size={24} color={selectedCategory === category.id ? category.color : theme.textDim} />
                      <Text style={[styles.categoryText, { color: selectedCategory === category.id ? category.color : theme.textDim }]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Tutar (₺)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={amount}
                onChangeText={onAmountChange}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.textDim}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Açıklama</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={description}
                onChangeText={onDescriptionChange}
                placeholder="İşlem açıklaması"
                placeholderTextColor={theme.textDim}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Tarih</Text>
              <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.background }]} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.dateButtonText, { color: theme.text }]}> 
                  {format(date, 'd MMMM yyyy', { locale: tr })}
                </Text>
                <MaterialCommunityIcons name="calendar" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}

            <TouchableOpacity style={[styles.modalButton, { backgroundColor: transactionType === 'income' ? theme.success : theme.error }]} onPress={onSubmit}>
              <Text style={styles.modalButtonText}>
                {transactionType === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}
              </Text>
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
  transactionTypeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  dateButtonText: {
    fontSize: 16,
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


