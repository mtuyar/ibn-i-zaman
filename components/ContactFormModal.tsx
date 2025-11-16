import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useColorScheme,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Contact, ContactFormData } from '../types/contact';

interface ContactFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => Promise<void>;
  contact?: Contact | null;
  mode: 'add' | 'edit';
}

export default function ContactFormModal({
  visible,
  onClose,
  onSave,
  contact,
  mode,
}: ContactFormModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [formData, setFormData] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    age: '',
    profession: '',
    notes: '',
    email: '',
    address: '',
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (mode === 'edit' && contact) {
        setFormData({
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          age: contact.age?.toString() || '',
          profession: contact.profession || '',
          notes: contact.notes || '',
          email: contact.email || '',
          address: contact.address || '',
          tags: contact.tags || [],
        });
      } else {
        resetForm();
      }
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, mode, contact]);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      age: '',
      profession: '',
      notes: '',
      email: '',
      address: '',
      tags: [],
    });
    setErrors({});
    setTagInput('');
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad zorunludur';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad zorunludur';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon zorunludur';
    } else if (!/^[0-9+\s()-]+$/.test(formData.phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    if (formData.age && isNaN(Number(formData.age))) {
      newErrors.age = 'Geçerli bir yaş giriniz';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Kişi kaydedilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || [],
    });
  };

  const updateField = (field: keyof ContactFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Animated.View style={[styles.modalContent, { backgroundColor: theme.background, opacity: fadeAnim }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons 
                  name={mode === 'add' ? 'person-add' : 'person'} 
                  size={24} 
                  color={theme.primary} 
                />
              </View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {mode === 'add' ? 'Yeni Kişi Ekle' : 'Kişiyi Düzenle'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView 
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Ad ve Soyad */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Ad <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.firstName ? theme.error : theme.border }]}>
                  <Ionicons name="person-outline" size={20} color={theme.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={formData.firstName}
                    onChangeText={(text) => updateField('firstName', text)}
                    placeholder="Ad"
                    placeholderTextColor={theme.placeholder}
                  />
                </View>
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>

              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Soyad <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.lastName ? theme.error : theme.border }]}>
                  <Ionicons name="person-outline" size={20} color={theme.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={formData.lastName}
                    onChangeText={(text) => updateField('lastName', text)}
                    placeholder="Soyad"
                    placeholderTextColor={theme.placeholder}
                  />
                </View>
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>
            </View>

            {/* Telefon */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Telefon <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.phone ? theme.error : theme.border }]}>
                <Ionicons name="call-outline" size={20} color={theme.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.phone}
                  onChangeText={(text) => updateField('phone', text)}
                  placeholder="+90 555 123 45 67"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* E-posta */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>E-posta</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.email ? theme.error : theme.border }]}>
                <Ionicons name="mail-outline" size={20} color={theme.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.email}
                  onChangeText={(text) => updateField('email', text)}
                  placeholder="ornek@email.com"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Yaş ve Meslek */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: theme.text }]}>Yaş</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.age ? theme.error : theme.border }]}>
                  <Ionicons name="calendar-outline" size={20} color={theme.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={formData.age}
                    onChangeText={(text) => updateField('age', text)}
                    placeholder="Yaş"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="number-pad"
                  />
                </View>
                {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
              </View>

              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: theme.text }]}>Meslek</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="briefcase-outline" size={20} color={theme.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={formData.profession}
                    onChangeText={(text) => updateField('profession', text)}
                    placeholder="Meslek"
                    placeholderTextColor={theme.placeholder}
                  />
                </View>
              </View>
            </View>

            {/* Adres */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Adres</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="location-outline" size={20} color={theme.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.address}
                  onChangeText={(text) => updateField('address', text)}
                  placeholder="Adres"
                  placeholderTextColor={theme.placeholder}
                  multiline
                />
              </View>
            </View>

            {/* Etiketler */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Etiketler</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="pricetag-outline" size={20} color={theme.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="Etiket ekle ve enter'a bas"
                  placeholderTextColor={theme.placeholder}
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={handleAddTag} style={styles.addTagButton}>
                  <Ionicons name="add-circle" size={24} color={theme.primary} />
                </TouchableOpacity>
              </View>
              {formData.tags && formData.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {formData.tags.map((tag, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.tagText, { color: theme.primary }]}>{tag}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                        <Ionicons name="close-circle" size={18} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Notlar */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Notlar / Açıklama</Text>
              <View style={[styles.textAreaContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="document-text-outline" size={20} color={theme.textDim} style={styles.textAreaIcon} />
                <TextInput
                  style={[styles.textArea, { color: theme.text }]}
                  value={formData.notes}
                  onChangeText={(text) => updateField('notes', text)}
                  placeholder="Kişi hakkında notlar..."
                  placeholderTextColor={theme.placeholder}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textDim }]}>İptal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.saveButtonText}>Kaydediliyor...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {mode === 'add' ? 'Kaydet' : 'Güncelle'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfInput: {
    flex: 1,
    marginRight: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  textAreaContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
  textAreaIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  textArea: {
    flex: 1,
    fontSize: 15,
    minHeight: 80,
  },
  addTagButton: {
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});



