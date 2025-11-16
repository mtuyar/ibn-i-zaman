import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Linking,
  Platform,
  StatusBar,
  Animated,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Contact } from '../../types/contact';
import ContactService from '../../services/ContactService';
import ContactFormModal from '../../components/ContactFormModal';
import Colors from '../../constants/Colors';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ContactDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const scrollY = new Animated.Value(0);

  useEffect(() => {
    if (id) {
      loadContact();
    }
  }, [id]);

  const loadContact = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const fetchedContact = await ContactService.getContactById(id);
      setContact(fetchedContact);
    } catch (error) {
      console.error('Kişi yüklenemedi:', error);
      Alert.alert('Hata', 'Kişi bilgileri yüklenirken bir hata oluştu.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditContact = async (contactData: any) => {
    if (!id) return;

    try {
      await ContactService.updateContact(id, {
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        phone: contactData.phone,
        age: contactData.age ? parseInt(contactData.age) : undefined,
        profession: contactData.profession,
        notes: contactData.notes,
        email: contactData.email,
        address: contactData.address,
        tags: contactData.tags,
      });

      await loadContact();
      Alert.alert('Başarılı', 'Kişi bilgileri güncellendi!');
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteContact = () => {
    Alert.alert(
      'Kişiyi Sil',
      'Bu kişiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id) {
                await ContactService.deleteContact(id);
                Alert.alert('Başarılı', 'Kişi silindi.');
                router.back();
              }
            } catch (error) {
              Alert.alert('Hata', 'Kişi silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleCall = async () => {
    if (!contact) return;

    try {
      await ContactService.updateLastContactedAt(contact.id);
      const phoneUrl = `tel:${contact.phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Hata', 'Telefon uygulaması açılamadı.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Arama başlatılamadı.');
    }
  };

  const handleSMS = async () => {
    if (!contact) return;

    try {
      await ContactService.updateLastContactedAt(contact.id);
      const smsUrl = Platform.OS === 'ios' 
        ? `sms:${contact.phone}`
        : `sms:${contact.phone}`;
      
      const canOpen = await Linking.canOpenURL(smsUrl);
      
      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert('Hata', 'Mesaj uygulaması açılamadı.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Mesaj gönderilemedi.');
    }
  };

  const handleWhatsApp = async () => {
    if (!contact) return;

    try {
      await ContactService.updateLastContactedAt(contact.id);
      const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
      const whatsappUrl = `whatsapp://send?phone=${cleanPhone}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('WhatsApp Bulunamadı', 'Lütfen WhatsApp uygulamasını yükleyin.');
      }
    } catch (error) {
      Alert.alert('Hata', 'WhatsApp açılamadı.');
    }
  };

  const handleEmail = async () => {
    if (!contact?.email) return;

    try {
      const emailUrl = `mailto:${contact.email}`;
      const canOpen = await Linking.canOpenURL(emailUrl);
      
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert('Hata', 'E-posta uygulaması açılamadı.');
      }
    } catch (error) {
      Alert.alert('Hata', 'E-posta gönderilemedi.');
    }
  };

  const handleShare = async () => {
    if (!contact) return;

    try {
      const message = `
📇 Kişi Bilgileri
━━━━━━━━━━━━━━
👤 ${contact.firstName} ${contact.lastName}
📱 ${contact.phone}
${contact.email ? `📧 ${contact.email}` : ''}
${contact.profession ? `💼 ${contact.profession}` : ''}
${contact.age ? `🎂 ${contact.age} yaşında` : ''}
${contact.address ? `📍 ${contact.address}` : ''}
${contact.notes ? `📝 ${contact.notes}` : ''}
      `.trim();

      await Share.share({
        message,
        title: 'Kişi Bilgileri',
      });
    } catch (error) {
      console.error('Paylaşım hatası:', error);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#6C5CE7', '#A29BFE', '#FD79A8'
    ];
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textDim }]}>
            Yükleniyor...
          </Text>
        </View>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textDim }]}>
            Kişi bulunamadı
          </Text>
        </View>
      </View>
    );
  }

  const avatarColor = getRandomColor(contact.id);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header with Gradient */}
      <LinearGradient
        colors={[avatarColor, avatarColor + 'CC']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="create-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar and Name */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {getInitials(contact.firstName, contact.lastName)}
            </Text>
          </View>
          <Text style={styles.nameText}>
            {contact.firstName} {contact.lastName}
          </Text>
          {contact.profession && (
            <Text style={styles.professionText}>{contact.profession}</Text>
          )}
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={[styles.quickAction, { backgroundColor: theme.card }]} onPress={handleCall}>
          <View style={[styles.quickActionIcon, { backgroundColor: theme.success + '20' }]}>
            <Ionicons name="call" size={24} color={theme.success} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.text }]}>Ara</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.quickAction, { backgroundColor: theme.card }]} onPress={handleSMS}>
          <View style={[styles.quickActionIcon, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="mail" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.text }]}>Mesaj</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.quickAction, { backgroundColor: theme.card }]} onPress={handleWhatsApp}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#25D366' + '20' }]}>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          </View>
          <Text style={[styles.quickActionText, { color: theme.text }]}>WhatsApp</Text>
        </TouchableOpacity>

        {contact.email && (
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: theme.card }]} onPress={handleEmail}>
            <View style={[styles.quickActionIcon, { backgroundColor: theme.warning + '20' }]}>
              <Ionicons name="mail-outline" size={24} color={theme.warning} />
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>E-posta</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Details */}
      <ScrollView
        style={styles.detailsContainer}
        contentContainerStyle={styles.detailsContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Information */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>İletişim Bilgileri</Text>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: theme.primary + '10' }]}>
              <Ionicons name="call" size={20} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textDim }]}>Telefon</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{contact.phone}</Text>
            </View>
          </View>

          {contact.email && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="mail" size={20} color={theme.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textDim }]}>E-posta</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{contact.email}</Text>
              </View>
            </View>
          )}

          {contact.address && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="location" size={20} color={theme.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textDim }]}>Adres</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{contact.address}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Personal Information */}
        {(contact.age || contact.profession) && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Kişisel Bilgiler</Text>

            {contact.age && (
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: theme.secondary + '10' }]}>
                  <Ionicons name="calendar" size={20} color={theme.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textDim }]}>Yaş</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{contact.age}</Text>
                </View>
              </View>
            )}

            {contact.profession && (
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: theme.secondary + '10' }]}>
                  <Ionicons name="briefcase" size={20} color={theme.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textDim }]}>Meslek</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{contact.profession}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Etiketler</Text>
            <View style={styles.tagsContainer}>
              {contact.tags.map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tag, { backgroundColor: theme.primary + '20' }]}
                >
                  <Ionicons name="pricetag" size={14} color={theme.primary} />
                  <Text style={[styles.tagText, { color: theme.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {contact.notes && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notlar</Text>
            <Text style={[styles.notesText, { color: theme.textDim }]}>{contact.notes}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Kayıt Bilgileri</Text>
          
          <View style={styles.metadataRow}>
            <Text style={[styles.metadataLabel, { color: theme.textDim }]}>Oluşturulma:</Text>
            <Text style={[styles.metadataValue, { color: theme.text }]}>
              {format(contact.createdAt, 'dd MMMM yyyy, HH:mm', { locale: tr })}
            </Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={[styles.metadataLabel, { color: theme.textDim }]}>Güncelleme:</Text>
            <Text style={[styles.metadataValue, { color: theme.text }]}>
              {format(contact.updatedAt, 'dd MMMM yyyy, HH:mm', { locale: tr })}
            </Text>
          </View>

          {contact.lastContactedAt && (
            <View style={styles.metadataRow}>
              <Text style={[styles.metadataLabel, { color: theme.textDim }]}>Son İletişim:</Text>
              <Text style={[styles.metadataValue, { color: theme.text }]}>
                {format(contact.lastContactedAt, 'dd MMMM yyyy, HH:mm', { locale: tr })}
              </Text>
            </View>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.error + '15' }]}
          onPress={handleDeleteContact}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error} />
          <Text style={[styles.deleteButtonText, { color: theme.error }]}>
            Kişiyi Sil
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <ContactFormModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditContact}
        contact={contact}
        mode="edit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight! + 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarLargeText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  professionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    flex: 1,
  },
  detailsContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});



