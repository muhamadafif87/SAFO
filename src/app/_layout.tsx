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
  
  // ✅ Pisahkan selector Zustand agar referensi memorinya stabil
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const role = useAuthStore((state) => state.user?.role);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const rootSegment = segments[0] as string | undefined;
    const inAuthGroup = rootSegment === '(auth)';
    // Landing page: segment undefined berarti user di root '/'
    const inLandingPage = rootSegment === undefined;
    // Cek apakah berada di route yang dilindungi (customer, mitra, admin)
    const inProtectedRoute = !inAuthGroup && !inLandingPage;

    if (!isAuthenticated && inProtectedRoute) {
      // Unauthenticated user mencoba akses halaman protected → redirect ke landing
      router.replace('/');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect sesuai role jika pengguna sudah terautentikasi tapi masih di grup auth
      if (role === 'customer') {
        router.replace('/(customer)');
      } else if (role === 'mitra') {
        router.replace('/(mitra)');
      } else if (role === 'admin') {
        router.replace('/(admin)');
      }
    }
    // Landing page & auth group dapat diakses tanpa autentikasi → tidak ada redirect
  }, [isAuthenticated, isLoading, segments[0], role]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Landing page — publik, selalu tampil pertama kali */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(mitra)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}