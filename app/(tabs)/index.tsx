import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Platform } from 'react-native';
import WeeklyProgram from '../../components/WeeklyProgram';
import Announcements from '../../components/Announcements';
import Header from '../../components/Header';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const navigation = useNavigation();

  // Sayfa odaklandığında StatusBar'ı güncelleyelim
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
        StatusBar.setBarStyle('light-content');
      }
      return () => {};
    }, [])
  );

  const handleNotificationPress = () => {
    // Bildirim işlemleri burada yapılacak
    console.log('Notification pressed');
  };

  const handleAnalyticsPress = () => {
    navigation.navigate('AnalyticsScreen');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Genel"
        showNotification={true}
        onNotificationPress={handleNotificationPress}
        isProfileScreen={false}
        onAnalyticsPress={handleAnalyticsPress}
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
}); 