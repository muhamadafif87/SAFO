import { Tabs } from 'expo-router';
import { Colors } from '@/constants/typography';
// Need icons? Can use expo/vector-icons or just Text for MVP

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
        name="explore"
        options={{
          title: 'Cari',
        }}
      />
      <Tabs.Screen
        name="orders"
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
    </Tabs>
  );
}
