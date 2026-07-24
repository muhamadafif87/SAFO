import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/typography';
import { useAuthStore } from '@/stores/auth.store';
import { showAlert } from '@/utils/alert';
import { authService } from '@/services/auth.service';
import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail || !password) {
      showAlert('Error', 'Email dan password wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login({ email: cleanEmail, password });
      await setAuth(res.user, res.tokens, res.mitra);

    } catch (error) {
      if (isAxiosError(error)) {
        showAlert('Login Gagal', error.response?.data?.message || 'Terjadi kesalahan');
      } else {
        showAlert('Error', error instanceof Error ? error.message : 'Gagal terhubung ke server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Masuk</Text>
        <Text style={styles.subtitle}>Selamat datang kembali di SAFO</Text>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="Masukkan email kamu"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Password"
            placeholder="Masukkan password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title="Masuk"
            onPress={handleLogin}
            isLoading={isLoading}
            style={styles.loginButton}
          />

          <Button
            title="Kembali"
            variant="ghost"
            onPress={handleBack}
          />
        </View>

        {/* Development hints */}
        <View style={styles.devHints}>
          <Text style={styles.devHintTitle}>Test Accounts:</Text>
          <Text style={styles.devHintText}>Admin: admin@safo.com</Text>
          <Text style={styles.devHintText}>Mitra: mitra@safo.com</Text>
          <Text style={styles.devHintText}>Customer: any other email</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  loginButton: {
    marginTop: Spacing[4],
  },
  devHints: {
    marginTop: Spacing[10],
    padding: Spacing[4],
    backgroundColor: Colors.primary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  devHintTitle: {
    fontWeight: 'bold',
    marginBottom: Spacing[1],
    color: Colors.primary[700],
  },
  devHintText: {
    color: Colors.primary[600],
    fontSize: 12,
  }
});
