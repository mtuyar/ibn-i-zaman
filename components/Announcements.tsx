import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { createAnnouncement } from '../services/AnnouncementService';
import { AnnouncementRecord } from '../types/announcement';
import AnnouncementFormModal, { AnnouncementFormValues } from './AnnouncementFormModal';

const { width } = Dimensions.get('window');

type PaletteKey = AnnouncementRecord['criticality'];

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}

function formatFutureTime(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);
  if (minutes <= 0) return 'Başlamak üzere';
  if (minutes < 60) return `${minutes} dk sonra`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat sonra`;
  const days = Math.round(hours / 24);
  return `${days} gün sonra`;
}

function getIcon(criticality: AnnouncementRecord['criticality']) {
  return criticality === 'urgent' ? 'alert-circle' : 'bell';
}

function getCardIcon(criticality: AnnouncementRecord['criticality']) {
  return criticality === 'urgent' ? 'alert-circle' : 'bullhorn';
}

export default function Announcements() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { announcements, urgentAnnouncements, scheduledAnnouncements, isLoading, refresh, error } =
    useAnnouncements();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const { user, isAdmin } = useAuth();

  const palette = useMemo<Record<PaletteKey, string>>(
    () => ({
      urgent: theme.error,
      normal: theme.primary,
    }),
    [theme.error, theme.primary]
  );

  const handleCreateAnnouncement = async (values: AnnouncementFormValues) => {
    if (!user) return;
    try {
      setIsSubmitting(true);
      await createAnnouncement(
        {
          title: values.title.trim(),
          body: values.body.trim(),
          scheduleAt: values.scheduleAt,
          criticality: values.criticality,
          reminderMinutesBefore: values.reminderEnabled ? values.reminderMinutesBefore : undefined,
          status: values.scheduleAt.getTime() > Date.now() ? 'scheduled' : 'published',
        },
        {
          id: user.uid,
          name: user.displayName ?? user.email ?? 'Bilinmeyen',
        }
      );
      setIsFormVisible(false);
      await refresh();
    } catch (err) {
      console.error('Duyuru oluşturma hatası', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAnnouncementCard = (announcement: AnnouncementRecord, index: number) => {
    const icon = getIcon(announcement.criticality);
    const tint = palette[announcement.criticality];
    const gradientColors = colorScheme === 'dark' ? theme.cardGradient : [`${tint}22`, `${tint}08`];
    const now = Date.now();
    const isFuture = announcement.scheduleAt.getTime() > now;
    const timeLabel =
      announcement.status === 'scheduled'
        ? format(announcement.scheduleAt, "d MMM HH:mm", { locale: tr })
        : isFuture
          ? formatFutureTime(announcement.scheduleAt)
          : formatRelativeTime(announcement.scheduleAt);

    const cardPlatformStyle = Platform.OS === 'ios' ? styles.cardShadowIOS : styles.cardAndroidBase;
    const androidBorderStyle =
      Platform.OS === 'android'
        ? { borderColor: `${theme.border}99` }
        : null;

    return (
      <TouchableOpacity
        key={announcement.id}
        style={[
          styles.card,
          cardPlatformStyle,
          {
            backgroundColor: colorScheme === 'dark' ? theme.surface : theme.card,
          },
          androidBorderStyle,
          index === 0 ? { marginLeft: width * 0.04 } : {},
        ]}
        onPress={() => {
          setSelectedAnnouncement(announcement);
          setIsDetailVisible(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${announcement.title}, ${timeLabel}`}
      >
        <LinearGradient colors={gradientColors} style={styles.cardInner}>
          <View style={[styles.iconContainer, { backgroundColor: `${tint}18` }]}
          >
            <MaterialCommunityIcons name={icon} size={24} color={tint} />
          </View>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
              {announcement.title}
            </Text>
            <View
              style={[styles.criticalityBadge, { backgroundColor: `${tint}22`, borderColor: tint }]}
            >
              <MaterialCommunityIcons name={icon} size={14} color={tint} />
              <Text style={[styles.criticalityLabel, { color: tint }]}>
                {announcement.criticality === 'urgent' ? 'Acil' : 'Normal'}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardDescription, { color: theme.textDim }]} numberOfLines={3}>
            {announcement.body}
          </Text>
          <Text style={[styles.cardTime, { color: theme.subtitle }]}>{timeLabel}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Duyurular</Text>
          <Text style={[styles.subtitle, { color: theme.secondary }]}>
            {isLoading ? 'Yükleniyor...' : `${announcements.length} aktif duyuru`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={refresh}
            style={[styles.iconButton, { backgroundColor: `${theme.primary}12` }]}
            accessibilityRole="button"
            accessibilityLabel="Duyuruları yenile"
          >
            <MaterialCommunityIcons name="refresh" size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsModalVisible(true)}
            style={[styles.viewAllButton, { backgroundColor: `${theme.primary}15` }]}
          >
            <Text style={[styles.viewAllText, { color: theme.primary }]}>Tümünü Gör</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: `${theme.error}12` }]}
        >
          <MaterialCommunityIcons name="alert" size={16} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      {urgentAnnouncements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={theme.error} />
            <Text style={[styles.sectionTitle, { color: theme.error }]}>Acil Duyurular</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
          >
            {urgentAnnouncements.map(renderAnnouncementCard)}
          </ScrollView>
        </View>
      )}

      {announcements.length > urgentAnnouncements.length && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bullhorn" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Normal Duyurular</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
          >
            {announcements
              .filter((item) => item.criticality !== 'urgent')
              .map(renderAnnouncementCard)}
          </ScrollView>
        </View>
      )}

      {scheduledAnnouncements.length > 0 && (
        <View style={styles.scheduledSection}>
          <View style={styles.scheduledHeader}>
            <MaterialCommunityIcons name="clock" size={18} color={theme.secondary} />
            <Text style={[styles.scheduledTitle, { color: theme.secondary }]}>Yaklaşan</Text>
          </View>
          {scheduledAnnouncements.map((announcement) => {
            const tint = palette[announcement.criticality];
            return (
              <View
                key={announcement.id}
                style={[
                  styles.scheduledItem,
                  {
                    borderColor: `${theme.border}AA`,
                    backgroundColor: colorScheme === 'dark' ? theme.surface : theme.card,
                  },
                ]}
              >
                <View
                  style={[
                    styles.scheduledIndicator,
                    { backgroundColor: announcement.criticality === 'urgent' ? theme.error : theme.primary },
                  ]}
                />
                <View style={styles.scheduledContent}>
                  <Text style={[styles.scheduledTitleText, { color: theme.text }]} numberOfLines={1}>
                    {announcement.title}
                  </Text>
                  <Text style={[styles.scheduledBodyText, { color: theme.textDim }]} numberOfLines={2}>
                    {announcement.body}
                  </Text>
                  <View style={styles.scheduledMetaRow}>
                    <View style={[styles.criticalityBadge, { backgroundColor: `${tint}22`, borderColor: tint }]}
                    >
                      <MaterialCommunityIcons name={getIcon(announcement.criticality)} size={12} color={tint} />
                      <Text style={[styles.criticalityLabel, { color: tint }]}>
                        {announcement.criticality === 'urgent' ? 'Acil' : 'Normal'}
                      </Text>
                    </View>
                    <Text style={[styles.scheduledTime, { color: theme.secondary }]}>
                      {format(announcement.scheduleAt, "d MMM HH:mm", { locale: tr })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {isAdmin && (
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: theme.primary }]}
          onPress={() => setIsFormVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Tüm Duyurular</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {urgentAnnouncements.length > 0 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color={theme.error} />
                    <Text style={[styles.modalSectionTitle, { color: theme.error }]}>Acil Duyurular</Text>
                  </View>
                  {urgentAnnouncements.map((announcement) => (
                    <View key={announcement.id} style={[styles.modalItem, { borderBottomColor: theme.border }]}
                    >
                      <View style={styles.modalItemContent}>
                        <Text style={[styles.modalItemTitle, { color: theme.text }]}>
                          {announcement.title}
                        </Text>
                        <Text style={[styles.modalItemDescription, { color: theme.textDim }]}
                        >
                          {announcement.body}
                        </Text>
                        <Text style={[styles.modalItemTime, { color: theme.subtitle }]}>
                          {formatRelativeTime(announcement.scheduleAt)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {announcements.length > urgentAnnouncements.length && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <MaterialCommunityIcons name="alert" size={20} color={theme.warning} />
                    <Text style={[styles.modalSectionTitle, { color: theme.warning }]}>Diğerleri</Text>
                  </View>
                  {announcements
                    .filter((announcement) => announcement.criticality !== 'urgent')
                    .map((announcement) => (
                      <View key={announcement.id} style={[styles.modalItem, { borderBottomColor: theme.border }]}
                      >
                        <View style={styles.modalItemContent}>
                          <Text style={[styles.modalItemTitle, { color: theme.text }]}>
                            {announcement.title}
                          </Text>
                          <Text style={[styles.modalItemDescription, { color: theme.textDim }]}
                          >
                            {announcement.body}
                          </Text>
                          <Text style={[styles.modalItemTime, { color: theme.subtitle }]}>
                            {formatRelativeTime(announcement.scheduleAt)}
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AnnouncementFormModal
        visible={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        onSubmit={handleCreateAnnouncement}
        isSubmitting={isSubmitting}
      />

      <Modal
        visible={isDetailVisible && !!selectedAnnouncement}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDetailVisible(false)}
      >
        <View style={styles.detailOverlay}>
          {selectedAnnouncement && (
            <View style={[styles.detailCard, { backgroundColor: theme.card }]}
            >
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleBlock}>
                  <Text style={[styles.detailTitle, { color: theme.text }]}>
                    {selectedAnnouncement.title}
                  </Text>
                  <View style={[styles.detailBadge, { backgroundColor: `${palette[selectedAnnouncement.criticality]}1A`, borderColor: palette[selectedAnnouncement.criticality] }]}
                  >
                    <MaterialCommunityIcons
                      name={getCardIcon(selectedAnnouncement.criticality)}
                      size={14}
                      color={palette[selectedAnnouncement.criticality]}
                    />
                    <Text style={[styles.detailBadgeText, { color: palette[selectedAnnouncement.criticality] }]}>
                      {selectedAnnouncement.criticality === 'urgent' ? 'Acil' : 'Normal'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.detailCloseButton}
                  onPress={() => setIsDetailVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailMetaRow}>
                <MaterialCommunityIcons name="calendar" size={18} color={theme.secondary} />
                <Text style={[styles.detailMetaText, { color: theme.secondary }]}>
                  {format(selectedAnnouncement.scheduleAt, "d MMMM yyyy • HH:mm", { locale: tr })}
                </Text>
              </View>

              <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
                <Text style={[styles.detailContent, { color: theme.text }]}>
                  {selectedAnnouncement.body}
                </Text>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: width * 0.05,
  },
  titleContainer: {
    flex: 1,
    paddingLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 14 : 12,
    marginTop: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  viewAllText: {
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: width * 0.05,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    paddingLeft: width * 0.05,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingRight: width * 0.04,
    paddingBottom: Platform.OS === 'android' ? 8 : 0,
  },
  card: {
    width: width * 0.75,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
  },
  cardShadowIOS: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardAndroidBase: {
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  cardInner: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  criticalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  criticalityLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    lineHeight: 20,
  },
  cardTime: {
    fontSize: Platform.OS === 'ios' ? 12 : 11,
  },
  scheduledSection: {
    marginTop: 16,
    paddingHorizontal: width * 0.05,
    gap: 12,
  },
  scheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduledTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduledItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  scheduledIndicator: {
    width: 4,
    borderRadius: 4,
  },
  scheduledContent: {
    flex: 1,
    gap: 6,
  },
  scheduledTitleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scheduledBodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  scheduledMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scheduledTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  modalSectionTitle: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: '600',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalItemContent: {
    gap: 8,
  },
  modalItemTitle: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: '600',
  },
  modalItemDescription: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    lineHeight: 20,
  },
  modalItemTime: {
    fontSize: Platform.OS === 'ios' ? 12 : 11,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailCard: {
    width: Math.min(width * 0.92, 520),
    maxHeight: '85%',
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailTitleBlock: {
    flex: 1,
    gap: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailMetaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailBody: {
    maxHeight: '65%',
  },
  detailContent: {
    fontSize: 15,
    lineHeight: 22,
  },
});
