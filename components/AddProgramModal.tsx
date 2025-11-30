import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import Colors from '../constants/Colors';
import { Program, ProgramInput, ProgramStatus, ProgramType } from '../types/program';

// Available days
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

// Available icons
const ICONS = [
  'book-open-variant', 'forum', 'account-group', 'heart', 'mosque', 'school',
  'human-male-board', 'calendar-check', 'coffee', 'leaf', 'music-note', 'brush',
  'basketball', 'football', 'food-apple', 'dumbbell', 'bike', 'run',
  'camera', 'palette', 'chess-knight', 'gamepad-variant', 'theater', 'tea', 'video'
];

const { height, width } = Dimensions.get('window');

const PROGRAM_TYPE_OPTIONS: { key: ProgramType; label: string }[] = [
  { key: 'weekly', label: 'Haftalık' },
  { key: 'monthly', label: 'Aylık' },
  { key: 'one_time', label: 'Tek Seferlik' },
];

const STATUS_OPTIONS: { key: ProgramStatus; label: string }[] = [
  { key: 'planned', label: 'Planlandı' },
  { key: 'ongoing', label: 'Devam Ediyor' },
  { key: 'completed', label: 'Tamamlandı' },
];

const MONTHLY_PATTERN_OPTIONS = [
  { key: 'day_of_month', label: 'Ayın Günü' },
  { key: 'weekday', label: 'Haftanın Günü' },
] as const;

const WEEKDAY_OCCURRENCES = [
  { key: 'first', label: '1.' },
  { key: 'second', label: '2.' },
  { key: 'third', label: '3.' },
  { key: 'fourth', label: '4.' },
  { key: 'last', label: 'Son' },
] as const;

const WEEKDAY_OPTIONS = [
  { key: '1', label: 'Pazartesi' },
  { key: '2', label: 'Salı' },
  { key: '3', label: 'Çarşamba' },
  { key: '4', label: 'Perşembe' },
  { key: '5', label: 'Cuma' },
  { key: '6', label: 'Cumartesi' },
  { key: '0', label: 'Pazar' },
] as const;

const DAY_NAME_TO_INDEX: Record<string, number> = {
  Pazar: 0,
  Pazartesi: 1,
  Salı: 2,
  Çarşamba: 3,
  Perşembe: 4,
  Cuma: 5,
  Cumartesi: 6,
};

const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: 'Pazar',
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
  6: 'Cumartesi',
};

const formatOneTimeLabel = (date: Date) =>
  new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const applyTimeToDate = (baseDate: Date, time: string) => {
  const [hours = '0', minutes = '0'] = time.split(':');
  const date = new Date(baseDate);
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10) || 0, 0, 0);
  return date;
};

const getNextWeeklyDate = (day: string, time: string) => {
  const target = DAY_NAME_TO_INDEX[day] ?? 1;
  const now = new Date();
  const date = new Date(now);
  const diff = (target + 7 - now.getDay()) % 7;
  date.setDate(now.getDate() + diff);
  return applyTimeToDate(date, time || '20:00');
};

const getNextMonthlyDate = (dayOfMonth: number, time: string) => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (date < now) {
    date.setMonth(date.getMonth() + 1);
  }
  return applyTimeToDate(date, time || '20:00');
};

const getNthWeekdayOfMonth = (year: number, month: number, weekday: number, occurrence: string) => {
  if (occurrence === 'last') {
    const lastDay = new Date(year, month + 1, 0);
    const diff = (lastDay.getDay() - weekday + 7) % 7;
    lastDay.setDate(lastDay.getDate() - diff);
    return lastDay;
  }
  const occurrenceIndex = ['first', 'second', 'third', 'fourth'].indexOf(occurrence);
  const firstDay = new Date(year, month, 1);
  const firstWeekdayOffset = (weekday - firstDay.getDay() + 7) % 7;
  const date = firstDay.getDate() + firstWeekdayOffset + occurrenceIndex * 7;
  return new Date(year, month, date);
};

