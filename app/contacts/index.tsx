import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Contact, ContactFilters } from '../../types/contact';
import ContactService from '../../services/ContactService';
import ContactFormModal from '../../components/ContactFormModal';
import Colors from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

export default function ContactsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const { user } = useAuth();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, recentlyAdded: 0 });

  const scrollY = new Animated.Value(0);

  useEffect(() => {
    if (user) {
      loadContacts();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const fetchedContacts = await ContactService.getUserContacts(user.uid);
      setContacts(fetchedContacts);
    } catch (error) {
      console.error('Kişiler yüklenemedi:', error);
      Alert.alert('Hata', 'Kişiler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const contactStats = await ContactService.getContactStats(user.uid);
      setStats({
        total: contactStats.totalContacts,
        recentlyAdded: contactStats.recentlyAdded,
      });
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const filterContacts = () => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const searchLower = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact => {
      const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
      const phone = contact.phone.toLowerCase();
      const profession = contact.profession?.toLowerCase() || '';
      const notes = contact.notes?.toLowerCase() || '';
      const email = contact.email?.toLowerCase() || '';
      const address = contact.address?.toLowerCase() || '';
      const tags = contact.tags?.map(tag => tag.toLowerCase()).join(' ') || '';
      
      return (
        fullName.includes(searchLower) ||
        phone.includes(searchLower) ||
        profession.includes(searchLower) ||
        notes.includes(searchLower) ||
        email.includes(searchLower) ||
        address.includes(searchLower) ||
        tags.includes(searchLower)
      );
    });

    setFilteredContacts(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    await loadStats();
    setRefreshing(false);
  };

  const handleAddContact = async (contactData: any) => {
    if (!user) return;

    try {
      const newContactId = await ContactService.createContact(
        {
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          phone: contactData.phone,
          age: contactData.age ? parseInt(contactData.age) : undefined,
          profession: contactData.profession,
          notes: contactData.notes,
          email: contactData.email,
          address: contactData.address,
          tags: contactData.tags,
          createdBy: user.uid,
        },
        user.uid
      );

      await loadContacts();
      await loadStats();
      Alert.alert('Başarılı', 'Kişi başarıyla eklendi!');
    } catch (error: any) {
      throw error;
    }
  };

  const handleContactPress = (contact: Contact) => {
    router.push(`/contacts/${contact.id}`);
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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderContactItem = ({ item }: { item: Contact }) => {
    const avatarColor = getRandomColor(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.contactCard, { backgroundColor: theme.card }]}
        onPress={() => handleContactPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contactCardContent}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>
              {getInitials(item.firstName, item.lastName)}
            </Text>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.contactHeader}>
              <Text style={[styles.contactName, { color: theme.text }]}>
                {item.firstName} {item.lastName}
              </Text>
              {item.age && (
                <View style={[styles.ageBadge, { backgroundColor: theme.secondary + '15' }]}>
                  <Text style={[styles.ageText, { color: theme.secondary }]}>
                    {item.age}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.contactDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="call" size={13} color={theme.primary} />
                <Text style={[styles.contactPhone, { color: theme.textDim }]}>
                  {item.phone}
                </Text>
              </View>

              {item.profession && (
                <View style={styles.detailRow}>
                  <Ionicons name="briefcase" size={13} color={theme.success} />
                  <Text style={[styles.contactProfession, { color: theme.textDim }]}>
                    {item.profession}
                  </Text>
                </View>
              )}

              {item.email && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail" size={13} color={theme.warning} />
                  <Text style={[styles.contactEmail, { color: theme.textDim }]} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
              )}
            </View>

            {item.notes && (
              <View style={[styles.notesContainer, { backgroundColor: theme.background }]}>
                <Ionicons name="document-text" size={12} color={theme.textDim} />
                <Text 
                  style={[styles.notesPreview, { color: theme.textDim }]} 
                  numberOfLines={2}
                >
                  {item.notes}
                </Text>
              </View>
            )}

            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {item.tags.slice(0, 3).map((tag, index) => (
                  <View
                    key={index}
                    style={[styles.miniTag, { backgroundColor: avatarColor + '20' }]}
                  >
                    <Ionicons name="pricetag" size={10} color={avatarColor} />
                    <Text style={[styles.miniTagText, { color: avatarColor }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
                {item.tags.length > 3 && (
                  <View style={[styles.miniTag, { backgroundColor: theme.textDim + '15' }]}>
                    <Text style={[styles.miniTagText, { color: theme.textDim }]}>
                      +{item.tags.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <View style={[styles.statIconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="people" size={24} color={theme.primary} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>Toplam Kişi</Text>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <View style={[styles.statIconContainer, { backgroundColor: theme.success + '20' }]}>
            <Ionicons name="person-add" size={24} color={theme.success} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.recentlyAdded}</Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>Son 7 Gün</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
        <Ionicons name="people-outline" size={80} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Henüz Kişi Eklemediniz
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textDim }]}>
        Yeni kişiler ekleyerek rehberinizi oluşturun
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: theme.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>İlk Kişiyi Ekle</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Animated Header */}
      <LinearGradient
        colors={theme.headerBackground}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Kişiler</Text>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.textDim} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Kişi ara..."
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.textDim} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Contacts List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textDim }]}>
            Yükleniyor...
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
      )}

      {/* Add Contact Modal */}
      <ContactFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddContact}
        mode="add"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight! + 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listHeader: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  contactCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  contactCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
    gap: 6,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  ageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  ageText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contactDetails: {
    gap: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactPhone: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactProfession: {
    fontSize: 13,
    fontWeight: '500',
  },
  contactEmail: {
    fontSize: 12,
    fontWeight: '400',
    flex: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 2,
  },
  notesPreview: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  miniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  miniTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

