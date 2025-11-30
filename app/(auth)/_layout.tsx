import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';

export default function AuthLayout() {
  const { isLoggedIn, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Auth durumu kontrol edilirken hiçbir şey gösterme (splash screen gösterilecek)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
  if (isLoggedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
} 