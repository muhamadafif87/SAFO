import { Tabs } from 'expo-router';
import { Colors } from '@/constants/typography';

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary[600],
        tabBarInactiveTintColor: Colors.neutral[400],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pesanan',
        }}
      />
      {/* Hidden screens — accessible via router.push but not shown in tab bar */}
      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
          title: 'Checkout',
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          href: null,
          title: 'Produk',
        }}
      />
    </Tabs>
  );
}

