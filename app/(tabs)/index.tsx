import { useFocusEffect } from '@react-navigation/native';
import React, { useState, useCallback } from 'react';
import { Platform, ScrollView, StatusBar, StyleSheet, useColorScheme, View, TouchableOpacity, Text, RefreshControl, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Announcements from '../../components/Announcements';
import WeeklyProgram from '../../components/WeeklyProgram';
import AnnouncementFormModal, { AnnouncementFormValues } from '../../components/AnnouncementFormModal';
import { createAnnouncement } from '../../services/AnnouncementService';
import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
        StatusBar.setBarStyle(colorScheme === 'dark' ? 'light-content' : 'dark-content');
      }
      return () => { };
    }, [colorScheme])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Components have their own refresh logic
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const getFirstName = () => {
    if (user?.displayName) {
      const words = user.displayName.split(' ');
      return words.slice(0, 2).join(' ');
    }
    return '';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {isDark && <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.background} />}

      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: theme.tabIconDefault }]}>{getGreeting()}</Text>
          <Text style={[styles.userName, { color: theme.text }]}>
            {getFirstName() ? `${getFirstName()} 👋` : 'Hoş geldin 👋'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5' }]}
            onPress={() => Alert.alert('Bildirimler', 'Henüz yeni bildirim yok.')}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5' }]}
            onPress={() => router.push('/profile' as any)}
          >
            <Ionicons name="person-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
      >
        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/attendance')}>
            <LinearGradient colors={['#fa709a', '#fee140']} style={styles.actionGradient}>
              <Ionicons name="calendar" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Yoklama</Text>
            <Text style={[styles.actionHint, { color: theme.tabIconDefault }]}>Al & Gör</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/contacts')}>
            <LinearGradient colors={['#a18cd1', '#fbc2eb']} style={styles.actionGradient}>
              <Ionicons name="people" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Kişiler</Text>
            <Text style={[styles.actionHint, { color: theme.tabIconDefault }]}>Rehber</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/game-center')}>
            <LinearGradient colors={['#43e97b', '#38f9d7']} style={styles.actionGradient}>
              <Ionicons name="game-controller" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Oyunlar</Text>
            <Text style={[styles.actionHint, { color: theme.tabIconDefault }]}>Eğlence</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/attendance/analytics' as any)}>
            <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.actionGradient}>
              <Ionicons name="stats-chart" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: theme.text }]}>İstatistik</Text>
            <Text style={[styles.actionHint, { color: theme.tabIconDefault }]}>Analiz</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Programs Section */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <WeeklyProgram />
        </Animated.View>

        {/* Announcements Section */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Announcements />
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* FAB for Adding Announcement */}
      {isAdmin && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => setIsFormVisible(true)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="bullhorn-variant" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Announcement Form Modal */}
      <AnnouncementFormModal
        visible={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        onSubmit={async (values: AnnouncementFormValues) => {
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
          } catch (err) {
            console.error('Duyuru oluşturma hatası', err);
            Alert.alert('Hata', 'Duyuru oluşturulurken bir sorun oluştu.');
          } finally {
            setIsSubmitting(false);
          }
        }}
        isSubmitting={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerLeft: {},
  greeting: { fontSize: 14, marginBottom: 2 },
  userName: { fontSize: 22, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { flex: 1 },
  contentContainer: {
    paddingTop: 10,
    paddingBottom: 100,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 10,
    gap: 8,
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
  },
  actionGradient: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionHint: {
    fontSize: 10,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});