import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/typography';

export default function MitraHome() {
  const { user, mitra, clearAuth } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Mitra Dashboard</Text>
        <Text style={styles.subtitle}>Usaha: {mitra?.businessName}</Text>
        <Text style={styles.emailText}>Email: {user?.email}</Text>

        <Button
          title="Logout"
          variant="danger"
          onPress={() => clearAuth()}
          style={styles.logoutButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  content: {
    flex: 1,
    padding: Spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.secondary[600],
    marginBottom: Spacing[1],
  },
  emailText: {
    fontSize: FontSize.md,
    color: Colors.neutral[600],
  },
  logoutButton: {
    marginTop: Spacing[10],
  },
});
