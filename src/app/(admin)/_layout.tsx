import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="mitra/index" />
      <Stack.Screen name="transactions/index" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
