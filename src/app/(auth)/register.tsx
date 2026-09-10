import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors, FontSize, FontWeight, Spacing } from "@/constants/typography";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { authService } from "@/services/auth.service";
import { isAxiosError } from "axios";

export default function RegisterCustomerScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email dan password wajib diisi");
      return;
    }

    setIsLoading(true);
    try {
      // Panggil backend API untuk register
      await authService.registerCustomer({ email, password, phone });

      // Navigate to login after successful register
      Alert.alert("Sukses", "Pendaftaran berhasil. Silakan login.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (error) {
      if (isAxiosError(error)) {
        const msg = error.response?.data?.message;
        const errorMessage = Array.isArray(msg)
          ? msg.join("\n")
          : typeof msg === "string"
            ? msg
            : "Terjadi kesalahan pada server";
        Alert.alert("Gagal Mendaftar", errorMessage);
      } else {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Gagal terhubung ke server",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Daftar Pembeli</Text>
        <Text style={styles.subtitle}>
          Selamatkan makanan, mulai dari sini.
        </Text>

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
            placeholder="Buat password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Input
            label="Nomor Telepon (Opsional)"
            placeholder="Mis: 08123456789"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
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
            onPress={() => router.replace("/(auth)")}
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
    justifyContent: "center",
  },
  title: {
    fontSize: FontSize["3xl"],
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
