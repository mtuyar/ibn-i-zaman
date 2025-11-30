import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../../constants/Colors';
import { Program } from '../../types/program';

type Theme = typeof Colors.light;

const STATUS_LABELS = {
  planned: 'Yaklaşan',
  ongoing: 'Devam Ediyor',
  completed: 'Tamamlandı',
} as const;

const TYPE_LABELS = {
  weekly: 'Haftalık',
  monthly: 'Aylık',
  one_time: 'Tek Seferlik',
} as const;

interface ProgramDetailModalProps {
  visible: boolean;
  program: Program | null;
  onClose: () => void;
  onEdit: (program: Program) => void;
  onComplete: (program: Program) => void;
  onDelete: (program: Program) => void;
  onAddImage: (program: Program) => void;
  onRemoveImage?: (program: Program, imageUrl: string) => void;
  isGalleryUpdating?: boolean;
  palette: Theme;
}

const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({
  visible,
  program,
  onClose,
  onEdit,
  onComplete,
  onDelete,
  onAddImage,
  onRemoveImage,
  isGalleryUpdating = false,
  palette,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);

  if (!program) {
    return null;
  }

  const gallery = program.gallery ?? [];

  const statusColor = (() => {
    switch (program.status) {
      case 'completed':
        return palette.textDim;
      case 'ongoing':
        return palette.success || '#10B981';
      default:
        return palette.warning || '#F59E0B';
    }
  })();

  const getTimingLabel = () => {
    if (program.type === 'one_time') {
      return program.occurrenceDateLabel;
    }
    if (program.type === 'monthly') {
      return `Her ay ${program.dayOfMonth || program.startDate.getDate()}. gün - ${program.time ?? ''}`;
    }
    return `${program.day || 'Gün belirtilmedi'} - ${program.time || ''}`;
  };

  const completedDetails = program.completedDetails;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
              {program.program}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={palette.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.coverWrapper}>
              {program.coverImage || (gallery.length > 0 && gallery[0]) ? (
                <Image 
                  source={{ uri: program.coverImage || gallery[0] }} 
                  style={styles.coverImage} 
                  contentFit="cover" 
                />
              ) : (
                <View style={[styles.coverPlaceholder, { backgroundColor: `${palette.primary}15` }]}>
                  <MaterialCommunityIcons name={program.icon as any} size={40} color={palette.primary} />
                </View>
              )}
              <View style={styles.coverBadges}>
                <View style={[styles.badge, { backgroundColor: `${palette.primary}20` }]}>
                  <MaterialCommunityIcons name="calendar" size={14} color={palette.primary} />
                  <Text style={[styles.badgeText, { color: palette.primary }]}>{TYPE_LABELS[program.type]}</Text>
                </View>
                <View style={[styles.badge, { 
                  backgroundColor: statusColor === palette.success ? 'rgba(16, 185, 129, 0.95)' : 
                                  statusColor === palette.warning ? 'rgba(245, 158, 11, 0.95)' : 
                                  statusColor === palette.textDim ? 'rgba(107, 114, 128, 0.95)' :
                                  `${palette.primary}95`
                }]}>
                  <MaterialCommunityIcons name="progress-clock" size={14} color="#FFF" />
                  <Text style={[styles.badgeText, { color: '#FFF', fontWeight: '700' }]}>{STATUS_LABELS[program.status]}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <InfoRow
                icon="clock-outline"
                label="Zaman"
                value={getTimingLabel() || 'Belirtilmedi'}
                palette={palette}
              />
              <InfoRow icon="map-marker" label="Konum" value={program.location || 'Belirtilmedi'} palette={palette} />
              <InfoRow
                icon="account"
                label="Sorumlu"
                value={program.responsible || 'Belirtilmedi'}
                palette={palette}
              />
              <InfoRow
                icon="account-group"
                label="Son Katılım"
                value={`${program.lastAttendance ?? 0} kişi`}
                palette={palette}
              />
            </View>

            {program.description ? (
              <View style={[styles.sectionCard, { backgroundColor: `${palette.primary}08` }]}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Açıklama</Text>
                <Text style={[styles.sectionText, { color: palette.text }]}>{program.description}</Text>
              </View>
            ) : null}

            {program.scheduleNote ? (
              <View style={[styles.sectionCard, { backgroundColor: `${palette.secondary}10` }]}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Program Notu</Text>
                <Text style={[styles.sectionText, { color: palette.text }]}>{program.scheduleNote}</Text>
              </View>
            ) : null}

            {completedDetails ? (
              <View style={[styles.sectionCard, { backgroundColor: `${palette.success || '#10B981'}15` }]}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Tamamlama Özeti</Text>
                <InfoRow
                  icon="check-circle"
                  label="Katılımcı"
                  value={`${completedDetails.participantCount} kişi`}
                  palette={palette}
                />
                {completedDetails.leader ? (
                  <InfoRow
                    icon="account-star"
                    label="Yöneten"
                    value={completedDetails.leader}
                    palette={palette}
                  />
                ) : null}
                {completedDetails.notes ? (
                  <Text style={[styles.sectionText, { color: palette.text }]}>{completedDetails.notes}</Text>
                ) : null}
              </View>
            ) : null}

            {gallery.length > 0 ? (
              <View style={styles.gallerySection}>
                <View style={styles.galleryHeader}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Galeri</Text>
                  {isGalleryUpdating && <ActivityIndicator size="small" color={palette.primary} />}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                  {gallery.map((image, index) => (
                    <View key={`${image}-${index}`} style={styles.galleryImageWrapper}>
                      <TouchableOpacity
                        onPress={() => setSelectedImageIndex(index)}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{ uri: image }}
                          style={styles.galleryImage}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                      {onRemoveImage && (
                        <TouchableOpacity
                          style={styles.galleryRemoveButton}
                          onPress={() => {
                            if (program) {
                              onRemoveImage(program, image);
                            }
                          }}
                        >
                          <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${palette.primary}18` }]}
              onPress={() => onEdit(program)}
            >
              <MaterialCommunityIcons name="pencil" size={18} color={palette.primary} />
              <Text style={[styles.actionText, { color: palette.primary }]}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: `${palette.success || '#10B981'}18` },
                program.status === 'completed' && styles.disabledButton,
              ]}
              onPress={() => onComplete(program)}
              disabled={program.status === 'completed'}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={18}
                color={palette.success || '#10B981'}
              />
              <Text style={[styles.actionText, { color: palette.success || '#10B981' }]}>Programı Tamamla</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${palette.primary}18` }]}
              onPress={() => onAddImage(program)}
            >
              {isGalleryUpdating ? (
                <ActivityIndicator size="small" color={palette.primary} />
              ) : (
                <MaterialCommunityIcons name="image-plus" size={18} color={palette.primary} />
              )}
              <Text style={[styles.actionText, { color: palette.primary }]}>Görsel Ekle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${palette.error}18` }]}
              onPress={() => onDelete(program)}
            >
              <MaterialCommunityIcons name="delete" size={18} color={palette.error} />
              <Text style={[styles.actionText, { color: palette.error }]}>Sil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tam ekran görsel görüntüleyici */}
      {selectedImageIndex !== null && gallery[selectedImageIndex] && (
        <Modal
          visible={selectedImageIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImageIndex(null)}
        >
          <View style={styles.fullImageContainer}>
            <TouchableOpacity
              style={styles.fullImageCloseButton}
              onPress={() => setSelectedImageIndex(null)}
            >
              <MaterialCommunityIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: gallery[selectedImageIndex] }}
              style={styles.fullImage}
              contentFit="contain"
            />
            {gallery.length > 1 && (
              <View style={styles.imageNavigation}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : gallery.length - 1)}
                  disabled={gallery.length <= 1}
                >
                  <MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.imageCounter}>
                  {selectedImageIndex + 1} / {gallery.length}
                </Text>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setSelectedImageIndex(selectedImageIndex < gallery.length - 1 ? selectedImageIndex + 1 : 0)}
                  disabled={gallery.length <= 1}
                >
                  <MaterialCommunityIcons name="chevron-right" size={32} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
  palette,
}: {
  icon: string;
  label: string;
  value: string;
  palette: Theme;
}) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIcon, { backgroundColor: `${palette.primary}12` }]}>
      <MaterialCommunityIcons name={icon as any} size={16} color={palette.primary} />
    </View>
    <View style={styles.infoTexts}>
      <Text style={[styles.infoLabel, { color: palette.textDim }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: palette.text }]}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: -4 },
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  coverWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  coverPlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverBadges: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  gallerySection: {
    gap: 12,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryScroll: {
    flexGrow: 0,
  },
  galleryImageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  galleryImage: {
    width: 120,
    height: 90,
    borderRadius: 12,
  },
  galleryRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  fullImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  fullImageCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNavigation: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default ProgramDetailModal;

