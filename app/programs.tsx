import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions, ActivityIndicator, RefreshControl, StatusBar, Image, SafeAreaView, Modal, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { Stack, router } from 'expo-router';
import { getAllPrograms, Program, subscribeToProgramUpdates, addProgram, deleteProgram, updateProgram } from '../services/ProgramService';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddProgramModal from '../components/AddProgramModal';

const { width, height } = Dimensions.get('window');

// Gradients used in the app
const gradients = {
  blue: ['#2E7DFF', '#38BDF8'] as [string, string],   // Blue gradient
  orange: ['#F59E0B', '#FBBF24'] as [string, string], // Orange gradient
  red: ['#EF4444', '#FF8086'] as [string, string]     // Red gradient
};

export default function ProgramsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupedPrograms, setGroupedPrograms] = useState<Record<string, Program[]>>({});
  
  // Modal state
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Programları yükle (önbellekten veya Firestore'dan)
  const loadPrograms = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else if (!refreshing) {
        setLoading(true);
      }

      const data = await getAllPrograms(forceRefresh);
      setPrograms(data);
      
      // Programları günlere göre grupla
      const grouped: Record<string, Program[]> = {};
      data.forEach(program => {
        if (!grouped[program.day]) {
          grouped[program.day] = [];
        }
        grouped[program.day].push(program);
      });
      
      // Günleri sırala (M-K-S düzeninde)
      const dayOrder = {
        'Pazartesi': 1,
        'Salı': 2,
        'Çarşamba': 3,
        'Perşembe': 4,
        'Cuma': 5,
        'Cumartesi': 6,
        'Pazar': 7
      };
      
      const sortedGrouped: Record<string, Program[]> = {};
      Object.keys(grouped)
        .sort((a, b) => (dayOrder[a as keyof typeof dayOrder] || 99) - (dayOrder[b as keyof typeof dayOrder] || 99))
        .forEach(day => {
          sortedGrouped[day] = grouped[day];
        });
      
      setGroupedPrograms(sortedGrouped);
      setError(null);
    } catch (err) {
      console.error('Program verileri çekilirken hata oluştu:', err);
      setError('Programlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    loadPrograms();

    // Firestore'daki değişiklikleri dinle
    const unsubscribe = subscribeToProgramUpdates(() => {
      // Program güncellendiğinde veriyi yeniden yükle
      loadPrograms(true);
    });

    // Component kaldırıldığında dinlemeyi durdur
    return () => {
      unsubscribe();
    };
  }, []);

  // Pull-to-refresh ile yenileme
  const handleRefresh = () => {
    loadPrograms(true);
  };

  const handleGoBack = () => {
    router.back();
  };

  // Günün kısaltması
  const getDayAbbreviation = (day: string): string => {
    const abbreviations: Record<string, string> = {
      'Pazartesi': 'Pzt',
      'Salı': 'Sal',
      'Çarşamba': 'Çar',
      'Perşembe': 'Per',
      'Cuma': 'Cum',
      'Cumartesi': 'Cmt',
      'Pazar': 'Paz'
    };
    
    return abbreviations[day] || day.substring(0, 3);
  };

  // Günün gradient renkleri (her bir gün için aynı rengi kullan)
  const getDayGradient = (day: string): [string, string] => {
    const dayGradients: Record<string, [string, string]> = {
      'Pazartesi': gradients.blue,    // Blue
      'Salı': gradients.red,          // Red
      'Çarşamba': gradients.orange,   // Orange
      'Perşembe': gradients.blue,     // Blue
      'Cuma': gradients.red,          // Red
      'Cumartesi': gradients.orange,  // Orange
      'Pazar': gradients.blue         // Blue
    };
    
    return dayGradients[day] || gradients.blue;
  };

  // Open modal handler
  const handleOpenModal = () => {
    setModalVisible(true);
  };
  
  // Close modal handler
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingProgram(null);
  };
  
  // Handle edit program
  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setModalVisible(true);
  };

  // Handle delete program
  const handleDeleteProgram = async (program: Program) => {
    Alert.alert(
      'Programı Sil',
      'Bu programı silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteProgram(program.id);
              await loadPrograms(true);
            } catch (error) {
              console.error('Program silme hatası:', error);
              setError('Program silinirken bir hata oluştu.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Handle save program
  const handleSaveProgram = async (programData: Omit<Program, 'id' | 'createdAt'>) => {
    try {
      setIsSaving(true);
      if (editingProgram) {
        await updateProgram(editingProgram.id, programData);
      } else {
        await addProgram(programData);
      }
      setModalVisible(false);
      setEditingProgram(null);
      await loadPrograms(true);
    } catch (error) {
      console.error('Program kaydetme hatası:', error);
      setError('Program kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  // Modal'ın görünürlüğünü kontrol etmek için log ekleyelim
  console.log("Modal görünürlük durumu:", isModalVisible);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: theme.surface,
          paddingTop: insets.top || 16
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Haftalık Programlar</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleOpenModal}
        >
          <LinearGradient
            colors={gradients.blue}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButtonGradient}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={[styles.contentWrapper, { backgroundColor: theme.background }]}>
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.messageText, { color: theme.text }]}>
              Programlar yükleniyor...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.error} />
            <Text style={[styles.messageText, { color: theme.error }]}>{error}</Text>
            <LinearGradient
              colors={gradients.orange}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryButton}
            >
              <TouchableOpacity
                style={styles.buttonInner}
                onPress={() => loadPrograms(true)}
              >
                <Text style={styles.buttonText}>Tekrar Dene</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : programs.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color={theme.textDim} />
            <Text style={[styles.messageText, { color: theme.textDim }]}>
              Henüz program bulunmuyor
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
          >
            {Object.entries(groupedPrograms).map(([day, dayPrograms]) => (
              <View key={day} style={styles.daySection}>
                <View style={[styles.daySectionHeader, { borderBottomColor: getDayGradient(day)[0] }]}>
                  <LinearGradient
                    colors={getDayGradient(day)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.dayBadge}
                  >
                    <Text style={styles.dayBadgeText}>{getDayAbbreviation(day)}</Text>
                  </LinearGradient>
                  <Text style={[styles.dayName, { color: theme.text }]}>{day}</Text>
                  <Text style={[styles.programCount, { color: theme.textDim }]}>
                    {dayPrograms.length} Program
                  </Text>
                </View>
                
                <View style={styles.programsList}>
                  {dayPrograms.map((program) => (
                    <View 
                      key={program.id} 
                      style={[styles.programCard, { backgroundColor: theme.surface }]}
                    >
                      <View style={[
                        styles.timeColumn, 
                        { 
                          borderRightColor: getDayGradient(day)[0],
                          backgroundColor: `${getDayGradient(day)[0]}10`
                        }
                      ]}>
                        <Text style={[styles.timeText, { color: getDayGradient(day)[0] }]}>{program.time}</Text>
                      </View>
                      
                      <View style={styles.programColumn}>
                        <View style={styles.programHeader}>
                          <LinearGradient
                            colors={getDayGradient(day)}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.iconContainer}
                          >
                            <MaterialCommunityIcons name={program.icon as any} size={20} color="#FFF" />
                          </LinearGradient>
                          <Text style={[styles.programName, { color: theme.text }]}>{program.program}</Text>
                          <View style={styles.programActions}>
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: `${theme.primary}15` }]}
                              onPress={() => handleEditProgram(program)}
                            >
                              <MaterialCommunityIcons name="pencil" size={16} color={theme.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: `${theme.error}15` }]}
                              onPress={() => handleDeleteProgram(program)}
                              disabled={isDeleting}
                            >
                              <MaterialCommunityIcons name="delete" size={16} color={theme.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        <View style={styles.programDetails}>
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="map-marker" size={16} color={getDayGradient(day)[0]} />
                            <Text style={[styles.detailText, { color: theme.text }]}>{program.location}</Text>
                          </View>
                          
                          <View style={styles.bottomDetails}>
                            <View style={styles.detailItem}>
                              <MaterialCommunityIcons name="account" size={16} color={getDayGradient(day)[0]} />
                              <Text style={[styles.detailText, { color: theme.text }]}>{program.responsible}</Text>
                            </View>
                            
                            <View style={styles.detailItem}>
                              <MaterialCommunityIcons name="account-group" size={16} color={getDayGradient(day)[0]} />
                              <Text style={[styles.detailText, { color: theme.text }]}>{program.lastAttendance} kişi</Text>
                            </View>
                          </View>
                          
                          {program.description && (
                            <Text 
                              style={[styles.description, { color: theme.textDim }]} 
                              numberOfLines={2}
                            >
                              {program.description}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      
      {/* Program Modal */}
      <AddProgramModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onSave={handleSaveProgram}
        isLoading={isSaving}
        initialData={editingProgram}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonInner: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  daySection: {
    marginBottom: 24,
  },
  daySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(46, 125, 255, 0.2)',
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  programCount: {
    fontSize: 14,
  },
  programsList: {
    gap: 12,
  },
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  programCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 5,
    marginHorizontal: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.08)',
      },
      android: {
        elevation: 2,
      },
    }),
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  programColumn: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  programName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  programDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  programActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 