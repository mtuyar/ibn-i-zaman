import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { TaskDefinition } from '../app/types/task.types';
import { 
  getAllTaskDefinitions, 
  updateTaskDefinition, 
  deleteTaskDefinition, 
  createTaskDefinition,
  addSampleTaskDefinitions,
  toggleTaskDefinitionStatus
} from '../services/TaskService';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

interface AdminTasksModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminTasksModal({ visible, onClose }: AdminTasksModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  
  // Yeni vazife ekleme state'leri
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newTaskCategory, setNewTaskCategory] = useState<string>('daily');
  const [newTaskImportant, setNewTaskImportant] = useState(false);
  
  // Tüm görev tanımlarını getir
  const loadTasks = async (refresh = false) => {
    try {
      setRefreshing(refresh);
      
      if (refresh) {
        setLastDoc(null);
      }
      
      const result = await getAllTaskDefinitions(20, refresh ? null : lastDoc);
      
      if (result.tasks.length > 0) {
        if (refresh) {
          setTasks(result.tasks);
        } else {
          setTasks(prev => [...prev, ...result.tasks]);
        }
        setLastDoc(result.lastDoc);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Görev tanımları yükleme hatası:', error);
      Alert.alert('Hata', 'Görev tanımları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Modal açıldığında görev tanımlarını yükle
  useEffect(() => {
    if (visible) {
      loadTasks(true);
    }
  }, [visible]);
  
  // Yenile
  const handleRefresh = () => {
    setHasMore(true);
    loadTasks(true);
  };
  
  // Daha fazla yükle
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadTasks();
    }
  };
  
  // Görev tanımı güncelleme sonrası yeniden yükle
  const handleTaskUpdate = () => {
    loadTasks(true);
  };
  
  // Tarih seçici işlemi
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewTaskDate(selectedDate);
    }
  };
  
  // Görev tanımını sil
  const handleDeleteTask = async (taskId: string) => {
    try {
      Alert.alert(
        'Görev Tanımını Sil',
        'Bu görev tanımını silmek istediğinize emin misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Sil', 
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              await deleteTaskDefinition(taskId);
              loadTasks(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Görev tanımı silme hatası:', error);
      Alert.alert('Hata', 'Görev tanımı silinirken bir hata oluştu.');
      setLoading(false);
    }
  };
  
  // Görev tanımı durumunu değiştir (aktif/pasif)
  const handleToggleStatus = async (taskId: string, isActive: boolean) => {
    try {
      await toggleTaskDefinitionStatus(taskId, !isActive);
      loadTasks(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Görev tanımı durum değiştirme hatası:', error);
      Alert.alert('Hata', 'Görev tanımı durumu değiştirilirken bir hata oluştu.');
    }
  };
  
  // Yeni görev tanımı oluştur
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Hata', 'Görev başlığı boş olamaz.');
      return;
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);
      
      const newTask = {
        title: newTaskTitle,
        description: newTaskDescription,
        date: newTaskDate,
        category: newTaskCategory,
        isImportant: newTaskImportant,
        createdBy: 'admin', // Bu kısmı gerçek admin kullanıcı adı ile değiştirmelisiniz
        isActive: true
      };
      
      await createTaskDefinition(newTask);
      
      // Formu temizle
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDate(new Date());
      setNewTaskCategory('daily');
      setNewTaskImportant(false);
      
      // Listeyi yenile
      loadTasks(true);
      
      // Ekleme formunu kapat
      setShowAddTask(false);
      
    } catch (error) {
      console.error('Görev tanımı oluşturma hatası:', error);
      Alert.alert('Hata', 'Görev tanımı oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  // Örnek görev tanımları ekle
  const handleAddSampleTasks = async () => {
    try {
      setLoading(true);
      await addSampleTaskDefinitions();
      loadTasks(true);
      Alert.alert('Başarılı', 'Örnek görev tanımları başarıyla eklendi.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Örnek görev tanımları ekleme hatası:', error);
      Alert.alert('Hata', 'Örnek görev tanımları eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrelenmiş görev tanımlarını göster
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Görev tanımı item renderı
  const renderTaskItem = ({ item }: { item: TaskDefinition }) => {
    const categoryColor = item.category === 'daily' 
      ? theme.primary 
      : item.category === 'weekly' 
        ? theme.warning 
        : theme.accent;
    
    return (
      <View style={[styles.taskItem, { backgroundColor: theme.card }]}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />
            <Text style={[styles.taskTitle, { color: theme.text }]}>
              {item.title}
            </Text>
            {item.isImportant && (
              <Ionicons name="star" size={16} color={theme.warning} style={styles.importantIcon} />
            )}
          </View>
          
          <View style={styles.taskActions}>
            <TouchableOpacity 
              style={[styles.statusButton, { backgroundColor: item.isActive ? `${theme.success}20` : `${theme.error}20` }]}
              onPress={() => handleToggleStatus(item.id, item.isActive)}
            >
              <Text style={[styles.statusText, { color: item.isActive ? theme.success : theme.error }]}>
                {item.isActive ? 'Aktif' : 'Pasif'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeleteTask(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
        
        {item.description && (
          <Text style={[styles.taskDescription, { color: theme.textDim }]}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.taskFooter}>
          <View style={styles.taskInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={14} color={theme.textDim} />
              <Text style={[styles.infoText, { color: theme.textDim }]}>
                {item.date.toLocaleDateString('tr-TR')}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={14} color={theme.textDim} />
              <Text style={[styles.infoText, { color: theme.textDim }]}>
                {new Date(item.createdAt).toLocaleDateString('tr-TR')}
              </Text>
            </View>
          </View>
          
          <View style={[styles.categoryTag, { backgroundColor: `${categoryColor}20` }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {item.category === 'daily' ? 'Günlük' : 
               item.category === 'weekly' ? 'Haftalık' : 'Aylık'}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={[styles.safeAreaContainer, { backgroundColor: theme.background }]}>
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <KeyboardAvoidingView 
          style={[styles.container, { backgroundColor: theme.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.card }]}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Vazifeleri Yönet
            </Text>
            
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => setShowAddTask(!showAddTask)}
            >
              <Ionicons 
                name={showAddTask ? "remove" : "add"} 
                size={24} 
                color={theme.primary} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Arama Çubuğu */}
          <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
            <Ionicons name="search" size={20} color={theme.textDim} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Vazife ara..."
              placeholderTextColor={theme.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.textDim} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Yeni Vazife Ekleme Formu */}
          {showAddTask && (
            <View style={[styles.addTaskForm, { backgroundColor: theme.card }]}>
              <Text style={[styles.formTitle, { color: theme.text }]}>
                Yeni Vazife Tanımı Ekle
              </Text>
              
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Vazife başlığı"
                placeholderTextColor={theme.textDim}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />
              
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, height: 100 }]}
                placeholder="Açıklama (isteğe bağlı)"
                placeholderTextColor={theme.textDim}
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                multiline
              />
              
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.background }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={theme.primary} />
                <Text style={[styles.dateButtonText, { color: theme.text }]}>
                  {newTaskDate.toLocaleDateString('tr-TR')}
                </Text>
              </TouchableOpacity>
              
              {/* Kategori Seçici */}
              <View style={styles.categoryContainer}>
                <Text style={[styles.categoryLabel, { color: theme.text }]}>Kategori:</Text>
                <View style={styles.categoryButtons}>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      newTaskCategory === 'daily' && { backgroundColor: `${theme.primary}30` }
                    ]}
                    onPress={() => setNewTaskCategory('daily')}
                  >
                    <Text style={[
                      styles.categoryText,
                      { color: newTaskCategory === 'daily' ? theme.primary : theme.textDim }
                    ]}>
                      Günlük
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      newTaskCategory === 'weekly' && { backgroundColor: `${theme.warning}30` }
                    ]}
                    onPress={() => setNewTaskCategory('weekly')}
                  >
                    <Text style={[
                      styles.categoryText,
                      { color: newTaskCategory === 'weekly' ? theme.warning : theme.textDim }
                    ]}>
                      Haftalık
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      newTaskCategory === 'monthly' && { backgroundColor: `${theme.accent}30` }
                    ]}
                    onPress={() => setNewTaskCategory('monthly')}
                  >
                    <Text style={[
                      styles.categoryText,
                      { color: newTaskCategory === 'monthly' ? theme.accent : theme.textDim }
                    ]}>
                      Aylık
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Önemli mi? */}
              <TouchableOpacity
                style={styles.importantContainer}
                onPress={() => setNewTaskImportant(!newTaskImportant)}
              >
                <View style={[
                  styles.checkbox,
                  {
                    borderColor: theme.warning,
                    backgroundColor: newTaskImportant ? theme.warning : 'transparent'
                  }
                ]}>
                  {newTaskImportant && (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  )}
                </View>
                <Text style={[styles.importantText, { color: theme.text }]}>
                  Önemli vazife
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.primary }]}
                onPress={handleCreateTask}
              >
                <Text style={styles.createButtonText}>Vazife Ekle</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Örnek Görev Ekle Butonu */}
          <TouchableOpacity
            style={[styles.sampleButton, { backgroundColor: theme.accent }]}
            onPress={handleAddSampleTasks}
          >
            <Ionicons name="flask-outline" size={18} color="#FFF" />
            <Text style={styles.sampleButtonText}>Örnek Vazifeler Ekle</Text>
          </TouchableOpacity>
          
          {/* Vazife Listesi */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textDim }]}>
                Vazifeler yükleniyor...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTasks}
              keyExtractor={(item) => item.id}
              renderItem={renderTaskItem}
              contentContainerStyle={styles.listContent}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="alert-circle-outline" size={64} color={theme.textDim} />
                  <Text style={[styles.emptyText, { color: theme.textDim }]}>
                    {searchQuery.length > 0 
                      ? 'Aramanızla eşleşen vazife bulunamadı' 
                      : 'Henüz vazife tanımı bulunmuyor'}
                  </Text>
                </View>
              }
              ListFooterComponent={
                hasMore && tasks.length > 0 ? (
                  <ActivityIndicator 
                    style={styles.footerLoader} 
                    size="small" 
                    color={theme.primary} 
                  />
                ) : null
              }
            />
          )}
          
          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={newTaskDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  footerLoader: {
    marginVertical: 16,
  },
  addTaskForm: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 16,
    marginLeft: 8,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  categoryText: {
    fontWeight: '500',
  },
  importantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  importantText: {
    fontSize: 16,
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  taskItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  importantIcon: {
    marginLeft: 8,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 4,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
  },
  sampleButtonText: {
    color: '#FFF',
    fontWeight: '500',
    marginLeft: 6,
  },
}); 