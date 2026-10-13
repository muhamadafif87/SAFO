import { Colors } from "@/constants/typography";
import { useAuthStore } from "@/stores/auth.store";
import { useLocationStore } from "@/stores/location.store";
import { useRouter } from "expo-router";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const PRIMARY = Colors.primary[600];
const PRIMARY_LIGHT = Colors.primary[50];
const PRIMARY_DARK = Colors.primary[700];
const WHITE = "#ffffff";
const TEXT_DARK = Colors.neutral[900];
const TEXT_MUTED = Colors.neutral[500];
const BORDER = Colors.neutral[100];
const ERROR_BG = "#fee2e2";
const ERROR_TEXT = "#dc2626";
const MINT = "#D8EDE7";
const TEAL = PRIMARY;
const TEAL_DARK = PRIMARY_DARK;

const PersonIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
    <Path
      fillRule="evenodd"
      d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"
    />
  </Svg>
);

const CrownIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M2 4.5l3.5 3L8 3.5l2.5 4 3.5-3-1.4 7.5H3.4L2 4.5z" />
    <Path d="M3.4 12.5h9.2V14H3.4z" />
  </Svg>
);

const LifebuoyIcon = ({
  color,
  size = 18,
}: {
  color: string;
  size?: number;
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke={color}
    strokeWidth="1.4"
  >
    <Path
      d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      strokeLinejoin="round"
    />
    <Path d="M8 1v4M8 11v4M1 8h4M11 8h4" strokeLinecap="round" />
  </Svg>
);

const QuestionIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16" fill="#d97706">
    <Path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
    <Path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94" />
  </Svg>
);

const ChatIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16" fill="#2563eb">
    <Path d="M8 1C4.14 1 1 3.806 1 7.267c0 1.917.977 3.626 2.508 4.742-.062.47-.27 1.086-.73 1.53-.06.057-.014.153.066.142 1.09-.137 1.909-.59 2.469-1.023A7.83 7.83 0 0 0 8 13.533c3.86 0 7-2.806 7-6.267S11.86 1 8 1m-4.5 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2m4.5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2m4.5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2" />
  </Svg>
);

export default function CustomerProfile() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { activeLocation } = useLocationStore();

  const isVip = !!user?.isVip;

  const handleLogout = () => {
    Alert.alert(
      "Keluar Akun",
      "Apakah Anda yakin ingin keluar dari akun ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            await clearAuth();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header: back + title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Svg width={20} height={20} viewBox="0 0 16 16" fill={TEXT_DARK}>
            <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Hero card teal gelap ── */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <PersonIcon color={WHITE} size={32} />
          </View>
          <Text style={styles.heroName}>{user?.name || "Pelanggan SAFO"}</Text>
          <Text style={styles.heroPhone}>{user?.phone || "-"}</Text>
        </View>

        {/* ── Kartu VIP ── */}
        <TouchableOpacity
          style={styles.vipCard}
          activeOpacity={0.7}
          onPress={() => router.push("/(customer)/vip")}
        >
          <View style={styles.vipIconWrap}>
            <CrownIcon color={PRIMARY} size={20} />
          </View>
          <View style={styles.vipInfo}>
            <Text style={styles.vipLabel}>VIP Member</Text>
            <Text
              style={[styles.vipStatus, !isVip && styles.vipStatusInactive]}
            >
              {isVip ? "Aktif" : "Nonaktif"}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* ── Informasi Pribadi ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <PersonIcon color={PRIMARY} size={16} />
            </View>
            <Text style={styles.cardHeaderTitle}>Informasi Pribadi</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Text style={styles.infoEmoji}>📍</Text>
            </View>
            <Text style={styles.infoText}>
              {activeLocation?.address || "Alamat belum diatur"}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Text style={styles.infoEmoji}>📞</Text>
            </View>
            <Text style={styles.infoText}>{user?.phone || "-"}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIconWrap}>
              <Text style={styles.infoEmoji}>✉️</Text>
            </View>
            <Text style={[styles.infoText, styles.infoEmail]} numberOfLines={1}>
              {user?.email || "-"}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        {/* ── Aktivitas & Pesanan ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Svg width={16} height={16} viewBox="0 0 16 16" fill={PRIMARY}>
                <Path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 1 1 1-1h1z" />
                <Path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z" />
              </Svg>
            </View>
            <Text style={styles.cardHeaderTitle}>Pesanan</Text>
          </View>

          <TouchableOpacity
            style={[styles.infoRow, styles.infoRowLast]}
            activeOpacity={0.7}
            onPress={() => router.push("/(customer)/orders")}
          >
            <View style={[styles.infoIconWrap, { backgroundColor: "#eff6ff" }]}>
              <Text style={styles.infoEmoji}>🛍️</Text>
            </View>
            <Text style={styles.infoText}>Riwayat Pesanan</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Bantuan ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <LifebuoyIcon color={PRIMARY} size={16} />
            </View>
            <Text style={styles.cardHeaderTitle}>Bantuan</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                "Pusat Bantuan",
                "Kunjungi support@safo.id untuk bantuan.",
              )
            }
          >
            <View style={[styles.infoIconWrap, { backgroundColor: "#fef3c7" }]}>
              <QuestionIcon />
            </View>
            <Text style={styles.infoText}>Pusat Bantuan</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.infoRow, styles.infoRowLast]}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert("Chat Admin", "Hubungi admin SAFO melalui WhatsApp.")
            }
          >
            <View style={[styles.infoIconWrap, { backgroundColor: "#eff6ff" }]}>
              <ChatIcon />
            </View>
            <Text style={styles.infoText}>Chat Admin</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WHITE,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  backButton: {
    width: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  headerSpacer: {
    width: 40,
  },

  heroCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: PRIMARY_DARK,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "700",
    color: WHITE,
  },
  heroPhone: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },

  vipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MINT,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  vipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vipInfo: {
    flex: 1,
  },
  vipLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  vipStatus: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "600",
    marginTop: 1,
  },
  vipStatusInactive: {
    color: TEXT_MUTED,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  cardHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F6F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoEmoji: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_DARK,
  },
  infoEmail: {
    color: PRIMARY,
  },
  chevron: {
    fontSize: 18,
    color: "#B0B0B0",
    marginLeft: 8,
  },

  logoutButton: {
    marginTop: 4,
    backgroundColor: ERROR_BG,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: ERROR_TEXT,
  },
});
