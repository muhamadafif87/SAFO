import { Colors } from "@/constants/typography";
import { useAuthStore } from "@/stores/auth.store";
import { useLocationStore } from "@/stores/location.store";
import { showAlert, showConfirm } from "@/utils/alert";
import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, SvgUri } from "react-native-svg";

const PRIMARY = "#00615f";
const PRIMARY_LIGHT = "#cee7e5";
const WHITE = "#ffffff";
const TEXT_MUTED = Colors.neutral[500];
const BORDER = "#eaeaea";
const ERROR_BG = "#f0a8a8";
const ERROR_TEXT = "#da3232";

function FigmaAssetIcon({
  source,
  size,
}: {
  source: number;
  size: number;
}) {
  const uri = Asset.fromModule(source).uri;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <SvgUri
        uri={uri}
        width={size}
        height={size}
        onError={(error) => console.error("[profile] Gagal memuat ikon:", error)}
      />
    </View>
  );
}

export default function CustomerProfile() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { activeLocation } = useLocationStore();

  const isVip = !!user?.isVip;

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    showConfirm(
      "Keluar Akun",
      "Apakah Anda yakin ingin keluar dari akun ini?",
      async () => {
        try {
          setIsLoggingOut(true);
          await clearAuth();
          router.replace("/(auth)/login");
        } catch (error) {
          console.error("[profile] Gagal logout:", error);
          showAlert(
            "Gagal",
            "Terjadi kesalahan saat memproses logout. Silakan coba lagi."
          );
        } finally {
          setIsLoggingOut(false);
        }
      },
      { confirmText: "Keluar", cancelText: "Batal", destructive: true },
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
          <Svg width={20} height={20} viewBox="0 0 16 16" fill={PRIMARY}>
            <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Kartu profil ── */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <FigmaAssetIcon
              source={require("@/assets/images/figma/profile-circle.svg")}
              size={76}
            />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{user?.name || "Pelanggan SAFO"}</Text>
            <Text style={styles.heroPhone}>{user?.phone || "-"}</Text>
          </View>
        </View>

        {/* ── Kartu VIP ── */}
        <TouchableOpacity
          style={styles.vipCard}
          activeOpacity={0.7}
          onPress={() => router.push("/(customer)/vip")}
        >
          <View style={styles.vipIconWrap}>
            <Image
              source={require("@/assets/images/figma/vip-crown.png")}
              style={styles.vipCrown}
              resizeMode="contain"
            />
          </View>
          <View style={styles.vipInfo}>
            <Text style={styles.vipLabel}>VIP</Text>
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
              <FigmaAssetIcon
                source={require("@/assets/images/figma/profile-person.svg")}
                size={20}
              />
            </View>
            <Text style={styles.cardHeaderTitle}>Informasi Pribadi</Text>
            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.7}
              onPress={() => router.push("/(customer)/location-picker")}
            >
              <FigmaAssetIcon
                source={require("@/assets/images/figma/edit-pencil.svg")}
                size={14}
              />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <FigmaAssetIcon
                source={require("@/assets/images/figma/location-pin-outline.svg")}
                size={16}
              />
            </View>
            <Text style={styles.infoText}>
              {activeLocation?.address || "Alamat belum diatur"}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <FigmaAssetIcon
                source={require("@/assets/images/figma/phone.svg")}
                size={14}
              />
            </View>
            <Text style={styles.infoText}>{user?.phone || "-"}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIconWrap}>
              <FigmaAssetIcon
                source={require("@/assets/images/figma/mail-outline.svg")}
                size={16}
              />
            </View>
            <Text style={[styles.infoText, styles.infoEmail]} numberOfLines={1}>
              {user?.email || "-"}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        {/* ── Bantuan ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <FigmaAssetIcon
                source={require("@/assets/images/figma/customer-service.svg")}
                size={18}
              />
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
            <View style={styles.infoIconWrap}>
              <FigmaAssetIcon
                source={require("@/assets/images/figma/help-circle.svg")}
                size={16}
              />
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
            <View style={styles.infoIconWrap}>
              <FigmaAssetIcon
                source={require("@/assets/images/figma/chat.svg")}
                size={13}
              />
            </View>
            <Text style={styles.infoText}>Chat Admin</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            isLoggingOut && styles.logoutButtonDisabled,
          ]}
          activeOpacity={0.8}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={ERROR_TEXT} />
          ) : (
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          )}
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
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: WHITE,
  },
  backButton: {
    width: 28,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginLeft: 14,
  },
  headerSpacer: {
    flex: 1,
  },

  heroCard: {
    height: 120,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    marginBottom: 27,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrap: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 19,
    fontWeight: "700",
    color: WHITE,
  },
  heroPhone: {
    fontSize: 11,
    color: WHITE,
    marginTop: 3,
  },

  vipCard: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 26,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  vipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  vipCrown: {
    width: 24,
    height: 24,
    tintColor: WHITE,
  },
  vipInfo: {
    flex: 1,
  },
  vipLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  vipStatus: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: "500",
    marginTop: 1,
  },
  vipStatusInactive: {
    color: TEXT_MUTED,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
    marginBottom: 26,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 37,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  cardHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardHeaderTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },
  editButton: {
    width: 42,
    height: 24,
    borderRadius: 10,
    backgroundColor: "#eaeaea",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  editText: {
    fontSize: 10,
    color: PRIMARY,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 29,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    color: "#000000",
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
    height: 43,
    marginTop: -16,
    backgroundColor: ERROR_BG,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: ERROR_TEXT,
  },
});
