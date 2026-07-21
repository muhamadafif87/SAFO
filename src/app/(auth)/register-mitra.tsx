import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/typography';

export default function RegisterMitraScreen() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !businessName || !category || !address) {
      Alert.alert('Error', 'Semua field wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      // Mock flow
      // await authService.registerMitra({ 
      //   email, password, businessName, category, address, 
      //   latitude: -6.2, longitude: 106.8 // Mock location 
      // });
      
      Alert.alert('Sukses', 'Pendaftaran Mitra berhasil! Admin akan mereview akun Anda.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Gagal mendaftar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Daftar Mitra</Text>
        <Text style={styles.subtitle}>Jual makanan surplus, kurangi food waste.</Text>

        <View style={styles.form}>
          <Input
            label="Nama Usaha (Toko/Resto)"
            placeholder="Mis: Roti Makmur"
            value={businessName}
            onChangeText={setBusinessName}
          />
          <Input
            label="Kategori"
            placeholder="Mis: Bakery, Cafe, Restoran"
            value={category}
            onChangeText={setCategory}
          />
          <Input
            label="Alamat Lengkap"
            placeholder="Masukkan alamat usaha"
            value={address}
            onChangeText={setAddress}
          />
          <Input
            label="Email"
            placeholder="Email untuk login"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Password"
            placeholder="Buat password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title="Daftar Sekarang"
            onPress={handleRegister}
            isLoading={isLoading}
            style={styles.registerButton}
          />

          <Button
            title="Kembali"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  content: {
    flexGrow: 1,
    padding: Spacing[6],
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.neutral[600],
    marginBottom: Spacing[8],
  },
  form: {
    gap: Spacing[2],
  },
  registerButton: {
    marginTop: Spacing[4],
  },
});
