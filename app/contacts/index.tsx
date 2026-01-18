import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, useColorScheme, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { Contact } from '../../types/contact';
import ContactService from '../../services/ContactService';
import ContactFormModal from '../../components/ContactFormModal';
import Colors from '../../constants/Colors';

export default function ContactsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { user } = useAuth();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, recentlyAdded: 0 });

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
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      const contactStats = await ContactService.getContactStats(user.uid);
      setStats({ total: contactStats.totalContacts, recentlyAdded: contactStats.recentlyAdded });
    } catch (error) {
      console.error('Error loading stats:', error);
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
      return fullName.includes(searchLower) || contact.phone.includes(searchLower);
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
      await ContactService.createContact(
        { ...contactData, age: contactData.age ? parseInt(contactData.age) : undefined, createdBy: user.uid },
        user.uid
      );
      await loadContacts();
      await loadStats();
      Alert.alert('Başarılı', 'Kişi eklendi!');
    } catch (error) {
      throw error;
    }
  };

  const getInitials = (firstName: string, lastName: string) => `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const getAvatarColor = (id: string) => {
    const colors = ['#4facfe', '#43e97b', '#fa709a', '#a18cd1', '#fbc2eb', '#667eea', '#f093fb'];
    return colors[id.charCodeAt(0) % colors.length];
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Kişiler</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color={theme.tint} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5' }]}>
          <Ionicons name="search" size={20} color={theme.tabIconDefault} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Kişi ara..."
            placeholderTextColor={theme.tabIconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.tabIconDefault} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(79, 172, 254, 0.15)' : 'rgba(79, 172, 254, 0.1)' }]}>
          <Ionicons name="people" size={22} color="#4facfe" />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>Toplam</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(67, 233, 123, 0.15)' : 'rgba(67, 233, 123, 0.1)' }]}>
          <Ionicons name="person-add" size={22} color="#43e97b" />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.recentlyAdded}</Text>
          <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>Bu Hafta</Text>
        </View>
      </View>

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.tint} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50)}>
            <TouchableOpacity
              style={[styles.contactCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
              onPress={() => router.push(`/contacts/${item.id}`)}
              activeOpacity={0.7}
            >
              {item.photoURL ? (
                <Image
                  source={{ uri: item.photoURL }}
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.id) }]}>
                  <Text style={styles.avatarText}>{getInitials(item.firstName, item.lastName)}</Text>
                </View>
              )}
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: theme.text }]}>
                  {item.firstName} {item.lastName}
                </Text>
                <View style={styles.contactMeta}>
                  <Ionicons name="call" size={12} color={theme.tabIconDefault} />
                  <Text style={[styles.contactPhone, { color: theme.tabIconDefault }]}>{item.phone}</Text>
                </View>
                {item.profession && (
                  <View style={styles.contactMeta}>
                    <Ionicons name="briefcase" size={12} color={theme.tabIconDefault} />
                    <Text style={[styles.contactProfession, { color: theme.tabIconDefault }]}>{item.profession}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.tabIconDefault} />
            </TouchableOpacity>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(79, 172, 254, 0.15)' : 'rgba(79, 172, 254, 0.1)' }]}>
              <Ionicons name="people-outline" size={50} color="#4facfe" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Henüz kişi yok</Text>
            <Text style={[styles.emptySubtitle, { color: theme.tabIconDefault }]}>İlk kişiyi ekleyin</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
              <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.emptyButtonGradient}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Kişi Ekle</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add Modal */}
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
  container: { flex: 1 },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, borderRadius: 12, gap: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 15 },
  statCard: { flex: 1, alignItems: 'center', padding: 15, borderRadius: 15 },
  statValue: { fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  statLabel: { fontSize: 12, marginTop: 2 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  contactCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 15, marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  contactInfo: { flex: 1, marginLeft: 14 },
  contactName: { fontSize: 16, fontWeight: '600' },
  contactMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  contactPhone: { fontSize: 13 },
  contactProfession: { fontSize: 12 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
  emptySubtitle: { fontSize: 14, marginTop: 5, marginBottom: 20 },
  emptyButton: { borderRadius: 12, overflow: 'hidden' },
  emptyButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
