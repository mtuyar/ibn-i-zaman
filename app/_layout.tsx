import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, StatusBar, Text, AppState } from 'react-native';
import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeUserStatus, updateUserStatus, updateLastSeen } from '../services/UserStatusService';
import { rescheduleDailyIfNeeded } from '../services/DailyRescheduler';
import { initialize as initNotifications } from '../services/NotificationService';

// Firebase'i doğrudan import et
import { auth } from '../config/firebase';

// Splash screen'i görünür tut
SplashScreen.preventAutoHideAsync();

// AppState yönetimi için wrapper component
function AppStateWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const appState = React.useRef(AppState.currentState);

  useEffect(() => {
    if (!user) return;

    // Kullanıcı durumunu başlat
    initializeUserStatus(user.uid);

    // AppState değişikliklerini dinle
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Uygulama aktif olduğunda
        updateUserStatus(user.uid, 'online');
      } else if (nextAppState.match(/inactive|background/)) {
        // Uygulama arka plana geçtiğinde
        updateUserStatus(user.uid, 'offline');
        updateLastSeen(user.uid);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      // Uygulama kapatıldığında
      updateUserStatus(user.uid, 'offline');
      updateLastSeen(user.uid);
    };
  }, [user]);

  return <>{children}</>; 
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });
  
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  // Firebase Auth'un hazır olduğunu kontrol et
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (auth) {
          console.log('Firebase Auth initialized successfully');
          setIsFirebaseReady(true);
        }
      } catch (error) {
        console.error('Firebase Auth initialization error:', error);
        setIsFirebaseReady(true);
      }
    };

    checkAuth();
  }, []);

  // Hem Splash, hem Notification init ve Navigation Bar için useEffect
  useEffect(() => {
    if (fontsLoaded && isFirebaseReady) {
      // Bildirimleri hazırla ve Android için sıradaki bildirimi kur
      (async () => {
        await initNotifications();
        await rescheduleDailyIfNeeded();
        await SplashScreen.hideAsync();
      })().catch(console.error);
    }
    
    // Android için navigation bar rengini ayarla
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(theme.surface).catch(console.error);
      NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark').catch(console.error);
    }
  }, [fontsLoaded, colorScheme, theme, isFirebaseReady]);

  if (!fontsLoaded || !isFirebaseReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppStateWrapper>
          <SafeAreaProvider>
            <View style={{ flex: 1, backgroundColor: theme.background }}>
              {Platform.OS === 'ios' && (
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
              )}
              <Stack screenOptions={{ headerShown: false }}>
                {/* Auth ekranları */}
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                
                {/* Tab ekranları */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                
                {/* Diğer ekranlar */}
                <Stack.Screen name="programs" options={{ headerShown: false }} />
                
                {/* Chat ekranı */}
                <Stack.Screen
                  name="chat/[id]"
                  options={{
                    headerShown: false,
                  }}
                />
              </Stack>
            </View>
          </SafeAreaProvider>
        </AppStateWrapper>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
