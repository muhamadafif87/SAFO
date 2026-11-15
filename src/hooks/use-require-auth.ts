import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Hook guard untuk screen yang membutuhkan autentikasi.
 *
 * Jika `isAuthenticated` berubah menjadi false (misalnya saat session expired
 * atau logout terjadi di tab lain), hook ini akan memaksa redirect ke halaman
 * login sehingga screen tidak perlu menangani kasus ini secara manual.
 *
 * @example
 * export default function MyProtectedScreen() {
 *   useRequireAuth();
 *   // ... rest of component
 * }
 */
export function useRequireAuth(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();

  useEffect(() => {
    // Tunggu sampai session restore selesai sebelum redirect
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, router]);
}
