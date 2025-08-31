import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { TaskDefinition, TaskCategory } from './types/task.types';
import { 
  getAllTaskDefinitions, 
  addTaskDefinition, 
  updateTaskDefinition, 
  deleteTaskDefinition 
} from '../services/TaskDefinitionService';
import { useAuth } from '../context/AuthContext';
import { isUserAdmin } from '../services/AdminService';
import Header from '../components/Header';
import * as Haptics from 'expo-haptics';
import TaskDefinitionModal from '../components/TaskDefinitionModal';

export default function TaskDefinitionsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [taskDefinitions, setTaskDefinitions] = useState<TaskDefinition[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('daily');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDefinition | undefined>();
  
  // Admin kontrolü
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const adminStatus = await isUserAdmin(user.uid);
        setIsAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, [user]);
  
  // Vazife tanımlarını yükle
  useEffect(() => {
    loadTaskDefinitions();
  }, []);
  
  const loadTaskDefinitions = async () => {
    try {
      setIsLoading(true);
      const definitions = await getAllTaskDefinitions();
      setTaskDefinitions(definitions);
    } catch (error) {
      console.error('Vazife tanımları yükleme hatası:', error);
      Alert.alert('Hata', 'Vazife tanımları yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Kategori değiştirme
  const handleCategoryChange = (category: TaskCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
  };
  
  // Vazife tanımı silme
  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTaskDefinition(id);
      await loadTaskDefinitions();
      Alert.alert('Başarılı', 'Vazife tanımı başarıyla silindi.');
    } catch (error) {
      console.error('Vazife silme hatası:', error);
      Alert.alert('Hata', 'Vazife silinirken bir hata oluştu.');
    }
  };
  
  // Kategori etiketi
  const getCategoryLabel = (category: TaskCategory) => {
    switch (category) {
      case 'daily':
        return 'Günlük';
      case 'weekly':
        return 'Haftalık';
      case 'monthly':
        return 'Aylık';
      default:
        return category;
    }
  };
  
  // Seçili kategoriye göre vazifeleri filtrele
  const filteredTasks = taskDefinitions.filter(task => task.category === selectedCategory);
  
  // Yeni vazife ekleme
  const handleAddTask = () => {
    setSelectedTask(undefined);
    setShowModal(true);
  };
  
  // Vazife düzenleme
  const handleEditTask = (task: TaskDefinition) => {
    setSelectedTask(task);
    setShowModal(true);
  };
  
  // Vazife kaydetme
  const handleSaveTask = async (taskData: Omit<TaskDefinition, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (selectedTask) {
        // Güncelleme
        await updateTaskDefinition(selectedTask.id, taskData);
        Alert.alert('Başarılı', 'Vazife başarıyla güncellendi.');
      } else {
        // Yeni ekleme
        await addTaskDefinition(taskData);
        Alert.alert('Başarılı', 'Yeni vazife başarıyla eklendi.');
      }
      await loadTaskDefinitions();
    } catch (error) {
      console.error('Vazife kaydetme hatası:', error);
      Alert.alert('Hata', 'Vazife kaydedilirken bir hata oluştu.');
    }
  };
  
  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header title="Vazife Tanımları" />
        <View style={styles.unauthorizedContainer}>
          <Ionicons name="lock-closed" size={48} color={theme.textDim} />
          <Text style={[styles.unauthorizedText, { color: theme.text }]}>
            Bu sayfaya erişim yetkiniz bulunmuyor
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Vazife Tanımları" />
      
      {/* Kategori Seçici */}
      <View style={[styles.categoryContainer, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === 'daily' && { backgroundColor: `${theme.primary}15` }
          ]}
          onPress={() => handleCategoryChange('daily')}
        >
          <Text style={[
            styles.categoryText,
            { color: selectedCategory === 'daily' ? theme.primary : theme.text }
          ]}>
            Günlük
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === 'weekly' && { backgroundColor: `${theme.primary}15` }
          ]}
          onPress={() => handleCategoryChange('weekly')}
        >
          <Text style={[
            styles.categoryText,
            { color: selectedCategory === 'weekly' ? theme.primary : theme.text }
          ]}>
            Haftalık
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === 'monthly' && { backgroundColor: `${theme.primary}15` }
          ]}
          onPress={() => handleCategoryChange('monthly')}
        >
          <Text style={[
            styles.categoryText,
            { color: selectedCategory === 'monthly' ? theme.primary : theme.text }
          ]}>
            Aylık
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Vazife Listesi */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textDim }]}>
              Vazifeler yükleniyor...
            </Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="list" size={48} color={theme.textDim} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              Bu kategoride vazife tanımı bulunmuyor
            </Text>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={handleAddTask}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Yeni Vazife Ekle</Text>
            </TouchableOpacity>
            {/* Örnek Vazifeleri Ekle butonu */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.accent, marginTop: 8 }]}
              onPress={async () => {
                try {
                  const { addSampleTasks } = await import('../services/TaskService');
                  await addSampleTasks();
                  Alert.alert('Başarılı', 'Örnek vazifeler eklendi!');
                } catch (e) {
                  Alert.alert('Hata', 'Örnek vazifeler eklenirken bir hata oluştu.');
                }
              }}
            >
              <Ionicons name="flask" size={22} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Örnek Vazifeleri Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.taskList}>
            {filteredTasks.map(task => (
              <View 
                key={task.id}
                style={[
                  styles.taskCard,
                  { backgroundColor: colorScheme === 'dark' ? theme.surface : '#FFFFFF' }
                ]}
              >
                <View style={styles.taskHeader}>
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, { color: theme.text }]}>
                      {task.title}
                    </Text>
                    {task.isImportant && (
                      <View style={styles.importantBadge}>
                        <Ionicons name="star" size={16} color={theme.warning} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.taskActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleEditTask(task)}
                    >
                      <Ionicons name="pencil" size={20} color={theme.primary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => {
                        Alert.alert(
                          'Vazife Sil',
                          'Bu vazifeyi silmek istediğinizden emin misiniz?',
                          [
                            { text: 'İptal', style: 'cancel' },
                            { 
                              text: 'Sil', 
                              style: 'destructive',
                              onPress: () => handleDeleteTask(task.id)
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash" size={20} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {task.description && (
                  <Text style={[styles.taskDescription, { color: theme.textDim }]}>
                    {task.description}
                  </Text>
                )}
                
                <View style={styles.taskMeta}>
                  <View style={[styles.categoryBadge, { backgroundColor: `${theme.primary}15` }]}>
                    <Text style={[styles.categoryBadgeText, { color: theme.primary }]}>
                      {getCategoryLabel(task.category)}
                    </Text>
                  </View>
                  
                  <Text style={[styles.dateText, { color: theme.textDim }]}>
                    {new Date(task.createdAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Yeni Vazife Ekleme Butonu */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={handleAddTask}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Vazife Modalı */}
      <TaskDefinitionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveTask}
        initialData={selectedTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    margin: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    borderRadius: 16,
    padding: 16,
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
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  importantBadge: {
    marginLeft: 4,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  taskDescription: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unauthorizedText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
}); 