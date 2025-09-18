import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Colors from '../constants/Colors';
import { getAllPrograms, getLimitedPrograms, Program, subscribeToProgramUpdates } from '../services/ProgramService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const CARD_MARGIN = width * 0.02;

// Program renkleri
const programColors = {
  'Ahlak Atölyesi': '#FF9500',
  'Darul Firdevs Sohbetleri': '#FF2D55',
  'Hasbihal İstasyonu': '#FFCC00',
  'Hasbihal Durağı': '#FF9500',
} as const;

interface WeeklyProgramProps {
  limit?: number;
}

export default function WeeklyProgram({ limit = 4 }: WeeklyProgramProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [allProgramsCount, setAllProgramsCount] = useState(0);
  const [allDaysCount, setAllDaysCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Programları yükle (önbellekten veya Firestore'dan)
  const loadPrograms = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else if (!isRefreshing) {
        setLoading(true);
      }
      
      console.log(`Programlar yükleniyor (force refresh: ${forceRefresh})`);
      // Önce tüm programları al (sayım için)
      const allData = await getAllPrograms(forceRefresh);
      // Toplam program sayısını ve benzersiz gün sayısını kaydet
      setAllProgramsCount(allData.length);
      setAllDaysCount(new Set(allData.map(p => p.day)).size);
      
      // Sonra limitli programları al (gösterim için)
      const data = await getLimitedPrograms(limit, forceRefresh);
      console.log(`Programlar yüklendi, ${data.length} adet program bulundu`);
      
      // Programları günlere göre sırala
      const dayOrder = {
        'Pazartesi': 1,
        'Salı': 2,
        'Çarşamba': 3,
        'Perşembe': 4,
        'Cuma': 5,
        'Cumartesi': 6,
        'Pazar': 7
      };
      
      // Günlere göre sıralı hale getir
      const sortedData = [...data].sort((a, b) => {
        return (dayOrder[a.day as keyof typeof dayOrder] || 99) - 
               (dayOrder[b.day as keyof typeof dayOrder] || 99);
      });
      
      setPrograms(sortedData);
      setError(null);
    } catch (err: any) {
      console.error('Program verileri çekilirken hata oluştu:', err);
      console.log('Hata kodu:', err.code);
      console.log('Hata mesajı:', err.message);
      
      // Daha açıklayıcı hata mesajları
      if (err.code === 'permission-denied' || (err.message && err.message.includes('Missing or insufficient permissions'))) {
        setError(`Yetki hatası: Firebase veritabanına erişim izniniz yok. Lütfen giriş yapın veya yöneticinizle iletişime geçin. [Kod: ${err.code}]`);
      } else {
        setError(`Programlar yüklenirken bir hata oluştu: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
  }, [limit]);

  const handleViewAll = () => {
    router.push('/programs');
  };

  const handleProgramPress = (program: Program) => {
    setSelectedProgram(program);
  };

  const closeModal = () => {
    setSelectedProgram(null);
  };

  // Kullanıcı yenileme isteği yapınca verileri zorla yenile
  const handleRefresh = () => {
    loadPrograms(true);
  };

  if (loading && !isRefreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Programlar yükleniyor...</Text>
      </View>
    );
  }

  if (error && !isRefreshing) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (programs.length === 0 && !isRefreshing) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <MaterialCommunityIcons name="calendar-blank" size={40} color={theme.textDim} />
        <Text style={[styles.emptyText, { color: theme.textDim }]}>Henüz program bulunmuyor</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Haftalık Programlar</Text>
          <Text style={[styles.subtitle, { color: theme.secondary }]}>
            {allProgramsCount} Program • {allDaysCount} Gün
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          {isRefreshing && (
            <ActivityIndicator size="small" color={theme.primary} style={styles.refreshIndicator} />
          )}
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: `${theme.primary}15` }]}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <MaterialCommunityIcons 
              name="refresh" 
              size={18} 
              color={theme.primary} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleViewAll}
            style={[styles.viewAllButton, { backgroundColor: `${theme.primary}15` }]}
          >
            <Text style={[styles.viewAll, { color: theme.primary }]}>Tümünü Gör</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        decelerationRate="fast"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {programs.map((item, index) => (
          <TouchableOpacity 
            key={item.id} 
            activeOpacity={0.9}
            style={[
              styles.cardContainer,
              index === 0 ? { marginLeft: width * 0.04 } : {}
            ]}
            onPress={() => handleProgramPress(item)}
          >
            <LinearGradient
              colors={theme.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.programCard}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={24} color="#FFF" />
                </View>
                <View style={styles.dayContainer}>
                  <Text style={styles.dayText}>{item.day}</Text>
                  <View style={styles.infoContainer}>
                    <View style={[styles.timeContainer, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#FFF" />
                      <Text style={[styles.timeText, { color: '#FFF' }]}>{item.time}</Text>
                    </View>
                    <View style={[styles.attendanceContainer, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                      <MaterialCommunityIcons name="account-group" size={16} color="#FFF" />
                      <Text style={[styles.timeText, { color: '#FFF' }]}>{item.lastAttendance}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.contentContainer}>
                <Text style={styles.programText}>{item.program}</Text>
                {item.description && (
                  <Text style={[styles.programDescription, { color: '#FFF' }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <View style={styles.cardFooter}>
                  <View style={[styles.locationContainer, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="#FFF" />
                    <Text style={[styles.locationText, { color: '#FFF' }]} numberOfLines={1}>{item.location}</Text>
                  </View>
                  <View style={[styles.responsibleContainer, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                    <MaterialCommunityIcons name="account" size={16} color="#FFF" />
                    <Text style={[styles.responsibleText, { color: '#FFF' }]} numberOfLines={1}>
                      {item.responsible}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.overlay} />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={selectedProgram !== null}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            {selectedProgram && (
              <>
                <View style={styles.modalHeader}>
                  <LinearGradient
                    colors={theme.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalIconContainer}
                  >
                    <MaterialCommunityIcons 
                      name={selectedProgram.icon as any} 
                      size={32} 
                      color="#FFF" 
                    />
                  </LinearGradient>
                  <View style={styles.modalTitleContainer}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>
                      {selectedProgram.program}
                    </Text>
                    <View style={styles.modalBadgeContainer}>
                      <View style={[styles.modalBadge, { backgroundColor: `${theme.primary}20` }]}>
                        <MaterialCommunityIcons name="calendar" size={14} color={theme.primary} />
                        <Text style={[styles.modalBadgeText, { color: theme.primary }]}>
                          {selectedProgram.day}
                        </Text>
                      </View>
                      <View style={[styles.modalBadge, { backgroundColor: `${theme.primary}20` }]}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={theme.primary} />
                        <Text style={[styles.modalBadgeText, { color: theme.primary }]}>
                          {selectedProgram.time}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[
                      styles.modalCloseButton,
                      { backgroundColor: `${theme.text}15` }
                    ]}
                    onPress={closeModal}
                  >
                    <MaterialCommunityIcons name="close" size={22} color={theme.textDim} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalInfo}>
                  <View style={styles.modalInfoItem}>
                    <MaterialCommunityIcons name="map-marker" size={20} color={theme.primary} />
                    <Text style={[styles.modalInfoText, { color: theme.text }]}>
                      {selectedProgram.location}
                    </Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <MaterialCommunityIcons name="account-group" size={20} color={theme.primary} />
                    <Text style={[styles.modalInfoText, { color: theme.text }]}>
                      Son Katılım: {selectedProgram.lastAttendance} kişi
                    </Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <MaterialCommunityIcons name="account" size={20} color={theme.primary} />
                    <Text style={[styles.modalInfoText, { color: theme.text }]}>
                      Sorumlu: {selectedProgram.responsible}
                    </Text>
                  </View>
                </View>
                <View style={[styles.modalDescriptionContainer, { backgroundColor: `${theme.primary}10` }]}>
                  <Text style={[styles.modalDescription, { color: theme.text }]}>
                    {selectedProgram.description}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                  onPress={closeModal}
                >
                  <Text style={styles.modalButtonText}>Kapat</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: width * 0.05,
  },
  titleContainer: {
    flex: 1,
    paddingLeft: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 14 : 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  refreshIndicator: {
    marginRight: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 4,
  },
  viewAll: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingRight: width * 0.04,
    paddingBottom: 8,
  },
  cardContainer: {
    marginHorizontal: CARD_MARGIN,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  programCard: {
    padding: 16,
    borderRadius: 20,
    width: CARD_WIDTH,
    height: Platform.OS === 'ios' ? 240 : 230,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayContainer: {
    marginLeft: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    color: '#FFF',
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  attendanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timeText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  programText: {
    color: '#FFF',
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  programDescription: {
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    lineHeight: 18,
    marginBottom: 12,
    opacity: 0.9,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
    gap: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
    flex: 1,
  },
  responsibleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flex: 1,
  },
  responsibleText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 25,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    borderRadius: 25,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: Platform.OS === 'ios' ? 24 : 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalBadgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  modalBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  modalInfo: {
    marginBottom: 20,
  },
  modalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalInfoText: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    marginLeft: 12,
  },
  modalDescriptionContainer: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  modalDescription: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    paddingLeft: width * 0.05,
  },
}); 