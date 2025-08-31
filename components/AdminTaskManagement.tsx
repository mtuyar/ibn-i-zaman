import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Picker } from '@react-native-picker/picker';

// Types
import { TaskDefinition, TaskCategory } from '../app/types/task.types';

// Services
import { 
  getAllTaskDefinitions, 
  createTaskDefinition, 
  updateTaskDefinition, 
  deleteTaskDefinition,
  toggleTaskDefinitionStatus 
} from '../services/TaskService';

// Theme
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';

interface AdminTaskManagementProps {
  onClose: () => void;
  isAdmin: boolean;
}

type CategoryFilter = TaskCategory | 'all';

export default function AdminTaskManagement({ onClose, isAdmin }: AdminTaskManagementProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  // States
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null);
  
  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('daily');
  const [isImportant, setIsImportant] = useState(false);
  
  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);
  
  // Function to load all task definitions
  const loadTasks = async () => {
    setLoading(true);
    try {
      const result = await getAllTaskDefinitions();
      setTasks(result.tasks);
    } catch (error) {
      console.error('Error loading task definitions:', error);
      Alert.alert('Hata', 'Vazife tanımları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle opening add/edit modal
  const handleOpenModal = (task?: TaskDefinition) => {
    if (!isAdmin) {
      Alert.alert('Yetkisiz Erişim', 'Vazife tanımlarını sadece yöneticiler düzenleyebilir.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (task) {
      // Edit existing task
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskDescription(task.description || '');
      setTaskCategory(task.category);
      setIsImportant(task.isImportant);
    } else {
      // Add new task
      setEditingTask(null);
      setTaskTitle('');
      setTaskDescription('');
      setTaskCategory('daily');
      setIsImportant(false);
    }
    
    setModalVisible(true);
  };
  
  // Function to handle saving a task
  const handleSaveTask = async () => {
    if (!isAdmin) {
      Alert.alert('Yetkisiz Erişim', 'Vazife tanımlarını sadece yöneticiler düzenleyebilir.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!taskTitle.trim()) {
      Alert.alert('Hata', 'Vazife başlığı boş olamaz.');
      return;
    }
    
    try {
      if (editingTask) {
        // Update existing task
        await updateTaskDefinition(editingTask.id, {
          title: taskTitle,
          description: taskDescription,
          category: taskCategory,
          isImportant: isImportant,
        });
        
        Alert.alert('Başarılı', 'Vazife tanımı güncellendi.');
      } else {
        // Create new task
        await createTaskDefinition({
          title: taskTitle,
          description: taskDescription,
          category: taskCategory,
          isImportant: isImportant,
          createdBy: 'admin', // Assuming admin is creating
          date: new Date(),
          isActive: true,
        });
        
        Alert.alert('Başarılı', 'Yeni vazife tanımı oluşturuldu.');
      }
      
      // Reload tasks and close modal
      setModalVisible(false);
      loadTasks();
    } catch (error) {
      console.error('Error saving task definition:', error);
      Alert.alert('Hata', 'Vazife tanımı kaydedilirken bir hata oluştu.');
    }
  };
  
  // Function to handle deleting a task
  const handleDeleteTask = async (taskId: string) => {
    if (!isAdmin) {
      Alert.alert('Yetkisiz Erişim', 'Vazife tanımlarını sadece yöneticiler silebilir.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Vazife Tanımını Sil',
      'Bu vazife tanımını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTaskDefinition(taskId);
              Alert.alert('Başarılı', 'Vazife tanımı silindi.');
              loadTasks();
            } catch (error) {
              console.error('Error deleting task definition:', error);
              Alert.alert('Hata', 'Vazife tanımı silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };
  
  // Function to toggle task status (active/inactive)
  const handleToggleTaskStatus = async (taskId: string, isActive: boolean) => {
    if (!isAdmin) {
      Alert.alert('Yetkisiz Erişim', 'Vazife durumunu sadece yöneticiler değiştirebilir.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await toggleTaskDefinitionStatus(taskId, !isActive);
      loadTasks();
    } catch (error) {
      console.error('Error toggling task status:', error);
      Alert.alert('Hata', 'Vazife durumu değiştirilirken bir hata oluştu.');
    }
  };
  
  // Render the task form modal
  const renderTaskFormModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingTask ? 'Vazife Düzenle' : 'Yeni Vazife Ekle'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Başlık</Text>
            <TextInput
              style={[
                styles.textInput,
                { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border 
                }
              ]}
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="Vazife başlığı"
              placeholderTextColor={theme.textDim}
            />
            
            <Text style={[styles.inputLabel, { color: theme.text }]}>Açıklama</Text>
            <TextInput
              style={[
                styles.textArea,
                { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border 
                }
              ]}
              value={taskDescription}
              onChangeText={setTaskDescription}
              placeholder="Vazife açıklaması (isteğe bağlı)"
              placeholderTextColor={theme.textDim}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <Text style={[styles.inputLabel, { color: theme.text }]}>Kategori</Text>
            <View style={[
              styles.pickerContainer,
              { 
                backgroundColor: theme.background,
                borderColor: theme.border 
              }
            ]}>
              <Picker
                selectedValue={taskCategory}
                onValueChange={(value) => setTaskCategory(value as TaskCategory)}
                style={{ color: theme.text }}
                dropdownIconColor={theme.text}
              >
                <Picker.Item label="Günlük" value="daily" />
                <Picker.Item label="Haftalık" value="weekly" />
                <Picker.Item label="Aylık" value="monthly" />
              </Picker>
            </View>
            
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>
                Önemli Vazife
              </Text>
              <Switch
                value={isImportant}
                onValueChange={setIsImportant}
                trackColor={{ false: theme.border, true: `${theme.primary}80` }}
                thumbColor={isImportant ? theme.primary : theme.textDim}
              />
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                İptal
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSaveTask}
            >
              <Text style={styles.saveButtonText}>
                {editingTask ? 'Güncelle' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Render category filter tabs
  const renderCategoryTabs = () => (
    <View style={[styles.categoryTabs, { backgroundColor: theme.surface }]}>
      {(['all', 'daily', 'weekly', 'monthly'] as CategoryFilter[]).map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryTab,
            selectedCategory === category && { backgroundColor: theme.primary }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedCategory(category);
          }}
        >
          <Text style={[
            styles.categoryTabText,
            { color: selectedCategory === category ? '#FFFFFF' : theme.text }
          ]}>
            {category === 'daily' ? 'Günlük' : 
             category === 'weekly' ? 'Haftalık' : 
             category === 'monthly' ? 'Aylık' : 
             'Tümü'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  
  // Filter tasks based on selected category
  const filteredTasks = selectedCategory === 'all' 
    ? tasks 
    : tasks.filter(task => task.category === selectedCategory);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onClose}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
          <Text style={[styles.backButtonText, { color: theme.text }]}>
            Geri
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Vazife Yönetimi
        </Text>
        
        {isAdmin && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => handleOpenModal()}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        {!isAdmin && <View style={{ width: 40 }} />}
      </View>
      
      {/* Category Tabs */}
      {renderCategoryTabs()}
      
      {/* Task List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Vazife tanımları yükleniyor...
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.taskList}>
          {!isAdmin && (
            <View style={[styles.noticeCard, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="information-circle" size={24} color={theme.primary} />
              <Text style={[styles.noticeText, { color: theme.text }]}>
                Görevlerin düzenlenmesi, eklenmesi veya silinmesi sadece yöneticiler tarafından yapılabilir.
              </Text>
            </View>
          )}
          
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={48} color={theme.textDim} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                Bu kategoride vazife tanımı bulunmuyor
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleOpenModal()}
                >
                  <Text style={styles.emptyButtonText}>Yeni Vazife Ekle</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredTasks.map((task) => (
              <View 
                key={task.id} 
                style={[
                  styles.taskItem,
                  { 
                    backgroundColor: theme.surface,
                    opacity: task.isActive ? 1 : 0.6,
                    borderLeftColor: task.category === 'daily' 
                      ? '#4299E1' 
                      : task.category === 'weekly' 
                        ? '#38B2AC' 
                        : '#9F7AEA',
                    borderLeftWidth: 4
                  }
                ]}
              >
                <View style={styles.taskHeader}>
                  <View style={styles.taskTitleContainer}>
                    <Text style={[styles.taskTitle, { color: theme.text }]}>
                      {task.title}
                    </Text>
                    {task.isImportant && (
                      <View style={[styles.importantBadge, { backgroundColor: theme.warning }]}>
                        <Text style={styles.importantBadgeText}>Önemli</Text>
                      </View>
                    )}
                  </View>
                  
                  {isAdmin ? (
                    <Switch
                      value={task.isActive}
                      onValueChange={() => handleToggleTaskStatus(task.id, task.isActive)}
                      trackColor={{ false: theme.border, true: `${theme.primary}80` }}
                      thumbColor={task.isActive ? theme.primary : theme.textDim}
                    />
                  ) : (
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: task.isActive ? '#4ADE80' : '#A1A1AA' }
                    ]}>
                      <Text style={styles.statusText}>
                        {task.isActive ? 'Aktif' : 'Pasif'}
                      </Text>
                    </View>
                  )}
                </View>
                
                {task.description && (
                  <Text style={[styles.taskDescription, { color: theme.textDim }]}>
                    {task.description}
                  </Text>
                )}
                
                <View style={styles.taskFooter}>
                  <View style={[
                    styles.categoryBadge, 
                    { 
                      backgroundColor: task.category === 'daily' 
                        ? '#4299E120' 
                        : task.category === 'weekly' 
                          ? '#38B2AC20' 
                          : '#9F7AEA20' 
                    }
                  ]}>
                    <Text style={[
                      styles.categoryBadgeText, 
                      { 
                        color: task.category === 'daily' 
                          ? '#4299E1' 
                          : task.category === 'weekly' 
                            ? '#38B2AC' 
                            : '#9F7AEA'
                      }
                    ]}>
                      {task.category === 'daily' ? 'Günlük' : 
                       task.category === 'weekly' ? 'Haftalık' : 'Aylık'}
                    </Text>
                  </View>
                  
                  {isAdmin && (
                    <View style={styles.taskActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: `${theme.primary}20` }]}
                        onPress={() => handleOpenModal(task)}
                      >
                        <Ionicons name="pencil" size={16} color={theme.primary} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: `${theme.error}20` }]}
                        onPress={() => handleDeleteTask(task.id)}
                      >
                        <Ionicons name="trash" size={16} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
      
      {/* Task Form Modal */}
      {renderTaskFormModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTabs: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  emptyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  taskItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  importantBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  importantBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
    maxHeight: '70%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    height: 100,
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
}); 