import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import { SplashScreen, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AppState, Platform, StatusBar, useColorScheme, View } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Reanimated is imported by components that use it (HelloWave, ParallaxScrollView, etc.)
// import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { rescheduleDailyIfNeeded } from '../services/DailyRescheduler';
import { initialize as initNotifications } from '../services/NotificationService';
import { initializeUserStatus, updateLastSeen, updateUserStatus } from '../services/UserStatusService';
import * as Notifications from 'expo-notifications';

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

// Hem Notification init ve Navigation Bar için useEffect
  useEffect(() => {
    if (fontsLoaded && isFirebaseReady) {
      // Bildirimleri hazırla ve Android için sıradaki bildirimi kur
      (async () => {
        await initNotifications();
        await rescheduleDailyIfNeeded();
        
        // Bildirim listener'larını kur
        // Uygulama açıkken gelen bildirimleri yakala
        const receivedListener = Notifications.addNotificationReceivedListener(notification => {
          console.log('📬 Bildirim alındı (uygulama açık):', notification.request.content.title);
          // Ses çal ve bildirimi göster
        });
        
        // Bildirime tıklandığında
        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('👆 Bildirime tıklandı:', response.notification.request.content);
          const data = response.notification.request.content.data;
          if (data?.chatId) {
            // Chat sayfasına yönlendir
            // router.push(`/chat/${data.chatId}`);
          }
        });
        
        return () => {
          receivedListener.remove();
          responseListener.remove();
        };
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

  function AuthGate() {
    const { isLoading, isLoggedIn } = useAuth();

    useEffect(() => {
      // Auth kontrolü tamamlanana kadar splash screen'i göster
      if (!isLoading && fontsLoaded && isFirebaseReady) {
        // Hemen splash screen'i gizle (gecikme yok)
        SplashScreen.hideAsync().catch(() => {});
      }
    }, [isLoading, fontsLoaded, isFirebaseReady]);

    // Auth kontrolü tamamlanana kadar hiçbir şey render etme (splash screen gösterilecek)
    if (isLoading) {
      return null;
    }

    return (
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
              
              {/* Contacts ekranları */}
              <Stack.Screen
                name="contacts/index"
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="contacts/[id]"
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
            </Stack>
          </View>
        </SafeAreaProvider>
      </AppStateWrapper>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
