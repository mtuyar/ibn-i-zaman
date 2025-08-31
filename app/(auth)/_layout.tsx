import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout() {
  const { isLoggedIn } = useAuth();

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