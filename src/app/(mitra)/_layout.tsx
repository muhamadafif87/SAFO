import { SafoTabBar } from '@/components/safo-tab-bar';
import { Tabs } from 'expo-router';

// ─── Mitra Tabs Layout ────────────────────────────────────────────────────────
// Bottom navigation mengikuti wireframe: Beranda / Pesanan / Profil.
// Daftar produk pindah ke Beranda, jadi tab "Produk" tidak ada lagi.

export default function MitraLayout() {
  return (
    <Tabs
      tabBar={(props) => <SafoTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: 'Pesanan',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
        }}
      />

      {/* Hidden screens — dibuka lewat router.push, tidak muncul di tab bar */}
      <Tabs.Screen
        name="orders/[id]"
        options={{
          href: null,
          title: 'Detail Pesanan',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="products/create"
        options={{
          href: null,
          title: 'Tambah Produk',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="products/[id]/edit"
        options={{
          href: null,
          title: 'Edit Menu',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="vip"
        options={{
          href: null,
          title: 'VIP',
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
