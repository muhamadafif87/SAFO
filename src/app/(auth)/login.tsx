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
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

// Design tokens
const PRIMARY = "#ffffff";
const SECONDARY = "#00615F";
const FONT_TITLE = "Alkatra_600SemiBold";
const FONT_LIGHT = "Poppins_300Light";
const FONT_REGULAR = "Poppins_400Regular";
const FONT_MEDIUM = "Poppins_500Medium";

const HEADER_HEIGHT = 232;

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
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

  // Lingkaran besar yang dipotong wrapper -> menghasilkan lengkungan landai di bawah header
  const circleSize = width * 2.25;

  return (
    // edges tanpa "top" supaya header hijau menutupi area status bar
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.headerCircle,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                left: (width - circleSize) / 2,
              },
            ]}
          />
          <Text style={styles.brand}>safo</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Login ke akun anda</Text>

          <View style={styles.fieldGroup}>
            <TextInput
              style={[styles.input, !emailValid && styles.inputError]}
              placeholder="email"
              placeholderTextColor="#a9a9a9"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!emailValid && (
              <Text style={styles.errorText}>Format email tidak valid</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <TextInput
              style={[styles.input, !passwordValid && styles.inputError]}
              placeholder="password"
              placeholderTextColor="#a9a9a9"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {!passwordValid && (
              <Text style={styles.errorText}>Password minimal 6 karakter</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? "Loading..." : "Login"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerRow}
            onPress={() => router.push("/(auth)/register")}
            activeOpacity={0.7}
          >
            <View style={styles.line} />
            <Text style={styles.registerText}>Buat Akun</Text>
            <View style={styles.line} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY,
  },
  container: {
    flex: 1,
    backgroundColor: PRIMARY,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCircle: {
    position: "absolute",
    bottom: 0,
    backgroundColor: SECONDARY,
  },
  brand: {
    fontFamily: FONT_TITLE,
    fontStyle: "italic",
    fontSize: 44,
    color: PRIMARY,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  title: {
    fontFamily: FONT_REGULAR,
    fontWeight: "semibold",
    fontSize: 20,
    color: "#000000",
    marginBottom: 34,
  },
  fieldGroup: {
    marginBottom: 32,
  },
  input: {
    width: "100%",
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 22,
    fontFamily: FONT_LIGHT,
    fontSize: 16,
    color: "#111111",
    borderWidth: 1,
    borderColor: "#e6e6e6",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inputError: {
    borderColor: "#d77d7d",
  },
  errorText: {
    marginTop: 6,
    marginLeft: 8,
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: "#d95c5c",
  },
  primaryButton: {
    height: 49,
    backgroundColor: SECONDARY,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontFamily: FONT_MEDIUM,
    fontSize: 17,
    color: PRIMARY,
  },
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  line: {
    width: 34,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#6b6b6b",
  },
  registerText: {
    marginHorizontal: 14,
    fontFamily: FONT_LIGHT,
    fontSize: 12,
    color: "#444444",
  },
});
