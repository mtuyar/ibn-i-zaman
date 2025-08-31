import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const CARD_MARGIN = width * 0.02;

const announcements = [
  {
    id: 1,
    title: 'Acil Toplantı',
    description: 'Yarın saat 14:00\'te acil toplantı yapılacaktır.',
    type: 'emergency',
    time: '2 saat önce',
  },
  {
    id: 2,
    title: 'Program Değişikliği',
    description: 'Bu hafta Cuma günü programı iptal edilmiştir.',
    type: 'warning',
    time: '1 gün önce',
  },
  {
    id: 3,
    title: 'Acil Duyuru',
    description: 'Yarın saat 14:00\'te acil toplantı yapılacaktır.',
    type: 'emergency',
    time: '2 saat önce',
  },
  {
    id: 4,
    title: 'Uyarı',
    description: 'Bu hafta Cuma günü programı iptal edilmiştir.',
    type: 'warning',
    time: '1 gün önce',
  },
];

export default function Announcements() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isModalVisible, setIsModalVisible] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'alert-circle';
      case 'warning':
        return 'alert';
      default:
        return 'information';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return '#E74C3C';
      case 'warning':
        return '#F39C12';
      default:
        return '#3498DB';
    }
  };

  const emergencyAnnouncements = announcements.filter(a => a.type === 'emergency');
  const warningAnnouncements = announcements.filter(a => a.type === 'warning');

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Duyurular</Text>
          <Text style={[styles.subtitle, { color: theme.secondary }]}>
            {announcements.length} Duyuru
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => setIsModalVisible(true)}
          style={[styles.viewAllButton, { backgroundColor: `${theme.primary}15` }]}
        >
          <Text style={[styles.viewAll, { color: theme.primary }]}>Tümünü Gör</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {emergencyAnnouncements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#E74C3C" />
            <Text style={[styles.sectionTitle, { color: '#E74C3C' }]}>Acil Duyurular</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
          >
            {emergencyAnnouncements.map((announcement, index) => (
              <TouchableOpacity
                key={announcement.id}
                style={[
                  styles.card,
                  index === 0 ? { marginLeft: width * 0.04 } : {}
                ]}
                onPress={() => setIsModalVisible(true)}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${getColor(announcement.type)}15` }]}>
                  <MaterialCommunityIcons 
                    name={getIcon(announcement.type)} 
                    size={24} 
                    color={getColor(announcement.type)} 
                  />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {announcement.title}
                </Text>
                <Text style={[styles.cardDescription, { color: theme.textDim }]} numberOfLines={2}>
                  {announcement.description}
                </Text>
                <Text style={[styles.cardTime, { color: theme.subtitle }]}>
                  {announcement.time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {warningAnnouncements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert" size={20} color="#F39C12" />
            <Text style={[styles.sectionTitle, { color: '#F39C12' }]}>Uyarılar</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
          >
            {warningAnnouncements.map((announcement, index) => (
              <TouchableOpacity
                key={announcement.id}
                style={[
                  styles.card,
                  index === 0 ? { marginLeft: width * 0.04 } : {}
                ]}
                onPress={() => setIsModalVisible(true)}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${getColor(announcement.type)}15` }]}>
                  <MaterialCommunityIcons 
                    name={getIcon(announcement.type)} 
                    size={24} 
                    color={getColor(announcement.type)} 
                  />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {announcement.title}
                </Text>
                <Text style={[styles.cardDescription, { color: theme.textDim }]} numberOfLines={2}>
                  {announcement.description}
                </Text>
                <Text style={[styles.cardTime, { color: theme.subtitle }]}>
                  {announcement.time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#FFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Tüm Duyurular
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {emergencyAnnouncements.length > 0 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color="#E74C3C" />
                    <Text style={[styles.modalSectionTitle, { color: '#E74C3C' }]}>
                      Acil Duyurular
                    </Text>
                  </View>
                  {emergencyAnnouncements.map((announcement) => (
                    <View key={announcement.id} style={styles.modalItem}>
                      <View style={styles.modalItemContent}>
                        <Text style={[styles.modalItemTitle, { color: theme.text }]}>
                          {announcement.title}
                        </Text>
                        <Text style={[styles.modalItemDescription, { color: '#666666' }]}>
                          {announcement.description}
                        </Text>
                        <Text style={[styles.modalItemTime, { color: '#999999' }]}>
                          {announcement.time}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {warningAnnouncements.length > 0 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <MaterialCommunityIcons name="alert" size={20} color="#F39C12" />
                    <Text style={[styles.modalSectionTitle, { color: '#F39C12' }]}>
                      Uyarılar
                    </Text>
                  </View>
                  {warningAnnouncements.map((announcement) => (
                    <View key={announcement.id} style={styles.modalItem}>
                      <View style={styles.modalItemContent}>
                        <Text style={[styles.modalItemTitle, { color: theme.text }]}>
                          {announcement.title}
                        </Text>
                        <Text style={[styles.modalItemDescription, { color: '#666666' }]}>
                          {announcement.description}
                        </Text>
                        <Text style={[styles.modalItemTime, { color: '#999999' }]}>
                          {announcement.time}
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
  title: {
    fontSize: 21,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 14 : 12,
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  viewAll: {
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    fontWeight: '600',
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
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardTime: {
    fontSize: Platform.OS === 'ios' ? 12 : 11,
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
    flex: 1,
  },
  modalItemTitle: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalItemDescription: {
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    marginBottom: 8,
    lineHeight: 20,
  },
  modalItemTime: {
    fontSize: Platform.OS === 'ios' ? 12 : 11,
  },
}); 