const getNextMonthlyWeekdayDate = (
  occurrence: 'first' | 'second' | 'third' | 'fourth' | 'last',
  weekday: number,
  time: string
) => {
  const now = new Date();
  let candidate = getNthWeekdayOfMonth(now.getFullYear(), now.getMonth(), weekday, occurrence);
  if (candidate < now) {
    candidate = getNthWeekdayOfMonth(now.getFullYear(), now.getMonth() + 1, weekday, occurrence);
  }
  return applyTimeToDate(candidate, time || '20:00');
};

interface AddProgramModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (programData: ProgramInput, media?: { coverImageUri?: string | null }) => Promise<void>;
  initialData?: Program | null;
  isLoading?: boolean;
}

const DEFAULT_FORM_DATA = {
  program: '',
  type: 'weekly' as ProgramType,
  status: 'planned' as ProgramStatus,
  day: 'Pazartesi',
  dayOfMonth: '1',
  monthlyPattern: 'day_of_month',
  monthlyWeekday: '0',
  monthlyWeekdayOccurrence: 'first',
  time: '',
  icon: 'book-open-variant',
  location: '',
  responsible: '',
  lastAttendance: '0',
  description: '',
  scheduleNote: '',
};

const AddProgramModal: React.FC<AddProgramModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  isLoading = false
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(height));
  
  // Form state
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [oneTimeDate, setOneTimeDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  // Reset form when modal visibility changes
  React.useEffect(() => {
    if (!visible) {
      return;
    }

    if (initialData) {
      setFormData({
        program: initialData.program || '',
        type: initialData.type || 'weekly',
        status: initialData.status || 'planned',
        day: initialData.day || 'Pazartesi',
        dayOfMonth: initialData.dayOfMonth?.toString() || '1',
        time: initialData.time || '',
        icon: initialData.icon || 'book-open-variant',
        location: initialData.location || '',
        responsible: initialData.responsible || '',
        lastAttendance: initialData.lastAttendance?.toString() || '0',
        description: initialData.description || '',
        monthlyPattern: initialData.monthlyPattern || 'day_of_month',
        monthlyWeekday: (initialData.monthlyWeekday ?? 0).toString(),
        monthlyWeekdayOccurrence: initialData.monthlyWeekdayOccurrence || 'first',
        scheduleNote: initialData.scheduleNote || '',
      });
      if (initialData.startDate) {
        setOneTimeDate(initialData.startDate);
      }
      setCoverImage(initialData.coverImage || initialData.gallery?.[0] || null);
    } else {
      setFormData(DEFAULT_FORM_DATA);
      setOneTimeDate(new Date());
      setCoverImage(null);
    }

    setCurrentStep(1);
    setErrors({});
  }, [visible, initialData]);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // UI state
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
const [showMonthlyPatternPicker, setShowMonthlyPatternPicker] = useState(false);
const [showWeekdayPicker, setShowWeekdayPicker] = useState(false);
const [showWeekdayOccurrencePicker, setShowWeekdayOccurrencePicker] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Animate modal
  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [visible]);
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.program.trim()) {
      newErrors.program = 'Program adı gereklidir';
    }
    if (formData.type !== 'one_time' && !formData.time.trim()) {
      newErrors.time = 'Saat gereklidir';
    }
    if (formData.type === 'monthly') {
      if (formData.monthlyPattern === 'day_of_month') {
        const dayValue = parseInt(formData.dayOfMonth, 10);
        if (!formData.dayOfMonth.trim()) {
          newErrors.dayOfMonth = 'Ayın günü gereklidir';
        } else if (Number.isNaN(dayValue) || dayValue < 1 || dayValue > 31) {
          newErrors.dayOfMonth = 'Geçerli bir gün (1-31) girin';
        }
      } else {
        if (!formData.monthlyWeekdayOccurrence) {
          newErrors.monthlyWeekdayOccurrence = 'Hafta seçimi gerekli';
        }
        if (formData.monthlyWeekday === undefined || formData.monthlyWeekday === null) {
          newErrors.monthlyWeekday = 'Gün seçimi gerekli';
        }
      }
    }
    if (formData.type === 'one_time' && !oneTimeDate) {
      newErrors.oneTimeDate = 'Tarih seçimi gereklidir';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Konum gereklidir';
    }
    if (!formData.responsible.trim()) {
      newErrors.responsible = 'Sorumlu kişi gereklidir';
    }
    if (!formData.lastAttendance?.toString().trim()) {
      newErrors.lastAttendance = 'Son katılım sayısı gereklidir';
    } else if (Number.isNaN(Number(formData.lastAttendance))) {
      newErrors.lastAttendance = 'Sadece sayı giriniz';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Açıklama gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleTypeChange = (type: ProgramType) => {
    handleChange('type', type);
  };

  const handleStatusChange = (status: ProgramStatus) => {
    handleChange('status', status);
  };

  const openDatePicker = (mode: 'date' | 'time') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const handleDatePickerChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setOneTimeDate((prev) => {
        if (datePickerMode === 'date') {
          return new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            prev.getHours(),
            prev.getMinutes()
          );
        }
        return new Date(
          prev.getFullYear(),
          prev.getMonth(),
          prev.getDate(),
          selectedDate.getHours(),
          selectedDate.getMinutes()
        );
      });
      if (errors.oneTimeDate) {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.oneTimeDate;
          return updated;
        });
      }
    }
  };

  const handlePickCoverImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
        Alert.alert('İzin gerekli', 'Görsel seçmek için galeri iznine ihtiyacımız var.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as const,
        quality: 0.75,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Kapak görseli seçme hatası:', error);
      Alert.alert('Hata', 'Görsel seçilirken bir sorun oluştu.');
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage(null);
  };

  const buildScheduleDate = () => {
    if (formData.type === 'one_time') {
      return oneTimeDate;
    }

    if (formData.type === 'monthly') {
    if (formData.monthlyPattern === 'weekday') {
      const weekday = parseInt(formData.monthlyWeekday || '0', 10) || 0;
      const occurrence = (formData.monthlyWeekdayOccurrence || 'first') as 'first' | 'second' | 'third' | 'fourth' | 'last';
      return getNextMonthlyWeekdayDate(occurrence, weekday, formData.time);
    }
    const dayValue = parseInt(formData.dayOfMonth, 10) || 1;
    return getNextMonthlyDate(dayValue, formData.time);
    }

    return getNextWeeklyDate(formData.day, formData.time);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const startDate = buildScheduleDate();
    const lastAttendance = parseInt(formData.lastAttendance, 10) || 0;
    const monthlyPattern = formData.type === 'monthly' ? (formData.monthlyPattern as 'day_of_month' | 'weekday') : null;
    const monthlyWeekday =
      formData.type === 'monthly' && monthlyPattern === 'weekday'
        ? parseInt(formData.monthlyWeekday || '0', 10)
        : null;
    const monthlyWeekdayOccurrence =
      formData.type === 'monthly' && monthlyPattern === 'weekday'
        ? (formData.monthlyWeekdayOccurrence as 'first' | 'second' | 'third' | 'fourth' | 'last')
        : null;

    const payload: ProgramInput = {
      program: formData.program.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      icon: formData.icon,
      type: formData.type,
      day: formData.type === 'weekly' ? formData.day : undefined,
      dayOfMonth: formData.type === 'monthly' ? parseInt(formData.dayOfMonth, 10) || 1 : undefined,
      monthlyPattern,
      monthlyWeekday,
      monthlyWeekdayOccurrence,
      time:
        formData.type === 'one_time'
          ? new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(startDate)
          : formData.time,
      responsible: formData.responsible.trim(),
      lastAttendance,
      recurrence:
        formData.type === 'weekly'
          ? { frequency: 'weekly', daysOfWeek: [DAY_NAME_TO_INDEX[formData.day] ?? 0] }
          : formData.type === 'monthly'
            ? monthlyPattern === 'weekday'
              ? { frequency: 'monthly', daysOfWeek: monthlyWeekday !== null ? [monthlyWeekday] : undefined }
              : { frequency: 'monthly', dayOfMonth: parseInt(formData.dayOfMonth, 10) || 1 }
            : null,
      scheduleNote: formData.scheduleNote.trim(),
      isActive: formData.status !== 'completed',
      status: formData.status,
      startDate,
      endDate: formData.type === 'one_time' ? startDate : undefined,
    };

    await onSave(payload, { coverImageUri: coverImage });
  };

  const renderOneTimeControls = () => (
    <View style={styles.formGroup}>
      <Text style={[styles.label, { color: theme.text }]}>Etkinlik Tarihi & Saati</Text>
      <View style={styles.dateTimeRow}>
        <TouchableOpacity
          style={[styles.dateTimeButton, { backgroundColor: theme.surface }]}
          onPress={() => openDatePicker('date')}
        >
          <MaterialCommunityIcons name="calendar" size={18} color={theme.primary} />
          <Text style={[styles.dateTimeButtonText, { color: theme.text }]}>
            {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(oneTimeDate)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateTimeButton, { backgroundColor: theme.surface }]}
          onPress={() => openDatePicker('time')}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color={theme.primary} />
          <Text style={[styles.dateTimeButtonText, { color: theme.text }]}>
            {new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(oneTimeDate)}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.dateTimeHint, { color: theme.textDim }]}>{formatOneTimeLabel(oneTimeDate)}</Text>
      {errors.oneTimeDate && <Text style={styles.errorText}>{errors.oneTimeDate}</Text>}
    </View>
  );

  const renderCoverImageSection = () => (
    <View style={styles.formGroup}>
      <Text style={[styles.label, { color: theme.text }]}>Kapak Görseli</Text>
      {coverImage ? (
        <>
          <Image source={{ uri: coverImage }} style={styles.coverPreview} contentFit="cover" />
          <View style={styles.coverActions}>
            <TouchableOpacity
              style={[styles.coverActionButton, { backgroundColor: `${theme.primary}15` }]}
              onPress={handlePickCoverImage}
            >
              <MaterialCommunityIcons name="image-edit" size={18} color={theme.primary} />
              <Text style={[styles.coverActionText, { color: theme.primary }]}>Değiştir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.coverActionButton, { backgroundColor: `${theme.error}12` }]}
              onPress={handleRemoveCoverImage}
            >
              <MaterialCommunityIcons name="delete" size={18} color={theme.error} />
              <Text style={[styles.coverActionText, { color: theme.error }]}>Kaldır</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.coverPlaceholder, { borderColor: theme.border }]}
          onPress={handlePickCoverImage}
        >
          <MaterialCommunityIcons name="image-plus" size={26} color={theme.primary} />
          <Text style={[styles.coverPlaceholderText, { color: theme.textDim }]}>
            Program için görsel ekle
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Program Adı</Text>
        <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
          <MaterialCommunityIcons name="format-title" size={20} color={theme.primary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Program adını girin"
            placeholderTextColor={theme.textDim}
            value={formData.program}
            onChangeText={(text) => handleChange('program', text)}
          />
        </View>
        {errors.program && <Text style={styles.errorText}>{errors.program}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Program Türü</Text>
        <View style={styles.chipGroup}>
          {PROGRAM_TYPE_OPTIONS.map((option) => {
            const isActive = formData.type === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? `${theme.primary}1A` : theme.surface,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleTypeChange(option.key)}
              >
                <Text style={[styles.chipText, { color: isActive ? theme.primary : theme.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {formData.type === 'monthly' && (
        <>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Tekrar Şekli</Text>
            <View style={styles.chipGroup}>
              {MONTHLY_PATTERN_OPTIONS.map((option) => {
                const isActive = formData.monthlyPattern === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? `${theme.primary}1A` : theme.surface,
                        borderColor: isActive ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => handleChange('monthlyPattern', option.key)}
                  >
                    <Text style={[styles.chipText, { color: isActive ? theme.primary : theme.text }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {formData.monthlyPattern === 'day_of_month' && (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Ayın Günü</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
                <MaterialCommunityIcons name="calendar-star" size={20} color={theme.primary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="15"
                  placeholderTextColor={theme.textDim}
                  value={formData.dayOfMonth}
                  onChangeText={(text) => handleChange('dayOfMonth', text)}
                  keyboardType="numeric"
                />
              </View>
              {errors.dayOfMonth && <Text style={styles.errorText}>{errors.dayOfMonth}</Text>}
            </View>
          )}

          {formData.monthlyPattern === 'weekday' && (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Hafta / Gün</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.dateTimeButton, { backgroundColor: theme.surface }]}
                  onPress={() => setShowWeekdayOccurrencePicker(true)}
                >
                  <MaterialCommunityIcons name="counter" size={18} color={theme.primary} />
                  <Text style={[styles.dateTimeButtonText, { color: theme.text }]}>
                    {
                      WEEKDAY_OCCURRENCES.find((opt) => opt.key === formData.monthlyWeekdayOccurrence)
                        ?.label
                    }
                    . Hafta
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateTimeButton, { backgroundColor: theme.surface }]}
                  onPress={() => setShowWeekdayPicker(true)}
                >
                  <MaterialCommunityIcons name="calendar-week" size={18} color={theme.primary} />
                  <Text style={[styles.dateTimeButtonText, { color: theme.text }]}>
                    {
                      WEEKDAY_OPTIONS.find((opt) => opt.key === formData.monthlyWeekday)
                        ?.label
                    }
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.monthlyWeekdayOccurrence && <Text style={styles.errorText}>{errors.monthlyWeekdayOccurrence}</Text>}
              {errors.monthlyWeekday && <Text style={styles.errorText}>{errors.monthlyWeekday}</Text>}
            </View>
          )}
        </>
      )}

      {formData.type === 'weekly' && (
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Gün</Text>
          <TouchableOpacity
            style={[styles.inputWrapper, { backgroundColor: theme.surface }]}
            onPress={() => setShowDayPicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={20} color={theme.primary} />
            <Text style={[styles.selectedText, { color: theme.text }]}>{formData.day}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textDim} />
          </TouchableOpacity>
        </View>
      )}

      {formData.type !== 'one_time' && (
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Saat</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={theme.primary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="14:00"
              placeholderTextColor={theme.textDim}
              value={formData.time}
              onChangeText={(text) => handleChange('time', text)}
            />
          </View>
          {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
        </View>
      )}

      {formData.type === 'one_time' && renderOneTimeControls()}

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>İkon</Text>
        <TouchableOpacity
          style={[styles.inputWrapper, { backgroundColor: theme.surface }]}
          onPress={() => setShowIconPicker(true)}
        >
          <MaterialCommunityIcons name={formData.icon as any} size={20} color={theme.primary} />
          <Text style={[styles.selectedText, { color: theme.text }]}>İkon seçin</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textDim} />
        </TouchableOpacity>
      </View>

      {renderCoverImageSection()}
    </View>
  );

  // Render step 2 content
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Konum</Text>
        <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
          <MaterialCommunityIcons name="map-marker" size={20} color={theme.primary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Konumu girin"
            placeholderTextColor={theme.textDim}
            value={formData.location}
            onChangeText={(text) => handleChange('location', text)}
          />
        </View>
        {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Sorumlu Kişi</Text>
        <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
          <MaterialCommunityIcons name="account" size={20} color={theme.primary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Sorumlu kişiyi girin"
            placeholderTextColor={theme.textDim}
            value={formData.responsible}
            onChangeText={(text) => handleChange('responsible', text)}
          />
        </View>
        {errors.responsible && <Text style={styles.errorText}>{errors.responsible}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Son Katılım</Text>
        <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
          <MaterialCommunityIcons name="account-group" size={20} color={theme.primary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Son katılım sayısını girin"
            placeholderTextColor={theme.textDim}
            value={formData.lastAttendance}
            onChangeText={(text) => handleChange('lastAttendance', text)}
            keyboardType="numeric"
          />
        </View>
        {errors.lastAttendance && <Text style={styles.errorText}>{errors.lastAttendance}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Açıklama</Text>
        <View style={[styles.textAreaWrapper, { backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.textArea, { color: theme.text }]}
            placeholder="Program açıklamasını girin"
            placeholderTextColor={theme.textDim}
            value={formData.description}
            onChangeText={(text) => handleChange('description', text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Program Notu (opsiyonel)</Text>
        <View style={[styles.textAreaWrapper, { backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.textArea, { color: theme.text }]}
            placeholder="Örn: Kasım ayında son Pazar yapılacak"
            placeholderTextColor={theme.textDim}
            value={formData.scheduleNote}
            onChangeText={(text) => handleChange('scheduleNote', text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Durum</Text>
        <View style={styles.chipGroup}>
          {STATUS_OPTIONS.map((option) => {
            const isActive = formData.status === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? `${theme.primary}1A` : theme.surface,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleStatusChange(option.key)}
              >
                <Text style={[styles.chipText, { color: isActive ? theme.primary : theme.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  // Render day picker modal
  const renderDayPicker = () => (
    <Modal
      visible={showDayPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDayPicker(false)}
    >
      <View style={styles.pickerModalOverlay}>
        <View style={[styles.pickerContent, { backgroundColor: theme.surface }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Gün Seçin</Text>
            <TouchableOpacity onPress={() => setShowDayPicker(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.dayList}>
            {DAYS.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayItem,
                  formData.day === day && { backgroundColor: `${theme.primary}15` }
                ]}
                onPress={() => {
                  handleChange('day', day);
                  setShowDayPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.dayItemText,
                    { color: formData.day === day ? theme.primary : theme.text }
                  ]}
                >
                  {day}
                </Text>
                {formData.day === day && (
                  <MaterialCommunityIcons name="check" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderWeekdayPicker = () => (
    <Modal
      visible={showWeekdayPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowWeekdayPicker(false)}
    >
      <View style={styles.pickerModalOverlay}>
        <View style={[styles.pickerContent, { backgroundColor: theme.surface }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Gün Seçin</Text>
            <TouchableOpacity onPress={() => setShowWeekdayPicker(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          {WEEKDAY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.dayItem,
                formData.monthlyWeekday === option.key && { backgroundColor: `${theme.primary}15` },
              ]}
              onPress={() => {
                handleChange('monthlyWeekday', option.key);
                setShowWeekdayPicker(false);
              }}
            >
              <Text
                style={[
                  styles.dayItemText,
                  { color: formData.monthlyWeekday === option.key ? theme.primary : theme.text },
                ]}
              >
                {option.label}
              </Text>
              {formData.monthlyWeekday === option.key && (
                <MaterialCommunityIcons name="check" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  const renderWeekdayOccurrencePicker = () => (
    <Modal
      visible={showWeekdayOccurrencePicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowWeekdayOccurrencePicker(false)}
    >
      <View style={styles.pickerModalOverlay}>
        <View style={[styles.pickerContent, { backgroundColor: theme.surface }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Hafta Seçin</Text>
            <TouchableOpacity onPress={() => setShowWeekdayOccurrencePicker(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          {WEEKDAY_OCCURRENCES.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.dayItem,
                formData.monthlyWeekdayOccurrence === option.key && { backgroundColor: `${theme.primary}15` },
              ]}
              onPress={() => {
                handleChange('monthlyWeekdayOccurrence', option.key);
                setShowWeekdayOccurrencePicker(false);
              }}
            >
              <Text
                style={[
                  styles.dayItemText,
                  { color: formData.monthlyWeekdayOccurrence === option.key ? theme.primary : theme.text },
                ]}
              >
                {option.label}. Hafta
              </Text>
              {formData.monthlyWeekdayOccurrence === option.key && (
                <MaterialCommunityIcons name="check" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  // Render icon picker modal
  const renderIconPicker = () => (
    <Modal
      visible={showIconPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowIconPicker(false)}
    >
      <View style={styles.pickerModalOverlay}>
        <View style={[styles.pickerContent, { backgroundColor: theme.surface }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>İkon Seçin</Text>
            <TouchableOpacity onPress={() => setShowIconPicker(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.iconScrollView}>
            <View style={styles.iconGrid}>
              {ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconItem,
                    formData.icon === icon && { backgroundColor: `${theme.primary}15` }
                  ]}
                  onPress={() => {
                    handleChange('icon', icon);
                    setShowIconPicker(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={24}
                    color={formData.icon === icon ? theme.primary : theme.text}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderDatePickerModal = () => {
    if (!showDatePicker) {
      return null;
    }

    if (Platform.OS === 'ios') {
      return (
        <Modal transparent animationType="fade">
          <View style={styles.datePickerModalOverlay}>
            <View style={[styles.datePickerContent, { backgroundColor: theme.surface }]}>
              <DateTimePicker
                value={oneTimeDate}
                mode={datePickerMode}
                display="spinner"
                onChange={handleDatePickerChange}
              />
              <TouchableOpacity
                style={[styles.datePickerAction, { backgroundColor: theme.primary }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.datePickerActionText, { color: '#FFF' }]}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <DateTimePicker
        value={oneTimeDate}
        mode={datePickerMode}
        display="default"
        onChange={handleDatePickerChange}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.background,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }]}>
                {initialData ? 'Programı Düzenle' : 'Yeni Program'}
              </Text>
              <View style={styles.headerRight} />
            </View>

            <View style={[styles.progressBar, { borderBottomColor: theme.border }]}>
              <View style={[styles.progressTrack, { backgroundColor: `${theme.text}20` }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.primary,
                      width: currentStep === 1 ? '50%' : '100%'
                    }
                  ]}
                />
              </View>
              <View style={styles.steps}>
                <View style={styles.step}>
                  <View
                    style={[
                      styles.stepCircle,
                      { backgroundColor: theme.primary }
                    ]}
                  >
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.text }]}>
                    Temel Bilgiler
                  </Text>
                </View>
                <View style={styles.step}>
                  <View
                    style={[
                      styles.stepCircle,
                      {
                        backgroundColor:
                          currentStep >= 2 ? theme.primary : theme.border
                      }
                    ]}
                  >
                    <Text style={styles.stepNumber}>2</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.text }]}>
                    Detaylar
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.contentContainer}>
              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {currentStep === 1 ? renderStep1() : renderStep2()}
              </ScrollView>
            </View>

            <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { backgroundColor: `${theme.text}10` }]}
                onPress={currentStep === 1 ? onClose : () => setCurrentStep(1)}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>
                  {currentStep === 1 ? 'İptal' : 'Geri'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={currentStep === 1 ? () => setCurrentStep(2) : handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.buttonText, { color: '#FFF' }]}>
                    {currentStep === 1 ? 'İleri' : 'Kaydet'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        {renderDayPicker()}
        {renderWeekdayPicker()}
        {renderWeekdayOccurrencePicker()}
        {renderIconPicker()}
        {renderDatePickerModal()}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    height: '63%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    flexDirection: 'column',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  progressBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  step: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    fontSize: 14,
  },
  stepContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  selectedText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  textAreaWrapper: {
    padding: 16,
    borderRadius: 12,
  },
  textArea: {
    height: 100,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  coverPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  coverActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  coverActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  coverActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  coverPlaceholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverPlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dayList: {
    padding: 8,
  },
  dayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
  },
  dayItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  iconScrollView: {
    maxHeight: 400,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  iconItem: {
    width: '20%', // 5 ikon yan yana
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    margin: '2%',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  dateTimeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateTimeHint: {
    marginTop: 8,
    fontSize: 13,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  datePickerContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  datePickerAction: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  datePickerActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddProgramModal;