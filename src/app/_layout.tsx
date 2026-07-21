import { Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { DarkTheme, DefaultTheme } from "expo-router/react-navigation";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useAuthStore } from '@/stores/auth.store';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  
  // ✅ PERBAIKAN 1: Pisahkan selector Zustand agar referensi memorinya stabil
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const role = useAuthStore((state) => state.user?.role);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const rootSegment = segments[0]; // Ambil nilai string primitifnya
    const inAuthGroup = rootSegment === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect ke login jika belum di-autentikasi dan tidak berada di grup auth
      router.replace('/(auth)');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect sesuai role jika pengguna sudah terautentikasi
      if (role === 'customer') {
        router.replace('/(customer)');
      } else if (role === 'mitra') {
        router.replace('/(mitra)');
      } else if (role === 'admin') {
        router.replace('/(admin)');
      }
    }
  // ✅ PERBAIKAN 2: Gunakan 'segments[0]' (string primitif) bukan seluruh array 'segments'
  }, [isAuthenticated, isLoading, segments[0], role]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(mitra)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}