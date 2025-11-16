import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { AnnouncementCriticality } from '../types/announcement';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export interface AnnouncementFormValues {
  title: string;
  body: string;
  scheduleAt: Date;
  criticality: AnnouncementCriticality;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}

interface AnnouncementFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const { width: windowWidth } = Dimensions.get('window');

const REMINDER_OPTIONS = [15, 30, 60, 120, 240, 1440];

const INITIAL_VALUES: AnnouncementFormValues = {
  title: '',
  body: '',
  scheduleAt: new Date(),
  criticality: 'normal',
  reminderEnabled: true,
  reminderMinutesBefore: 60,
};

export default function AnnouncementFormModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: AnnouncementFormModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [values, setValues] = useState<AnnouncementFormValues>(INITIAL_VALUES);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [pickerDraft, setPickerDraft] = useState<Date>(new Date());
  const { width } = Dimensions.get('window');

  const isValid = useMemo(() => {
    return values.title.trim().length > 0 && values.body.trim().length > 10;
  }, [values.body, values.title]);

  const resetForm = () => {
    setValues({ ...INITIAL_VALUES, scheduleAt: new Date() });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const openPicker = (mode: 'date' | 'time') => {
    setPickerDraft(values.scheduleAt);
    setPickerMode(mode);
  };

  const handlePickerChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setPickerDraft(selectedDate);
    }
  };

  const handlePickerConfirm = () => {
    if (!pickerMode) return;
    setValues((prev) => {
      const next = new Date(prev.scheduleAt);
      if (pickerMode === 'date') {
        next.setFullYear(
          pickerDraft.getFullYear(),
          pickerDraft.getMonth(),
          pickerDraft.getDate()
        );
      }
      if (pickerMode === 'time') {
        next.setHours(pickerDraft.getHours(), pickerDraft.getMinutes(), 0, 0);
      }
      return { ...prev, scheduleAt: next };
    });
    setPickerMode(null);
  };

  const handlePickerCancel = () => {
    setPickerMode(null);
  };

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Eksik Bilgi', 'Lütfen başlık ve açıklama alanlarını doldurun.');
      return;
    }
    await onSubmit(values);
    resetForm();
  };

  const formatScheduleDate = () => {
    return format(values.scheduleAt, "d MMMM yyyy '•' HH:mm", { locale: tr });
  };

  const renderReminderOptions = () => {
    return (
      <View style={styles.reminderChipsContainer}>
        {REMINDER_OPTIONS.map((option) => {
          const isSelected = values.reminderMinutesBefore === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.reminderChip,
                {
                  backgroundColor: isSelected ? theme.primary : `${theme.primary}15`,
                  borderColor: isSelected ? theme.primary : 'transparent',
                },
              ]}
              onPress={() =>
                setValues((prev) => ({ ...prev, reminderMinutesBefore: option }))
              }
            >
              <Text
                style={[
                  styles.reminderChipLabel,
                  { color: isSelected ? '#FFFFFF' : theme.primary },
                ]}
              >
                {option >= 60
                  ? option % 60 === 0
                    ? `${option / 60} saat`
                    : `${Math.floor(option / 60)}s ${option % 60}dk`
                  : `${option} dk`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card }]}
        >
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Yeni Duyuru</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textDim }]}>Başlık</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
                placeholder="Duyuru başlığı"
                placeholderTextColor={theme.placeholder}
                value={values.title}
                onChangeText={(text) => setValues((prev) => ({ ...prev, title: text }))}
                maxLength={120}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textDim }]}>İçerik</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.card, color: theme.text }]}
                placeholder="Duyuru detaylarını yazın"
                placeholderTextColor={theme.placeholder}
                value={values.body}
                onChangeText={(text) => setValues((prev) => ({ ...prev, body: text }))}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textDim }]}>Planlanan Tarih</Text>
              <TouchableOpacity
                style={[styles.scheduleButton, { backgroundColor: theme.card }]}
                onPress={() => openPicker('date')}
              >
                <Text style={[styles.scheduleButtonText, { color: theme.text }]}>Tarih Seç</Text>
                <Text style={[styles.scheduleValue, { color: theme.textDim }]}>
                  {format(values.scheduleAt, 'd MMMM yyyy', { locale: tr })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scheduleButton, { backgroundColor: theme.card }]}
                onPress={() => openPicker('time')}
              >
                <Text style={[styles.scheduleButtonText, { color: theme.text }]}>Saat Seç</Text>
                <Text style={[styles.scheduleValue, { color: theme.textDim }]}>
                  {format(values.scheduleAt, 'HH:mm', { locale: tr })}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.scheduleSummary, { color: theme.secondary }]}>
                {formatScheduleDate()}
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textDim }]}>Kritiklik</Text>
              <View style={styles.segmentControl}>
                {(['normal', 'urgent'] as AnnouncementCriticality[]).map((option) => {
                  const isSelected = values.criticality === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.segmentButton,
                        {
                          backgroundColor: isSelected ? theme.primary : `${theme.primary}15`,
                          borderColor: isSelected ? theme.primary : 'transparent',
                        },
                      ]}
                      onPress={() => setValues((prev) => ({ ...prev, criticality: option }))}
                    >
                      <Text
                        style={[
                          styles.segmentLabel,
                          { color: isSelected ? '#FFFFFF' : theme.primary },
                        ]}
                      >
                        {option === 'urgent' ? 'Acil' : 'Normal'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {values.criticality === 'urgent' && (
                <Text style={[styles.helperText, { color: theme.error }]}>Acil duyurular tüm ekibe anlık bildirim gönderir.</Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.label, { color: theme.textDim }]}>Planlanan Hatırlatma</Text>
                  <Text style={[styles.helperText, { color: theme.textDim }]}>Duyuru saatinden önce ekip üyelerini uyar.</Text>
                </View>
                <Switch
                  value={values.reminderEnabled}
                  onValueChange={(enabled) =>
                    setValues((prev) => ({ ...prev, reminderEnabled: enabled }))
                  }
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={values.reminderEnabled ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>

              {values.reminderEnabled && (
                <View style={styles.reminderOptionsContainer}>
                  <Text style={[styles.helperText, { color: theme.textDim }]}>Hatırlatma zamanı</Text>
                  {renderReminderOptions()}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: `${theme.border}99` }]}>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: isValid ? theme.primary : theme.border }]}
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              <Text style={styles.submitButtonLabel}>
                {isSubmitting ? 'Kaydediliyor...' : 'Duyuruyu Paylaş'}
              </Text>
            </TouchableOpacity>
          </View>

          {pickerMode && (
            <Modal transparent animationType="fade">
              <View style={styles.pickerOverlay}>
                <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}
                >
                  <Text style={[styles.pickerTitle, { color: theme.text }]}>
                    {pickerMode === 'date' ? 'Tarih Seçin' : 'Saat Seçin'}
                  </Text>
                  <DateTimePicker
                    value={pickerDraft}
                    mode={pickerMode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handlePickerChange}
                    locale="tr-TR"
                  />
                  <View style={styles.pickerActions}>
                    <TouchableOpacity onPress={handlePickerCancel}>
                      <Text style={[styles.pickerActionText, { color: theme.textDim }]}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePickerConfirm}>
                      <Text style={[styles.pickerActionText, { color: theme.primary }]}>Kaydet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: Math.min(windowWidth * 0.92, 520),
    maxHeight: '88%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    maxHeight: '72%',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 20,
  },
  fieldGroup: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    minHeight: 160,
  },
  scheduleButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  scheduleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '500',
  },
  scheduleSummary: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentControl: {
    flexDirection: 'row',
    gap: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderOptionsContainer: {
    marginTop: 12,
    gap: 12,
  },
  reminderChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reminderChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  reminderChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerContainer: {
    width: '100%',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 24,
  },
  pickerActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});


