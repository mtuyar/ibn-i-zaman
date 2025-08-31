import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, Platform, View, Pressable } from 'react-native';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();

  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  // Android için status bar ayarını kaldırdık. Artık her sayfa kendi status bar'ını ayarlıyor.

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          headerShown: false, // Header'ı gizle
          tabBarStyle: {
            backgroundColor: theme.surface,
            height: Platform.OS === 'ios'
              ? 56 + insets.bottom
              : 56 + Math.max(insets.bottom, 8),
            paddingBottom: Platform.OS === 'ios'
              ? insets.bottom
              : Math.max(insets.bottom, 8),
            paddingTop: 8,
            borderTopWidth: 0,
            elevation: Platform.OS === 'android' ? 8 : 0, // Android için gölge
            shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent', // iOS için gölge
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: {
            fontSize: 11,
            marginBottom: Platform.OS === 'ios' ? 0 : 2,
          },
          // Android için press efektini kapat
          tabBarButton: (props) => (
            <Pressable 
              {...props}
              android_disableSound={true}
              android_ripple={{ color: 'transparent' }}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Genel',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "compass" : "compass-outline"} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Sohbet',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="budget"
          options={{
            title: 'Bütçe',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "wallet" : "wallet-outline"} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Vazife',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "checkbox" : "checkbox-outline"} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "person" : "person-outline"} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
