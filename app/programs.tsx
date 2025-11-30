import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/Colors';
import AddProgramModal from '../components/AddProgramModal';
import ProgramDetailModal from '../components/programs/ProgramDetailModal';
import CompleteProgramModal, { CompletionFormResult } from '../components/programs/CompleteProgramModal';
import {
  addProgram,
  completeProgram,
  deleteProgram,
  getAllPrograms,
  subscribeToProgramUpdates,
  updateProgram,
  Program,
} from '../services/ProgramService';
import { uploadImageFromUri } from '../services/StorageService';
import { ProgramInput, ProgramTimeFilter, ProgramType } from '../types/program';

type Theme = typeof Colors.light;
type FilterKey = 'all' | ProgramType | 'upcoming' | 'past';
type SortOption = 'nearest' | 'oldest' | 'category' | 'status';

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Hepsi' },
  { key: 'weekly', label: 'Haftalık' },
  { key: 'monthly', label: 'Aylık' },
  { key: 'one_time', label: 'Tek Seferlik' },
  { key: 'upcoming', label: 'Yaklaşan' },
  { key: 'past', label: 'Geçmiş' },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'nearest', label: 'En yakın tarih' },
  { key: 'oldest', label: 'En eski' },
  { key: 'category', label: 'Kategoriye göre' },
  { key: 'status', label: 'Durumlara göre' },
];

const STATUS_META: Record<Program['status'], { label: string; color: string }> = {
  planned: { label: 'Yaklaşan', color: '#F59E0B' },
  ongoing: { label: 'Devam Ediyor', color: '#10B981' },
  completed: { label: 'Tamamlandı', color: '#6B7280' },
};

const TYPE_LABELS: Record<ProgramType, string> = {
  weekly: 'Haftalık',
  monthly: 'Aylık',
  one_time: 'Tek Seferlik',
};

