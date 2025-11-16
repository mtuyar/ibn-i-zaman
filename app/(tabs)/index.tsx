import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { Platform, ScrollView, StatusBar, StyleSheet, useColorScheme, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Announcements from '../../components/Announcements';
import Header from '../../components/Header';
import WeeklyProgram from '../../components/WeeklyProgram';
import Colors from '../../constants/Colors';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  

  // Sayfa odaklandığında StatusBar'ı güncelleyelim
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
        StatusBar.setBarStyle(colorScheme === 'dark' ? 'light-content' : 'dark-content');
      }
      return () => {};
    }, [])
  );

  const handleNotificationPress = () => {
    // Bildirim işlemleri burada yapılacak
    console.log('Notification pressed');
  };

  const handleContactsPress = () => {
    router.push('/contacts');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Genel"
        showNotification={true}
        onNotificationPress={handleNotificationPress}
        isProfileScreen={false}
        leftButton={
          <View style={styles.contactsButton}>
            <Ionicons name="people" size={18} color="#FFFFFF" />
          </View>
        }
        onLeftButtonPress={handleContactsPress}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <WeeklyProgram />
        <Announcements />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 100,
  },
  contactsButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 