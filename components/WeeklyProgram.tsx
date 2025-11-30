import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import Colors from '../constants/Colors';
import { getAllPrograms, Program, subscribeToProgramUpdates } from '../services/ProgramService';
import { ProgramTimeFilter, ProgramType } from '../types/program';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const CARD_MARGIN = width * 0.02;

const STATUS_LABELS = {
  planned: 'Planlandı',
  ongoing: 'Devam',
  completed: 'Tamamlandı',
} as const;

interface WeeklyProgramProps {
  limit?: number;
}

export default function WeeklyProgram({ limit = 7 }: WeeklyProgramProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
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
      const data = await getAllPrograms(forceRefresh);
      const sortedData = [...data].sort((a, b) => {
        const timeA = a.startDate?.getTime?.() ?? 0;
        const timeB = b.startDate?.getTime?.() ?? 0;
        return timeA - timeB;
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

  const getTimeBucket = (program: Program): ProgramTimeFilter => {
    const now = Date.now();
    const start = program.startDate?.getTime?.() ?? 0;
    const end = program.endDate?.getTime?.();
 
    if (program.status === 'completed' || (end && end < now)) {
      return 'past';
    }
    if (program.status === 'ongoing') {
      return 'ongoing';
    }
    if (start > now) {
      return 'upcoming';
    }
    return 'ongoing';
  };

  const getTypeColor = (type: ProgramType) => {
    switch (type) {
      case 'monthly':
        return theme.warning;
      case 'one_time':
        return theme.secondary;
      default:
        return theme.primary;
    }
  };

  const getStatusColor = (status: Program['status']) => {
    switch (status) {
      case 'completed':
        return theme.textDim;
      case 'ongoing':
        return theme.accent || '#38BDF8'; // Devam durumu için mavi/turkuaz renk
      default:
        return theme.primary;
    }
  };

  const formatProgramDate = (date: Date) =>
    new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  const formatRelativeTime = (date: Date): string => {
    if (!date || !date.getTime) return 'Tarih belirtilmedi';
    try {
      const diffMs = Date.now() - date.getTime();
      const minutes = Math.round(diffMs / 60000);
      if (minutes < 1) return 'Şimdi';
      if (minutes < 60) return `${minutes} dk önce`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours} saat önce`;
      const days = Math.round(hours / 24);
      return `${days} gün önce`;
    } catch (error) {
      console.error('formatRelativeTime hatası:', error);
      return 'Tarih belirtilmedi';
    }
  };

  const formatFutureTime = (date: Date): string => {
    if (!date || !date.getTime) return 'Tarih belirtilmedi';
    try {
      const diffMs = date.getTime() - Date.now();
      const minutes = Math.round(diffMs / 60000);
      if (minutes <= 0) return 'Başlamak üzere';
      if (minutes < 60) return `${minutes} dk sonra`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours} saat sonra`;
      const days = Math.round(hours / 24);
      return `${days} gün sonra`;
    } catch (error) {
      console.error('formatFutureTime hatası:', error);
      return 'Tarih belirtilmedi';
    }
  };

  const getTypeLabel = (type: ProgramType) => {
    switch (type) {
      case 'monthly':
        return 'Aylık';
      case 'one_time':
        return 'Tek Seferlik';
      default:
        return 'Haftalık';
    }
  };

  const getProgramTimingLabel = (program: Program) => {
    if (program.type === 'one_time') {
      const base = program.occurrenceDateLabel ?? (program.startDate ? formatProgramDate(program.startDate) : 'Tarih belirtilmedi');
      const bucket = getTimeBucket(program);
      if (bucket === 'upcoming' && program.startDate) {
        return `${base} • ${formatFutureTime(program.startDate)}`;
      }
      if (bucket === 'past' && program.startDate) {
        return `${base} • ${formatRelativeTime(program.startDate)}`;
      }
      return `${base} • Devam ediyor`;
    }

    if (program.type === 'monthly') {
      const dayOfMonth = program.dayOfMonth || (program.startDate ? program.startDate.getDate() : null);
      return `Her ay ${dayOfMonth || '?'}. gün • ${program.time ?? ''}`;
    }

    return `${program.day || 'Gün Belirtilmedi'} • ${program.time || ''}`;
  };

  const activePrograms = useMemo(
    () => programs.filter((program) => getTimeBucket(program) !== 'past'),
    [programs]
  );

  const visiblePrograms = useMemo(() => {
    return [...activePrograms]
      .sort((a, b) => {
        const timeA = a.startDate?.getTime?.() ?? 0;
        const timeB = b.startDate?.getTime?.() ?? 0;
        return timeA - timeB;
      })
      .slice(0, limit);
  }, [activePrograms, limit]);

  const statsSubtitle =
    visiblePrograms.length > 0 ? `En yakın ${visiblePrograms.length} program` : 'Program bulunamadı';

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
          <Text style={[styles.title, { color: theme.text }]}>Programlar</Text>
          <Text style={[styles.subtitle, { color: theme.secondary }]}>
            {statsSubtitle}
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
        {visiblePrograms.length === 0 ? (
          <View style={[styles.cardContainer, styles.emptyCard, { marginLeft: width * 0.04 }]}>
            <Text style={[styles.emptyText, { color: '#fff' }]}>
              Gösterilecek program bulunamadı.
            </Text>
          </View>
        ) : visiblePrograms.map((item, index) => {
          const scheduleTitle = item.type === 'one_time' ? 'Tek Seferlik' : item.day || getTypeLabel(item.type);
          const timeDisplay =
            item.type === 'one_time'
              ? item.occurrenceDateLabel ?? (item.startDate ? formatProgramDate(item.startDate) : 'Tarih belirtilmedi')
              : item.type === 'monthly'
                ? `Ayın ${item.dayOfMonth || (item.startDate ? item.startDate.getDate() : '?')}. günü`
                : item.time || '';
          const statusColor = getStatusColor(item.status);
          const statusLabel = STATUS_LABELS[item.status];
          const descriptionText = item.description || getProgramTimingLabel(item);
          
          // Fotoğraf kontrolü - coverImage veya gallery'den ilk görsel
          const displayImage = item.coverImage || (item.gallery && item.gallery.length > 0 ? item.gallery[0] : null);
          
          return (
          <TouchableOpacity 
            key={item.id} 
            activeOpacity={0.9}
            style={[
              styles.cardContainer,
              index === 0 ? { marginLeft: width * 0.04 } : {}
            ]}
            onPress={() => handleProgramPress(item)}
          >
            {displayImage ? (
              // Fotoğraf varsa modern kart tasarımı
              <View style={styles.programCardWithImage}>
                <Image 
                  source={{ uri: displayImage }} 
                  style={styles.cardBackgroundImage}
                  contentFit="cover"
                />
                <View style={styles.imageOverlay} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: statusColor === theme.accent ? 'rgba(56, 189, 248, 0.95)' : 
                                      statusColor === theme.warning ? 'rgba(245, 158, 11, 0.95)' : 
                                      statusColor === theme.textDim ? 'rgba(107, 114, 128, 0.95)' :
                                      'rgba(46, 125, 255, 0.95)' 
                    }]}>
                      <Text style={styles.statusBadgeText}>{statusLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.programTextWithImage}>{item.program}</Text>
                    {descriptionText && (
                      <Text style={styles.programDescriptionWithImage} numberOfLines={2}>
                        {descriptionText}
                      </Text>
                    )}
                    <View style={styles.cardInfoRow}>
                      <View style={styles.cardInfoItem}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color="#FFF" />
                        <Text style={styles.cardInfoText}>{timeDisplay}</Text>
                      </View>
                      <View style={styles.cardInfoItem}>
                        <MaterialCommunityIcons name="account-group" size={14} color="#FFF" />
                        <Text style={styles.cardInfoText}>{item.lastAttendance ?? 0} kişi</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              // Fotoğraf yoksa ikon placeholder ile modern tasarım
              <View style={[styles.programCardNoImage, { backgroundColor: theme.surface }]}>
                <View style={[styles.iconPlaceholderContainer, { backgroundColor: `${theme.primary}12` }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={32} color={theme.primary} />
                </View>
                <View style={styles.cardHeaderNoImage}>
                  <View style={styles.dayContainerNoImage}>
                    <Text style={[styles.dayTextNoImage, { color: theme.text }]}>{scheduleTitle}</Text>
                    <View style={styles.infoContainerNoImage}>
                      <View style={[styles.timeContainerNoImage, { backgroundColor: `${theme.primary}15` }]}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={theme.primary} />
                        <Text style={[styles.timeTextNoImage, { color: theme.text }]}>{timeDisplay}</Text>
                      </View>
                      <View style={[styles.attendanceContainerNoImage, { 
                        backgroundColor: statusColor === theme.accent ? 'rgba(56, 189, 248, 0.15)' : 
                                        statusColor === theme.warning ? 'rgba(245, 158, 11, 0.15)' : 
                                        statusColor === theme.textDim ? 'rgba(107, 114, 128, 0.15)' :
                                        `${theme.primary}15`,
                        borderColor: statusColor === theme.accent ? 'rgba(56, 189, 248, 0.3)' : 
                                    statusColor === theme.warning ? 'rgba(245, 158, 11, 0.3)' : 
                                    statusColor === theme.textDim ? 'rgba(107, 114, 128, 0.3)' :
                                    `${theme.primary}30`
                      }]}>
                        <MaterialCommunityIcons name="progress-clock" size={14} color={statusColor} />
                        <Text style={[styles.statusTextNoImage, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.contentContainerNoImage}>
                  <Text style={[styles.programTextNoImage, { color: theme.text }]}>{item.program}</Text>
                  {descriptionText && (
                    <Text style={[styles.programDescriptionNoImage, { color: theme.textDim }]} numberOfLines={2}>
                      {descriptionText}
                    </Text>
                  )}
                  <View style={styles.cardFooterNoImage}>
                    <View style={[styles.locationContainerNoImage, { backgroundColor: `${theme.primary}08` }]}>
                      <MaterialCommunityIcons name="map-marker" size={14} color={theme.primary} />
                      <Text style={[styles.locationTextNoImage, { color: theme.text }]} numberOfLines={1}>{item.location}</Text>
                    </View>
                    <View style={[styles.attendanceInfoNoImage, { backgroundColor: `${theme.primary}08` }]}>
                      <MaterialCommunityIcons name="account-group" size={14} color={theme.primary} />
                      <Text style={[styles.attendanceTextNoImage, { color: theme.text }]}>
                        {item.lastAttendance ?? 0} kişi
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
        })}
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
                          {getTypeLabel(selectedProgram.type)}
                        </Text>
                      </View>
                      <View style={[styles.modalBadge, { backgroundColor: `${theme.primary}20` }]}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={theme.primary} />
                        <Text style={[styles.modalBadgeText, { color: theme.primary }]}>
                          {selectedProgram.type === 'one_time'
                            ? (selectedProgram.startDate ? formatProgramDate(selectedProgram.startDate) : 'Tarih belirtilmedi')
                            : selectedProgram.time || ''}
                        </Text>
                      </View>
                      <View style={[styles.modalBadge, { backgroundColor: `${theme.primary}20` }]}>
                        <MaterialCommunityIcons name="progress-clock" size={14} color={theme.primary} />
                        <Text style={[styles.modalBadgeText, { color: theme.primary }]}>
                          {STATUS_LABELS[selectedProgram.status]}
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
                    <MaterialCommunityIcons name="calendar-range" size={20} color={theme.primary} />
                    <Text style={[styles.modalInfoText, { color: theme.text }]}>
                      {getProgramTimingLabel(selectedProgram)}
                    </Text>
                  </View>
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
                {selectedProgram.scheduleNote ? (
                  <View style={[styles.modalDescriptionContainer, { backgroundColor: `${theme.secondary}10` }]}>
                    <Text style={[styles.modalDescription, { color: theme.text }]}>
                      {selectedProgram.scheduleNote}
                    </Text>
                  </View>
                ) : null}
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
  attendanceInfo: {
    fontSize: 12,
    opacity: 0.85,
    marginBottom: 8,
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
  emptyCard: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: Platform.OS === 'ios' ? 220 : 210,
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
  // Fotoğraflı kart stilleri
  programCardWithImage: {
    width: CARD_WIDTH,
    height: Platform.OS === 'ios' ? 240 : 230,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBackgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  programTextWithImage: {
    color: '#FFF',
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  programDescriptionWithImage: {
    color: '#FFF',
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    lineHeight: 18,
    marginBottom: 12,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardInfoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  cardInfoText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Fotoğrafsız kart stilleri
  programCardNoImage: {
    width: CARD_WIDTH,
    height: Platform.OS === 'ios' ? 240 : 230,
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconPlaceholderContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderNoImage: {
    marginBottom: 12,
  },
  dayContainerNoImage: {
    marginBottom: 8,
  },
  dayTextNoImage: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoContainerNoImage: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  timeContainerNoImage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  timeTextNoImage: {
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceContainerNoImage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  statusTextNoImage: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentContainerNoImage: {
    flex: 1,
    justifyContent: 'space-between',
  },
  programTextNoImage: {
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  programDescriptionNoImage: {
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooterNoImage: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  locationContainerNoImage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    flex: 1,
  },
  locationTextNoImage: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  attendanceInfoNoImage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  attendanceTextNoImage: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 