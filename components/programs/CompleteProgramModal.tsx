import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../../constants/Colors';
import { Program } from '../../types/program';

type Theme = typeof Colors.light;

export interface CompletionFormResult {
  participantCount: number;
  leader?: string;
  managedBy?: string;
  notes?: string;
  imageUris: string[];
}

interface CompleteProgramModalProps {
  visible: boolean;
  program: Program | null;
  onClose: () => void;
  onSubmit: (payload: CompletionFormResult) => Promise<void>;
  isSubmitting?: boolean;
  palette: Theme;
}

const CompleteProgramModal: React.FC<CompleteProgramModalProps> = ({
  visible,
  program,
  onClose,
  onSubmit,
  isSubmitting = false,
  palette,
}) => {
  const [participantCount, setParticipantCount] = useState('');
  const [leader, setLeader] = useState('');
  const [managedBy, setManagedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ participantCount?: string }>({});

  useEffect(() => {
    if (visible) {
      setParticipantCount(
        program?.completedDetails?.participantCount?.toString() ??
          program?.lastAttendance?.toString() ??
          '',
      );
      setLeader(program?.completedDetails?.leader || program?.responsible || '');
      setManagedBy(program?.completedDetails?.managedBy || program?.responsible || '');
      setNotes(program?.completedDetails?.notes || '');
      setImageUris([]);
      setErrors({});
    }
  }, [visible, program]);

  const handleAddImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
        Alert.alert('İzin gerekli', 'Galeriye erişim olmadan görsel ekleyemezsiniz.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as const,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUris((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Tamamlama görseli seçme hatası:', error);
      Alert.alert('Hata', 'Görsel seçilirken bir sorun oluştu.');
    }
  };

  const handleRemoveImage = (uri: string) => {
    setImageUris((prev) => prev.filter((item) => item !== uri));
  };

  const validate = () => {
    if (!participantCount.trim()) {
      setErrors({ participantCount: 'Katılımcı sayısı gerekli' });
      return false;
    }
    if (Number.isNaN(Number(participantCount))) {
      setErrors({ participantCount: 'Geçerli bir sayı girin' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit({
      participantCount: Number(participantCount),
      leader: leader.trim() || undefined,
      managedBy: managedBy.trim() || undefined,
      notes: notes.trim() || undefined,
      imageUris,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: palette.surface }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: palette.text }]}>Programı Tamamla</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={22} color={palette.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.form}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.label, { color: palette.text }]}>Katılımcı Sayısı</Text>
              <View style={[styles.inputWrapper, { backgroundColor: palette.background }]}>
                <MaterialCommunityIcons name="account-group" size={20} color={palette.primary} />
                <TextInput
                  value={participantCount}
                  onChangeText={setParticipantCount}
                  keyboardType="numeric"
                  placeholder="Örn: 40"
                  placeholderTextColor={palette.textDim}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>
              {errors.participantCount && (
                <Text style={styles.errorText}>{errors.participantCount}</Text>
              )}

              <Text style={[styles.label, { color: palette.text }]}>Programı Kim Yönetti?</Text>
              <View style={[styles.inputWrapper, { backgroundColor: palette.background }]}>
                <MaterialCommunityIcons name="account-star" size={20} color={palette.primary} />
                <TextInput
                  value={leader}
                  onChangeText={setLeader}
                  placeholder="İsim soyisim"
                  placeholderTextColor={palette.textDim}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <Text style={[styles.label, { color: palette.text }]}>Saha Sorumlusu</Text>
              <View style={[styles.inputWrapper, { backgroundColor: palette.background }]}>
                <MaterialCommunityIcons name="account" size={20} color={palette.primary} />
                <TextInput
                  value={managedBy}
                  onChangeText={setManagedBy}
                  placeholder="İsim soyisim"
                  placeholderTextColor={palette.textDim}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <Text style={[styles.label, { color: palette.text }]}>Notlar</Text>
              <View style={[styles.textAreaWrapper, { backgroundColor: palette.background }]}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Programdan dikkat çekenler, rapor notları..."
                  placeholderTextColor={palette.textDim}
                  multiline
                  numberOfLines={4}
                  style={[styles.textArea, { color: palette.text }]}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.gallerySection}>
                <View style={styles.galleryHeader}>
                  <Text style={[styles.label, { color: palette.text, marginBottom: 0 }]}>
                    Ek Görseller
                  </Text>
                  <TouchableOpacity
                    style={[styles.addImageButton, { borderColor: palette.primary }]}
                    onPress={handleAddImage}
                  >
                    <MaterialCommunityIcons name="image-plus" size={18} color={palette.primary} />
                    <Text style={[styles.addImageText, { color: palette.primary }]}>Ekle</Text>
                  </TouchableOpacity>
                </View>
                {imageUris.length === 0 ? (
                  <Text style={[styles.placeholder, { color: palette.textDim }]}>
                    Henüz görsel seçilmedi.
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {imageUris.map((uri) => (
                      <View key={uri} style={styles.previewWrapper}>
                        <Image source={{ uri }} style={styles.previewImage} contentFit="cover" />
                        <TouchableOpacity
                          style={styles.removeImage}
                          onPress={() => handleRemoveImage(uri)}
                        >
                          <MaterialCommunityIcons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </ScrollView>
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: `${palette.text}15` }]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={[styles.footerButtonText, { color: palette.text }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: palette.primary }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.footerButtonText, { color: '#FFF' }]}>Tamamla</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    paddingBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginLeft: 12,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginBottom: 8,
  },
  textAreaWrapper: {
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
  },
  textArea: {
    height: 100,
    fontSize: 15,
  },
  gallerySection: {
    marginTop: 16,
    gap: 8,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addImageButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addImageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  placeholder: {
    fontSize: 13,
  },
  previewWrapper: {
    width: 96,
    height: 72,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  footerButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CompleteProgramModal;

