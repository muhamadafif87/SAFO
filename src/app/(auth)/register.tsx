import { authService } from "@/services/auth.service";
import { isAxiosError } from "axios";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const nameValid = useMemo(
    () => name.trim().length === 0 || name.trim().length >= 3,
    [name],
  );
  const emailValid = useMemo(
    () => email.trim().length === 0 || isValidEmail(email),
    [email],
  );
  const passwordValid = useMemo(
    () => password.length === 0 || password.length >= 6,
    [password],
  );
  const confirmValid = useMemo(
    () => confirmPassword.length === 0 || confirmPassword === password,
    [confirmPassword, password],
  );

  const handleRegister = async () => {
    if (!name.trim() || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Semua field wajib diisi");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Format email tidak valid");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Password dan konfirmasi password tidak sama");
      return;
    }

    setIsLoading(true);
    try {
      await authService.registerCustomer({
        name: name.trim(),
        email,
        password,
        phone,
      });
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.brand}>safo</Text>
          <Text style={styles.title}>Registrasi</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama lengkap</Text>
            <TextInput
              style={[styles.input, !nameValid && styles.inputError]}
              value={name}
              onChangeText={setName}
            />
            {name.length > 0 && (
              <Text
                style={[
                  styles.validationText,
                  nameValid ? styles.successText : styles.errorText,
                ]}
              >
                {nameValid ? "Nama valid" : "Minimal 3 karakter"}
              </Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nomor Telepon</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !emailValid && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {email.length > 0 && (
              <Text
                style={[
                  styles.validationText,
                  emailValid ? styles.successText : styles.errorText,
                ]}
              >
                {emailValid ? "Email sudah benar" : "Format email tidak valid"}
              </Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, !passwordValid && styles.inputError]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {password.length > 0 && (
              <Text
                style={[
                  styles.validationText,
                  passwordValid ? styles.successText : styles.errorText,
                ]}
              >
                {passwordValid
                  ? "Kombinasi password sudah kuat"
                  : "Minimal 6 karakter"}
              </Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Konfirmasi Password</Text>
            <TextInput
              style={[styles.input, !confirmValid && styles.inputError]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {confirmPassword.length > 0 && (
              <Text
                style={[
                  styles.validationText,
                  confirmValid ? styles.successText : styles.errorText,
                ]}
              >
                {confirmValid
                  ? "Password sudah sesuai"
                  : "Password tidak sesuai"}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? "Loading..." : "Sign-up"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Sudah punya akun?{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.replace("/(auth)/login")}
            >
              login di sini
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f0eb",
  },
  container: {
    flex: 1,
    backgroundColor: "#f4f0eb",
  },
  content: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 26,
  },
  brand: {
    alignSelf: "center",
    fontSize: 32,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -2,
    marginBottom: 8,
  },
  title: {
    fontSize: 50,
    lineHeight: 84,
    fontWeight: "700",
    color: "#111111",
    alignSelf: "center",
    letterSpacing: -4,
    marginBottom: 18,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 24,
    color: "#111111",
    fontWeight: "500",
    marginBottom: 12,
    letterSpacing: -1,
  },
  input: {
    width: "100%",
    backgroundColor: "#f4f4f4",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#e4e4e4",
    color: "#111111",
  },
  inputError: {
    borderColor: "#d77d7d",
  },
  validationText: {
    marginTop: 8,
    fontSize: 15,
    color: "#6b6b6b",
  },
  successText: {
    color: "#2f7d4a",
  },
  errorText: {
    color: "#d95c5c",
  },
  primaryButton: {
    backgroundColor: "#0a5d5d",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -2,
  },
  footerText: {
    alignSelf: "center",
    color: "#1b1b1b",
    fontSize: 18,
    textAlign: "center",
  },
  footerLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
