import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { showAlert } from "@/utils/alert";
import { isAxiosError } from "axios";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailValid = useMemo(
    () => email.trim().length === 0 || isValidEmail(email),
    [email],
  );
  const passwordValid = useMemo(
    () => password.length === 0 || password.length >= 6,
    [password],
  );

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showAlert("Error", "Email dan password wajib diisi");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showAlert("Error", "Format email tidak valid");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login({ email: cleanEmail, password });
      await setAuth(res.user, res.tokens, res.mitra);
      router.replace("/(customer)");
    } catch (error) {
      if (isAxiosError(error)) {
        const msg = error.response?.data?.message;
        const errorMessage = Array.isArray(msg)
          ? msg.join("\n")
          : typeof msg === "string"
            ? msg
            : "Terjadi kesalahan";
        showAlert("Login Gagal", errorMessage);
      } else {
        showAlert(
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
        <View style={styles.content}>
          <Text style={styles.brand}>safo</Text>
          <Text style={styles.title}>Login</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !emailValid && styles.inputError]}
              placeholder=""
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
                  : "Password minimal 6 karakter"}
              </Text>
            )}
          </View>

          <View style={styles.rememberRow}>
            <View style={styles.checkbox} />
            <Text style={styles.rememberText}>Remember me</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? "Loading..." : "Sign-in"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Belum punya akun?{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/(auth)/register")}
            >
              lakukan Registrasi di sini
            </Text>
          </Text>
        </View>
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
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 30,
    justifyContent: "center",
  },
  brand: {
    alignSelf: "center",
    fontSize: 32,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -2,
    marginBottom: 12,
  },
  title: {
    fontSize: 58,
    lineHeight: 68,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 18,
    letterSpacing: -3,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 30,
    color: "#111111",
    fontWeight: "700",
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
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#d8d8d8",
    marginRight: 12,
  },
  rememberText: {
    fontSize: 20,
    color: "#111111",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#0a5d5d",
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1.8,
  },
  footerText: {
    alignSelf: "center",
    marginTop: 22,
    color: "#1b1b1b",
    fontSize: 18,
    textAlign: "center",
  },
  footerLink: {
    color: "#1b1b1b",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
