import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
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
import { Program } from '../services/ProgramService';

// Available days
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

// Available icons
const ICONS = [
  'book-open-variant', 'forum', 'account-group', 'heart', 'mosque', 'school', 
  'teach', 'calendar-check', 'coffee', 'leaf', 'music-note', 'brush', 
  'basketball', 'football', 'food-apple', 'dumbbell', 'bike', 'run', 
  'camera', 'palette', 'chess-knight', 'gamepad-variant', 'theater', 'tea', 'video'
];

const { height, width } = Dimensions.get('window');

interface AddProgramModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (programData: Omit<Program, 'id' | 'createdAt'>) => Promise<void>;
  initialData?: Partial<Program>;
  isLoading?: boolean;
}

const DEFAULT_FORM_DATA = {
  program: '',
  day: 'Pazartesi',
  time: '',
  icon: 'book-open-variant',
  location: '',
  responsible: '',
  lastAttendance: '0',
  description: ''
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
  
  // Reset form when modal visibility changes
  React.useEffect(() => {
    if (visible) {
      if (initialData) {
        // Düzenleme modu - mevcut verileri yükle
        setFormData({
          program: initialData.program || '',
          day: initialData.day || 'Pazartesi',
          time: initialData.time || '',
          icon: initialData.icon || 'book-open-variant',
          location: initialData.location || '',
          responsible: initialData.responsible || '',
          lastAttendance: initialData.lastAttendance?.toString() || '0',
          description: initialData.description || ''
        });
      } else {
        // Ekleme modu - formu sıfırla
        setFormData(DEFAULT_FORM_DATA);
      }
      setCurrentStep(1); // Her açılışta ilk adıma dön
      setErrors({}); // Hataları temizle
    }
  }, [visible, initialData]);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // UI state
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
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
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.program.trim()) {
      newErrors.program = 'Program adı gereklidir';
    }
    
    if (!formData.time.trim()) {
      newErrors.time = 'Saat gereklidir';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Konum gereklidir';
    }
    
    if (!formData.responsible.trim()) {
      newErrors.responsible = 'Sorumlu kişi gereklidir';
    }
    
    if (!formData.lastAttendance?.toString().trim()) {
      newErrors.lastAttendance = 'Son katılım sayısı gereklidir';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Açıklama gereklidir';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle input change
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;
    
    const programData = {
      ...formData,
      lastAttendance: parseInt(formData.lastAttendance) || 0,
      isActive: true
    };
    
    await onSave(programData);
  };

  // Render step 1 content
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
        {renderIconPicker()}
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
});

export default AddProgramModal;