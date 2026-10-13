import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// ─── Color Palette Matching Screen & Theme ──────────────────────────────────
const TEAL = "#005B52";
const TEAL_LIGHT = "#D5EAE2";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#4B5563";
const WHITE = "#ffffff";
const BORDER_COLOR = "#E5E7EB";

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const ChevronLeftIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 19l-7-7 7-7"
      stroke={TEAL}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CrownBigIcon = () => (
  <Svg width={46} height={46} viewBox="0 0 24 24" fill={TEAL}>
    <Path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </Svg>
);

const DollarIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
      stroke={TEAL}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ClockIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 7v5l3 3"
      stroke={TEAL}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
      stroke={TEAL}
      strokeWidth={2.2}
    />
    <Path
      d="M12 1v2"
      stroke={TEAL}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </Svg>
);

export default function VipScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const isVip = !!user?.isVip;

  const handleUpgrade = () => {
    if (isVip) {
      Alert.alert(
        "Status VIP Aktif",
        "Akun Anda sudah memiliki langganan SAFO VIP aktif.",
        [{ text: "Tutup" }]
      );
      return;
    }

    Alert.alert(
      "Konfirmasi Upgrade VIP",
      "Upgrade ke SAFO VIP seharga Rp 10.000 / bulan untuk menikmati cashback makanan dan akses promo lebih awal?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Upgrade Sekarang",
          onPress: async () => {
            setIsProcessing(true);
            try {
              // Simulasikan aktivasi VIP
              useAuthStore.setState((state) => ({
                user: state.user ? { ...state.user, isVip: true } : state.user,
              }));

              Alert.alert(
                "Pembayaran Berhasil! 🎉",
                "Selamat, status akun Anda sekarang adalah SAFO VIP. Nikmati semua keuntungan eksklusif!",
                [
                  {
                    text: "Kembali ke Profil",
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (err) {
              Alert.alert("Gagal", "Terjadi kesalahan saat memproses langganan.");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon />
          <Text style={styles.headerTitle}>VIP</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Hero Banner ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <CrownBigIcon />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>SAFO VIP</Text>
            <Text style={styles.heroSubtitle}>
              Nikmati pengalaman terbaik belanja makanan dengan keuntungan eksklusif.
            </Text>
          </View>
        </View>

        {/* ── Benefit 1: Cashback Saat Makanan Zonk ── */}
        <View style={styles.benefitCard}>
          <View style={styles.benefitIconCircle}>
            <DollarIcon />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Cashback Saat Makanan Zonk</Text>
            <Text style={styles.benefitDesc}>
              Makanan tidak sesuai, basi, atau tidak layak? Dapatkan uang kembali 100%.
            </Text>
          </View>
        </View>

        {/* ── Benefit 2: Makanan Muncul Lebih Awal ── */}
        <View style={styles.benefitCard}>
          <View style={styles.benefitIconCircle}>
            <ClockIcon />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Makanan Muncul Lebih Awal</Text>
            <Text style={styles.benefitDesc}>
              Dapatkan akses lebih awal untuk melihat dan memesan makanan sebelum pengguna lainnya.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom Fixed Card / Footer ── */}
      <View
        style={[
          styles.footerWrapper,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.footerCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Harga VIP</Text>
            <Text style={styles.priceValue}>
              <Text style={styles.priceNumber}>Rp 10.000</Text>
              <Text style={styles.priceUnit}> / bulan</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.upgradeButton,
              isVip && styles.upgradeButtonActive,
              isProcessing && styles.upgradeButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleUpgrade}
            disabled={isProcessing}
          >
            <Text style={styles.upgradeButtonText}>
              {isVip ? "VIP Anda Sudah Aktif" : isProcessing ? "Memproses..." : "Upgrade VIP"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEAL,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // ── Hero Banner ──
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TEAL_LIGHT,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
  },
  heroIconWrap: {
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEAL,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: "#183b34",
    lineHeight: 18,
  },

  // ── Benefit Cards ──
  benefitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  benefitIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TEAL_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    lineHeight: 18,
  },

  // ── Footer Fixed Card ──
  footerWrapper: {
    paddingHorizontal: 18,
    paddingTop: 8,
    backgroundColor: WHITE,
  },
  footerCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  priceValue: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: TEAL,
  },
  priceUnit: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  upgradeButton: {
    backgroundColor: TEAL,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeButtonActive: {
    backgroundColor: "#0d6a5f",
  },
  upgradeButtonDisabled: {
    opacity: 0.7,
  },
  upgradeButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
});

