import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createTask } from '../services/TaskService';
import { Task } from '../app/types/task.types';
import * as Haptics from 'expo-haptics';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export default function AddTaskModal({ visible, onClose, userId, onSuccess }: AddTaskModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [isImportant, setIsImportant] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form temizle
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(new Date());
    setIsImportant(false);
    setShowDatePicker(false);
  };
  
  // Modal kapat
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Tarih seçiciyi aç/kapat
  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };
  
  // Tarih değiştir
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };
  
  // Vazife oluştur
  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Vazife başlığı boş olamaz.');
      return;
    }
    
    try {
      setIsLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        assignedTo: userId,
        status: 'pending',
        isImportant
      };
      
      await createTask(newTask);
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Vazife oluşturma hatası:', error);
      Alert.alert('Hata', 'Vazife oluşturulurken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centeredView}
        >
          <BlurView 
            intensity={10} 
            tint={colorScheme === 'dark' ? 'dark' : 'light'} 
            style={styles.blurContainer}
          >
            <TouchableWithoutFeedback>
              <View style={[
                styles.modalView, 
                { backgroundColor: theme.surface }
              ]}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    Yeni Vazife Ekle
                  </Text>
                  <TouchableOpacity onPress={handleClose}>
                    <Ionicons name="close" size={24} color={theme.textDim} />
                  </TouchableOpacity>
                </View>
                
                {/* Form */}
                <View style={styles.form}>
                  {/* Başlık */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Vazife Başlığı *
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { 
                          backgroundColor: colorScheme === 'dark' ? theme.background : '#F5F7F9',
                          color: theme.text,
                          borderColor: theme.border
                        }
                      ]}
                      placeholder="Vazife başlığını girin"
                      placeholderTextColor={theme.placeholder}
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>
                  
                  {/* Açıklama */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Açıklama
                    </Text>
                    <TextInput
                      style={[
                        styles.textArea,
                        { 
                          backgroundColor: colorScheme === 'dark' ? theme.background : '#F5F7F9',
                          color: theme.text,
                          borderColor: theme.border
                        }
                      ]}
                      placeholder="Vazife hakkında notlar ekleyin"
                      placeholderTextColor={theme.placeholder}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                  
                  {/* Tarih Seçici */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Tarih
                    </Text>
                    <TouchableOpacity 
                      style={[
                        styles.dateSelector,
                        { 
                          backgroundColor: colorScheme === 'dark' ? theme.background : '#F5F7F9',
                          borderColor: theme.border
                        }
                      ]}
                      onPress={toggleDatePicker}
                    >
                      <Ionicons name="calendar" size={20} color={theme.primary} />
                      <Text style={[styles.dateText, { color: theme.text }]}>
                        {format(date, 'd MMMM yyyy', { locale: tr })}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={theme.textDim} />
                    </TouchableOpacity>
                    
                    {showDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                      />
                    )}
                  </View>
                  
                  {/* Önemli mi? */}
                  <TouchableOpacity 
                    style={styles.importantToggle}
                    onPress={() => setIsImportant(!isImportant)}
                  >
                    <View style={[
                      styles.checkbox, 
                      isImportant && { backgroundColor: theme.warning, borderColor: theme.warning }
                    ]}>
                      {isImportant && (
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      )}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                      Önemli vazife olarak işaretle
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Butonlar */}
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
                      onPress={handleClose}
                    >
                      <Text style={[styles.buttonText, { color: theme.textDim }]}>
                        İptal
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.button, styles.createButton, { backgroundColor: theme.primary }]}
                      onPress={handleCreateTask}
                      disabled={isLoading || !title.trim()}
                    >
                      {isLoading ? (
                        <Text style={styles.buttonTextWhite}>
                          Ekleniyor...
                        </Text>
                      ) : (
                        <Text style={styles.buttonTextWhite}>
                          Vazife Ekle
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </BlurView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalView: {
    width: '100%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 100,
  },
  dateSelector: {
    height: 46,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  importantToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 8,
    borderWidth: 1,
  },
  createButton: {
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonTextWhite: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
}); 