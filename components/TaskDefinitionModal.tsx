import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { TaskDefinition, TaskCategory } from '../app/types/task.types';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';

interface TaskDefinitionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (taskDefinition: Omit<TaskDefinition, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: TaskDefinition;
}

export default function TaskDefinitionModal({ 
  visible, 
  onClose, 
  onSave,
  initialData 
}: TaskDefinitionModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('daily');
  const [isImportant, setIsImportant] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal açıldığında veya initialData değiştiğinde formu doldur
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setCategory(initialData.category);
      setIsImportant(initialData.isImportant);
    } else {
      // Yeni vazife için formu temizle
      setTitle('');
      setDescription('');
      setCategory('daily');
      setIsImportant(false);
    }
  }, [initialData, visible]);
  
  // Form doğrulama
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Vazife başlığı boş olamaz.');
      return false;
    }
    return true;
  };
  
  // Kaydet
  const handleSave = async () => {
    if (!validateForm() || !user) return;
    
    try {
      setIsLoading(true);
      await onSave({
        title: title.trim(),
        description: description.trim(),
        category,
        isImportant,
        createdBy: user.uid,
      });
      onClose();
    } catch (error) {
      console.error('Vazife kaydetme hatası:', error);
      Alert.alert('Hata', 'Vazife kaydedilirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Kategori değiştirme
  const handleCategoryChange = (newCategory: TaskCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(newCategory);
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[
          styles.modalContent,
          { backgroundColor: colorScheme === 'dark' ? theme.surface : '#FFFFFF' }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <Text style={[styles.title, { color: theme.text }]}>
              {initialData ? 'Vazife Düzenle' : 'Yeni Vazife'}
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.saveButton,
                { backgroundColor: theme.primary }
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.form}>
            {/* Başlık */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Başlık
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colorScheme === 'dark' ? theme.card : '#F5F5F5',
                    color: theme.text,
                  }
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="Vazife başlığı"
                placeholderTextColor={theme.textDim}
              />
            </View>
            
            {/* Açıklama */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Açıklama
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { 
                    backgroundColor: colorScheme === 'dark' ? theme.card : '#F5F5F5',
                    color: theme.text,
                  }
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Vazife açıklaması (opsiyonel)"
                placeholderTextColor={theme.textDim}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            {/* Kategori */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Kategori
              </Text>
              <View style={[styles.categoryContainer, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    category === 'daily' && { backgroundColor: `${theme.primary}15` }
                  ]}
                  onPress={() => handleCategoryChange('daily')}
                >
                  <Text style={[
                    styles.categoryText,
                    { color: category === 'daily' ? theme.primary : theme.text }
                  ]}>
                    Günlük
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    category === 'weekly' && { backgroundColor: `${theme.primary}15` }
                  ]}
                  onPress={() => handleCategoryChange('weekly')}
                >
                  <Text style={[
                    styles.categoryText,
                    { color: category === 'weekly' ? theme.primary : theme.text }
                  ]}>
                    Haftalık
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    category === 'monthly' && { backgroundColor: `${theme.primary}15` }
                  ]}
                  onPress={() => handleCategoryChange('monthly')}
                >
                  <Text style={[
                    styles.categoryText,
                    { color: category === 'monthly' ? theme.primary : theme.text }
                  ]}>
                    Aylık
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Önemli mi? */}
            <View style={styles.switchContainer}>
              <View style={styles.switchLabel}>
                <Ionicons name="star" size={20} color={theme.warning} />
                <Text style={[styles.switchText, { color: theme.text }]}>
                  Önemli Vazife
                </Text>
              </View>
              <Switch
                value={isImportant}
                onValueChange={setIsImportant}
                trackColor={{ false: theme.border, true: `${theme.warning}50` }}
                thumbColor={isImportant ? theme.warning : theme.textDim}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  form: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
  },
  categoryContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 16,
    marginLeft: 8,
  },
}); 