const ProgramsScreen = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortOption, setSortOption] = useState<SortOption>('nearest');

  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isDetailVisible, setDetailVisible] = useState(false);

  const [programToComplete, setProgramToComplete] = useState<Program | null>(null);
  const [isCompletionModalVisible, setCompletionModalVisible] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [galleryUploadingId, setGalleryUploadingId] = useState<string | null>(null);
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  const loadPrograms = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        if (forceRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const data = await getAllPrograms(forceRefresh);
        setPrograms(data);
        setError(null);
      } catch (err) {
        console.error('Program verileri çekilirken hata oluştu:', err);
        setError('Programlar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadPrograms();
    const unsubscribe = subscribeToProgramUpdates(() => loadPrograms(true));
    return () => unsubscribe();
  }, [loadPrograms]);

  useEffect(() => {
    if (!selectedProgram) return;
    const updated = programs.find((program) => program.id === selectedProgram.id);
    if (updated && updated !== selectedProgram) {
      setSelectedProgram(updated);
    }
  }, [programs, selectedProgram]);

  useEffect(() => {
    if (!programToComplete) return;
    const updated = programs.find((program) => program.id === programToComplete.id);
    if (updated && updated !== programToComplete) {
      setProgramToComplete(updated);
    }
  }, [programs, programToComplete]);

  const stats = useMemo(() => {
    const result = { total: programs.length, upcoming: 0, active: 0, completed: 0 };
    programs.forEach((program) => {
      const bucket = getTimeBucket(program);
      if (bucket === 'upcoming') result.upcoming += 1;
      if (program.status === 'ongoing') result.active += 1;
      if (program.status === 'completed') result.completed += 1;
    });
    return result;
  }, [programs]);

  const counts = useMemo<Record<FilterKey, number>>(() => {
    const base: Record<FilterKey, number> = {
      all: programs.length,
      weekly: 0,
      monthly: 0,
      one_time: 0,
      upcoming: 0,
      past: 0,
    };
    programs.forEach((program) => {
      base[program.type] += 1;
      const bucket = getTimeBucket(program);
      if (bucket === 'upcoming') base.upcoming += 1;
      if (bucket === 'past') base.past += 1;
    });
    base.all = programs.length;
    return base;
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    const filtered = programs.filter((program) => filterPredicate(program, filter));
    return sortPrograms(filtered, sortOption);
  }, [programs, filter, sortOption]);

  const selectedSortLabel = SORT_OPTIONS.find((option) => option.key === sortOption)?.label ?? 'En yakın tarih';

  const handleRefresh = () => loadPrograms(true);

  const handleOpenAddModal = () => {
    setEditingProgram(null);
    setAddModalVisible(true);
  };

  const handleCloseAddModal = () => {
    setAddModalVisible(false);
    setEditingProgram(null);
  };

  const handleSelectProgram = (program: Program) => {
    setSelectedProgram(program);
    setDetailVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailVisible(false);
    setSelectedProgram(null);
  };

  const handleRequestEdit = (program: Program) => {
    handleCloseDetail();
    setEditingProgram(program);
    setAddModalVisible(true);
  };

  const handleRequestDelete = (program: Program) => {
    const confirmDelete = () => {
      deleteProgram(program.id)
        .then(() => loadPrograms(true))
        .catch((err) => {
          console.error('Program silme hatası:', err);
          Alert.alert('Hata', 'Program silinirken bir sorun oluştu.');
        });
    };

    Alert.alert('Programı Sil', `${program.program} kaydını silmek istediğine emin misin?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          handleCloseDetail();
          confirmDelete();
        },
      },
    ]);
  };

  const handleSaveProgram = async (programData: ProgramInput, media?: { coverImageUri?: string | null }) => {
    try {
      setIsSaving(true);

      let coverImageUrl: string | undefined = undefined;
      if (media) {
        if (media.coverImageUri === null) {
          coverImageUrl = undefined;
        } else if (media.coverImageUri) {
          coverImageUrl = media.coverImageUri.startsWith('http')
            ? media.coverImageUri
            : await uploadImageFromUri(media.coverImageUri, 'program-covers');
        }
      }
      if (coverImageUrl === undefined && media?.coverImageUri === undefined && editingProgram?.coverImage) {
        coverImageUrl = editingProgram.coverImage;
      }

      const existingGallery = editingProgram?.gallery ?? [];
      const sanitizedGallery =
        media?.coverImageUri === null && editingProgram?.coverImage
          ? existingGallery.filter((item) => item !== editingProgram.coverImage)
          : existingGallery;

      const gallery = coverImageUrl
        ? Array.from(new Set([coverImageUrl, ...sanitizedGallery, ...(programData.gallery ?? [])]))
        : programData.gallery ?? sanitizedGallery;

      const payload: ProgramInput = {
        ...programData,
        coverImage: coverImageUrl,
        gallery,
      };

      if (editingProgram) {
        await updateProgram(editingProgram.id, payload);
      } else {
        await addProgram(payload);
      }

      setAddModalVisible(false);
      setEditingProgram(null);
      await loadPrograms(true);
    } catch (err) {
      console.error('Program kaydetme hatası:', err);
      Alert.alert('Hata', 'Program kaydedilirken bir sorun oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartCompletion = (program: Program) => {
    handleCloseDetail();
    setProgramToComplete(program);
    setCompletionModalVisible(true);
  };

  const handleCloseCompletion = () => {
    setCompletionModalVisible(false);
    setProgramToComplete(null);
  };

  const handleCompleteProgramSubmit = async (form: CompletionFormResult) => {
    if (!programToComplete) return;
    try {
      setIsCompleting(true);
      const uploads = await Promise.all(
        form.imageUris.map((uri) =>
          uri.startsWith('http') ? Promise.resolve(uri) : uploadImageFromUri(uri, 'program-completions')
        )
      );
      const mergedGallery = Array.from(new Set([...(programToComplete.gallery ?? []), ...uploads]));
      await completeProgram(programToComplete.id, {
        participantCount: form.participantCount,
        leader: form.leader,
        managedBy: form.managedBy,
        notes: form.notes,
        gallery: mergedGallery,
      });
      handleCloseCompletion();
      await loadPrograms(true);
    } catch (err) {
      console.error('Program tamamlama hatası:', err);
      Alert.alert('Hata', 'Program tamamlanırken bir sorun oluştu.');
    } finally {
      setIsCompleting(false);
    }
  };


  const handleAddGalleryImage = async (program: Program) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
        Alert.alert('İzin gerekli', 'Galeriye erişim izni vermen gerekiyor.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as const,
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) return;

      const uris = result.assets.map((asset) => asset.uri).filter(Boolean);
      setGalleryUploadingId(program.id);
      const uploads = await Promise.all(uris.map((uri) => uploadImageFromUri(uri, 'program-gallery')));
      const nextGallery = Array.from(new Set([...(program.gallery ?? []), ...uploads]));
      await updateProgram(program.id, { gallery: nextGallery });
      setSelectedProgram((prev) => (prev && prev.id === program.id ? { ...prev, gallery: nextGallery } : prev));
      await loadPrograms(true);
    } catch (err) {
      console.error('Galeri güncelleme hatası:', err);
      Alert.alert('Hata', 'Görsel yüklenirken bir sorun oluştu.');
    } finally {
      setGalleryUploadingId(null);
    }
  };

  const handleRemoveGalleryImage = async (program: Program, imageUrl: string) => {
    try {
      Alert.alert(
        'Görseli Sil',
        'Bu görseli silmek istediğinize emin misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              const updatedGallery = (program.gallery ?? []).filter((img) => img !== imageUrl);
              setGalleryUploadingId(program.id);
              await updateProgram(program.id, { gallery: updatedGallery });
              setSelectedProgram((prev) => (prev && prev.id === program.id ? { ...prev, gallery: updatedGallery } : prev));
              await loadPrograms(true);
              setGalleryUploadingId(null);
            },
          },
        ]
      );
    } catch (err) {
      console.error('Görsel silme hatası:', err);
      Alert.alert('Hata', 'Görsel silinirken bir sorun oluştu.');
      setGalleryUploadingId(null);
    }
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.stateText, { color: theme.text }]}>Programlar yükleniyor...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateContainer}>
          <MaterialCommunityIcons name='alert-circle-outline' size={48} color={theme.error} />
          <Text style={[styles.stateText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={() => loadPrograms(true)}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} />}
      >
        <View style={styles.statsGrid}>
          {[
            { label: 'Toplam', value: stats.total, icon: 'calendar-check', color: theme.primary },
            { label: 'Yaklaşan', value: stats.upcoming, icon: 'calendar-arrow-right', color: theme.warning || '#F59E0B' },
            { label: 'Aktif', value: stats.active, icon: 'calendar-sync', color: theme.success || '#10B981' },
            { label: 'Tamamlandı', value: stats.completed, icon: 'calendar-check-outline', color: theme.textDim },
          ].map((item) => (
            <StatsCard key={item.label} {...item} theme={theme} />
          ))}
        </View>

        <View style={styles.list}>
          {filteredPrograms.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name='calendar-blank' size={56} color={theme.textDim} />
              <Text style={[styles.emptyText, { color: theme.textDim }]}>
                {filter === 'all' ? 'Henüz program eklenmemiş.' : 'Bu filtreye uygun program bulunamadı.'}
              </Text>
              {filter !== 'all' && (
                <TouchableOpacity style={[styles.emptyAction, { backgroundColor: `${theme.primary}15` }]} onPress={() => setFilter('all')}>
                  <Text style={[styles.emptyActionText, { color: theme.primary }]}>Filtreyi temizle</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} theme={theme} onPress={() => handleSelectProgram(program)} />
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name='arrow-left' size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Program Yönetimi</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]} 
            onPress={() => setFilterModalVisible(true)}
          >
            <MaterialCommunityIcons name='filter' size={18} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={handleOpenAddModal}>
            <MaterialCommunityIcons name='plus' size={22} color='#FFF' />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>{renderContent()}</View>

      {/* Modals */}
      <AddProgramModal
        visible={isAddModalVisible}
        onClose={handleCloseAddModal}
        onSave={handleSaveProgram}
        isLoading={isSaving}
        initialData={editingProgram}
      />

      <ProgramDetailModal
        visible={isDetailVisible}
        program={selectedProgram}
        onClose={handleCloseDetail}
        onEdit={handleRequestEdit}
        onComplete={handleStartCompletion}
        onDelete={handleRequestDelete}
        onAddImage={handleAddGalleryImage}
        onRemoveImage={handleRemoveGalleryImage}
        isGalleryUpdating={galleryUploadingId === selectedProgram?.id}
        palette={theme}
      />

      <CompleteProgramModal
        visible={isCompletionModalVisible}
        program={programToComplete}
        onClose={handleCloseCompletion}
        onSubmit={handleCompleteProgramSubmit}
        isSubmitting={isCompleting}
        palette={theme}
      />

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filterOptions={FILTER_OPTIONS}
        selectedFilter={filter}
        onFilterSelect={(filterKey) => {
          setFilter(filterKey);
          setFilterModalVisible(false);
        }}
        sortOptions={SORT_OPTIONS}
        selectedSort={sortOption}
        onSortSelect={(sortKey) => {
          setSortOption(sortKey);
        }}
        counts={counts}
        theme={theme}
      />
    </View>
  );
};

const FilterModal = ({
  visible,
  onClose,
  filterOptions,
  selectedFilter,
  onFilterSelect,
  sortOptions,
  selectedSort,
  onSortSelect,
  counts,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  filterOptions: { key: FilterKey; label: string }[];
  selectedFilter: FilterKey;
  onFilterSelect: (value: FilterKey) => void;
  sortOptions: { key: SortOption; label: string }[];
  selectedSort: SortOption;
  onSortSelect: (value: SortOption) => void;
  counts: Record<FilterKey, number>;
  theme: Theme;
}) => (
  <Modal visible={visible} animationType='fade' transparent onRequestClose={onClose}>
    <TouchableOpacity style={styles.sortModalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={[styles.sortModal, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
        <View style={styles.modalHeader}>
          <Text style={[styles.sortModalTitle, { color: theme.text }]}>Filtreler ve Sıralama</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name='close' size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalSection}>
          <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Filtreler</Text>
          {filterOptions.map((option) => {
            const isActive = option.key === selectedFilter;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterModalItem,
                  { backgroundColor: isActive ? `${theme.primary}15` : 'transparent' },
                ]}
                onPress={() => onFilterSelect(option.key)}
              >
                <View style={styles.filterModalItemContent}>
                  <Text style={[styles.filterModalItemText, { color: isActive ? theme.primary : theme.text }]}>
                    {option.label}
                  </Text>
                  <View style={[styles.filterModalBadge, { backgroundColor: isActive ? theme.primary : `${theme.text}20` }]}>
                    <Text style={[styles.filterModalBadgeText, { color: isActive ? '#FFF' : theme.text }]}>
                      {counts[option.key] ?? 0}
                    </Text>
                  </View>
                </View>
                {isActive && <MaterialCommunityIcons name='check' size={18} color={theme.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.modalSection}>
          <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Sıralama</Text>
          {sortOptions.map((option) => {
            const isActive = option.key === selectedSort;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterModalItem,
                  { backgroundColor: isActive ? `${theme.primary}15` : 'transparent' },
                ]}
                onPress={() => onSortSelect(option.key)}
              >
                <Text style={[styles.filterModalItemText, { color: isActive ? theme.primary : theme.text }]}>
                  {option.label}
                </Text>
                {isActive && <MaterialCommunityIcons name='check' size={18} color={theme.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

const ProgramCard = ({ program, theme, onPress }: { program: Program; theme: Theme; onPress: () => void }) => {
  const statusMeta = STATUS_META[program.status];
  const typeColor = getTypeColor(program.type, theme);
  const timingLabel = getProgramTimingLabel(program);

  // Cover image yoksa, gallery'den ilk görseli kullan
  const displayImage = program.coverImage || (program.gallery && program.gallery.length > 0 ? program.gallery[0] : null);

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface }]} onPress={onPress} activeOpacity={0.9}>
      {displayImage ? (
        <Image source={{ uri: displayImage }} style={styles.cardImage} contentFit='cover' />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: `${theme.primary}20` }]}>
          <MaterialCommunityIcons name={program.icon as any} size={28} color={theme.primary} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.chipRow}>
          <View style={[styles.chip, { borderColor: `${typeColor}40`, backgroundColor: `${typeColor}18` }]}>
            <MaterialCommunityIcons name='calendar' size={14} color={typeColor} />
            <Text style={[styles.chipText, { color: typeColor }]}>{TYPE_LABELS[program.type]}</Text>
          </View>
          <View style={[styles.chip, { 
            borderColor: statusMeta.color === theme.success ? 'rgba(16, 185, 129, 0.4)' : 
                        statusMeta.color === theme.warning ? 'rgba(245, 158, 11, 0.4)' : 
                        `${statusMeta.color}40`,
            backgroundColor: statusMeta.color === theme.success ? 'rgba(16, 185, 129, 0.25)' : 
                            statusMeta.color === theme.warning ? 'rgba(245, 158, 11, 0.25)' : 
                            `${statusMeta.color}18`
          }]}>
            <MaterialCommunityIcons name='progress-clock' size={14} color={statusMeta.color} />
            <Text style={[styles.chipText, { 
              color: statusMeta.color,
              fontWeight: statusMeta.color === theme.success ? '700' : '600'
            }]}>{statusMeta.label}</Text>
          </View>
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {program.program}
        </Text>
        {program.description ? (
          <Text style={[styles.cardDescription, { color: theme.textDim }]} numberOfLines={2}>
            {program.description}
          </Text>
        ) : null}
        {program.scheduleNote ? (
          <Text style={[styles.cardNote, { color: theme.textDim }]} numberOfLines={1}>
            {program.scheduleNote}
          </Text>
        ) : null}

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name='clock-outline' size={16} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.text }]} numberOfLines={1}>
            {timingLabel}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name='map-marker' size={16} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.text }]} numberOfLines={1}>
            {program.location || 'Belirtilmedi'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name='account' size={16} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.text }]} numberOfLines={1}>
            {program.responsible || 'Belirtilmedi'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.attendance, { backgroundColor: `${theme.primary}15` }]}>
            <MaterialCommunityIcons name='account-group' size={14} color={theme.primary} />
            <Text style={[styles.attendanceText, { color: theme.primary }]}>
              {program.lastAttendance ?? 0} kişi
            </Text>
          </View>
          <View style={styles.cardAction}>
            <Text style={[styles.cardActionText, { color: theme.primary }]}>Detay</Text>
            <MaterialCommunityIcons name='chevron-right' size={18} color={theme.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const StatsCard = ({
  label,
  value,
  icon,
  color,
  theme,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  theme: Theme;
}) => (
  <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
    <View style={[styles.statsIcon, { backgroundColor: `${color}18` }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
    </View>
    <View style={styles.statsContent}>
      <Text style={[styles.statsValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statsLabel, { color: theme.textDim }]}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 50,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTextGroup: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  statsCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  filterModalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterModalItemText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  filterModalBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterModalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: 16,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 16,
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 14,
  },
  cardNote: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  attendance: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  attendanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
  },
  emptyAction: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  emptyActionText: {
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  stateText: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sortModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  sortItemText: {
    fontSize: 15,
  },
});

const getTimeBucket = (program: Program): ProgramTimeFilter => {
  const now = Date.now();
  const start = program.startDate?.getTime?.() ?? 0;
  const end = program.endDate?.getTime?.();

  if (program.status === 'completed' || (end && end < now)) {
    return 'past';
  }
  if (start > now && program.status !== 'completed') {
    return 'upcoming';
  }
  return 'ongoing';
};

const getProgramTimingLabel = (program: Program) => {
  if (program.type === 'one_time') {
    if (program.occurrenceDateLabel) {
      return program.occurrenceDateLabel;
    }
    if (program.startDate) {
      return formatProgramDate(program.startDate);
    }
    return 'Tarih belirtilmedi';
  }
  if (program.type === 'monthly') {
    const dayOfMonth = program.dayOfMonth || (program.startDate ? program.startDate.getDate() : null);
    return `Her ay ${dayOfMonth || '?'}. gün • ${program.time || ''}`;
  }
  return `${program.day || 'Gün belirtilmedi'} • ${program.time || ''}`;
};

const formatProgramDate = (date: Date) =>
  new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const getTypeColor = (type: ProgramType, theme: Theme) => {
  switch (type) {
    case 'monthly':
      return theme.warning || '#F59E0B';
    case 'one_time':
      return theme.secondary || '#F472B6';
    default:
      return theme.primary;
  }
};

const filterPredicate = (program: Program, filterKey: FilterKey) => {
  if (filterKey === 'all') return true;
  if (filterKey === 'upcoming' || filterKey === 'past') {
    return getTimeBucket(program) === filterKey;
  }
  return program.type === filterKey;
};

const sortPrograms = (list: Program[], sortOption: SortOption) => {
  const sorted = [...list];
  const getTime = (program: Program) => program.startDate?.getTime?.() ?? 0;
  
  if (sortOption === 'nearest') {
    return sorted.sort((a, b) => getTime(a) - getTime(b));
  }
  if (sortOption === 'oldest') {
    return sorted.sort((a, b) => getTime(b) - getTime(a));
  }
  if (sortOption === 'category') {
    const order: Record<ProgramType, number> = { weekly: 0, monthly: 1, one_time: 2 };
    return sorted.sort((a, b) => order[a.type] - order[b.type] || getTime(a) - getTime(b));
  }
  const statusOrder: Record<Program['status'], number> = { ongoing: 0, planned: 1, completed: 2 };
  return sorted.sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status] || getTime(a) - getTime(b)
  );
};

export default ProgramsScreen;
