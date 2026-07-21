import { Tabs } from 'expo-router';
import { Colors } from '@/constants/typography';

export default function MitraLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.secondary[600], // Using orange for Mitra context
        tabBarInactiveTintColor: Colors.neutral[400],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produk',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pesanan',
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Laporan',
        }}
      />
    </Tabs>
  );
}
