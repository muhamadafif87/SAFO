import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontFamily, FontWeight, FontSize } from '@/constants/typography';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Placeholder for Logo */}
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>SAFO</Text>
        </View>

        <Text style={styles.title}>Selamatkan Makanan, Hemat Pengeluaran</Text>
        <Text style={styles.subtitle}>
          Temukan makanan surplus berkualitas dari toko dan restoran favoritmu dengan harga lebih hemat.
        </Text>

        <View style={styles.actions}>
          <Button
            title="Masuk"
            onPress={() => router.push('/(auth)/login')}
            style={styles.button}
          />
          <Button
            title="Daftar sebagai Pembeli"
            variant="secondary"
            onPress={() => router.push('/(auth)/register')}
            style={styles.button}
          />
          <Button
            title="Daftar sebagai Mitra"
            variant="ghost"
            onPress={() => router.push('/(auth)/register-mitra')}
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  content: {
    flex: 1,
    padding: Spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: Colors.primary[100],
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[8],
  },
  logoText: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginBottom: Spacing[10],
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: Spacing[3],
  },
  button: {
    width: '100%',
  },
});
