/**
 * QRIS Payment Screen
 *
 * Displays QR code for payment and polls backend for status updates.
 * Navigation to order detail only happens after backend confirms PAID status.
 *
 * Route params:
 *   paymentId — internal payment UUID from backend
 *   orderId   — internal order UUID
 *   amount    — total amount in IDR (display only, not used for business logic)
 *
 * Security contract:
 * - Never navigates to success based on QR display alone
 * - Never navigates to success based on frontend countdown
 * - Polling stops on terminal status (success/failed/expired)
 * - Polling stops when screen unmounts
 */

import {
  BorderRadius,
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from "@/constants/typography";
import { paymentService, type PaymentStatusData } from "@/services/payment.service";
import { useCartStore } from "@/stores/cart.store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import Svg, { Path } from "react-native-svg";

const PRIMARY = "#00615F";
const ACCENT_YELLOW = "#ffd600";

// Polling interval in ms — check every 3 seconds
const POLL_INTERVAL_MS = 3000;

// Maximum polling duration — stop after 15 minutes
const POLL_MAX_DURATION_MS = 15 * 60 * 1000;

type PaymentStatus = PaymentStatusData["status"];

function isTerminalStatus(status: PaymentStatus): boolean {
  return status === "success" || status === "failed" || status === "refunded";
}

// Expired = QRIS time window passed but backend still shows pending
function isExpiredQR(expiresAt: string | null, status: PaymentStatus): boolean {
  if (status !== "pending" || !expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function getStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "success":
      return "Pembayaran Berhasil ✅";
    case "failed":
      return "Pembayaran Gagal ❌";
    case "refunded":
      return "Pembayaran Dikembalikan";
    default:
      return "Menunggu Pembayaran...";
  }
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function QrisPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clearCart } = useCartStore();

  const {
    paymentId,
    orderId,
    amount: amountParam,
    qrString: qrStringParam,
    expiresAt: expiresAtParam,
  } = useLocalSearchParams<{
    paymentId: string;
    orderId: string;
    amount: string;
    qrString?: string;
    expiresAt?: string;
  }>();

  const amount = Number(amountParam ?? "0");

  const [status, setStatus] = useState<PaymentStatus>("pending");
  // qrString: raw QRIS string for QR generation (from qr_string field in Midtrans response)
  // qrCodeUrl: image URL hosted by Midtrans (actions[generate-qr-code].url)
  // If qrString is available, use it for QRCode component.
  // If only qrCodeUrl is available, render it as an Image.
  const [qrString, setQrString] = useState<string | null>(qrStringParam ?? null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(expiresAtParam ?? null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Refs for polling lifecycle management
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);
  const isPollingRef = useRef<boolean>(false);

  // ── Navigate to order detail after confirmed success ───────────────────
  const navigateToSuccess = useCallback(() => {
    if (hasNavigated) return; // prevent double-navigation
    setHasNavigated(true);
    clearCart();
    router.replace(`/(customer)/orders/${orderId}`);
  }, [hasNavigated, orderId, router, clearCart]);

  // ── Fetch status from backend (single poll) ───────────────────────────
  const fetchStatus = useCallback(
    async (silent = false): Promise<PaymentStatus> => {
      try {
        const data = await paymentService.getPaymentStatus(paymentId);
        if (!isMountedRef.current) return status;

        setStatus(data.status);
        setPollError(null);

        // Update QR data and expiry from backend response
        if (data.expiresAt && !expiresAt) {
          setExpiresAt(data.expiresAt);
        }
        // qrString: raw data for QRCode component
        if (data.qrString && !qrString) {
          setQrString(data.qrString);
        }
        // qrCodeUrl: Midtrans-hosted image (fallback)
        if ((data as any).qrCodeUrl && !qrCodeUrl) {
          setQrCodeUrl((data as any).qrCodeUrl);
        }

        return data.status;
      } catch (err: any) {
        if (!isMountedRef.current) return status;
        if (!silent) {
          setPollError("Gagal memperbarui status. Ketuk refresh untuk coba lagi.");
        }
        return status;
      }
    },
    [paymentId, status, expiresAt, qrString, qrCodeUrl],
  );

  // ── Polling loop ──────────────────────────────────────────────────────
  const scheduleNextPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
    }

    pollTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current || isPollingRef.current) return;

      // Stop after max duration
      if (Date.now() - pollStartRef.current > POLL_MAX_DURATION_MS) {
        isPollingRef.current = false;
        return;
      }

      isPollingRef.current = true;
      const latestStatus = await fetchStatus(true);
      isPollingRef.current = false;

      if (!isMountedRef.current) return;

      if (latestStatus === "success") {
        navigateToSuccess();
        return;
      }

      if (!isTerminalStatus(latestStatus)) {
        scheduleNextPoll();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchStatus, navigateToSuccess]);

  // ── Lifecycle: start / stop polling ──────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    pollStartRef.current = Date.now();

    // Do an immediate status fetch, then start polling
    fetchStatus(false).then((initialStatus) => {
      if (!isMountedRef.current) return;
      if (initialStatus === "success") {
        navigateToSuccess();
        return;
      }
      if (!isTerminalStatus(initialStatus)) {
        scheduleNextPoll();
      }
    });

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []); // intentionally empty — only run on mount/unmount

  // ── Manual refresh ────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    const latest = await fetchStatus(false);
    setIsRefreshing(false);

    if (latest === "success") {
      navigateToSuccess();
    } else if (!isTerminalStatus(latest) && !pollTimerRef.current) {
      // Restart polling if it had stopped
      scheduleNextPoll();
    }
  };

  // ── Back button: don't cancel payment, just go back ───────────────────
  const handleBack = () => {
    if (status === "pending") {
      Alert.alert(
        "Keluar dari halaman pembayaran?",
        "Pesananmu masih aktif. QR QRIS masih berlaku sampai waktu kedaluwarsa. " +
          "Kamu bisa melihat statusnya di halaman Pesanan.",
        [
          { text: "Tetap di sini", style: "cancel" },
          {
            text: "Keluar",
            style: "destructive",
            onPress: () => router.replace(`/(customer)/orders/${orderId}`),
          },
        ],
      );
    } else {
      router.replace(`/(customer)/orders/${orderId}`);
    }
  };

  // ─── UI ────────────────────────────────────────────────────────────────

  const isExpired = isExpiredQR(expiresAt, status);
  // Treat expired QRIS the same as failed for display purposes
  const isFailedOrExpired = status === "failed" || status === "refunded" || isExpired;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Svg width={20} height={20} fill={PRIMARY} viewBox="0 0 16 16">
            <Path
              fillRule="evenodd"
              d="M11.354 1.646a.5.5 0 010 .708L5.707 8l5.647 5.646a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708l6-6a.5.5 0 01.708 0"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bayar dengan QRIS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
          />
        }
      >
        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Pembayaran</Text>
          <Text style={styles.amountValue}>
            Rp {amount.toLocaleString("id-ID")}
          </Text>
          {expiresAt && (
            <Text style={styles.expiryLabel}>
              Berlaku hingga: {formatExpiry(expiresAt)} WIB
            </Text>
          )}
        </View>

        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            status === "success" && styles.statusBannerSuccess,
            (status === "failed" || isExpired) && styles.statusBannerFailed,
          ]}
        >
          {status === "pending" && !isExpired ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 8 }} />
          ) : null}
          <Text
            style={[
              styles.statusText,
              status === "success" && styles.statusTextSuccess,
              (status === "failed" || isExpired) && styles.statusTextFailed,
            ]}
          >
            {isExpired ? "QRIS Kedaluwarsa ⏰" : getStatusLabel(status)}
          </Text>
        </View>

        {/* QR Code — prefer raw qrString (for QRCode component), fallback to qrCodeUrl (Image) */}
        {status === "pending" && !isExpired ? (
          <View style={styles.qrCard}>
            <Text style={styles.qrInstructions}>
              Buka aplikasi e-wallet / m-banking, lalu scan QR di bawah ini:
            </Text>
            {qrString ? (
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrString}
                  size={220}
                  color="#0F172A"
                  backgroundColor="white"
                  ecl="M"
                />
              </View>
            ) : qrCodeUrl ? (
              // Midtrans-hosted QR image fallback
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={{ width: 220, height: 220 }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.loadingQr}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={styles.loadingQrText}>Memuat QRIS...</Text>
              </View>
            )}
            <Text style={styles.qrHint}>
              Gunakan GoPay, OVO, Dana, ShopeePay, BCA, BNI, Mandiri, atau
              aplikasi bank lain yang mendukung QRIS.
            </Text>
          </View>
        ) : null}

        {/* Success state */}
        {status === "success" && (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Pembayaran Diterima!</Text>
            <Text style={styles.successSubtitle}>
              Pesananmu sedang diproses oleh mitra.
            </Text>
          </View>
        )}

        {/* Error / expired / refunded state */}
        {isFailedOrExpired && (
          <View style={styles.errorCard}>
            <Text style={styles.errorEmoji}>
              {isExpired ? "⏰" : status === "refunded" ? "↩️" : "❌"}
            </Text>
            <Text style={styles.errorTitle}>
              {isExpired
                ? "QRIS Kedaluwarsa"
                : status === "refunded"
                ? "Pembayaran Dikembalikan"
                : "Pembayaran Gagal"}
            </Text>
            <Text style={styles.errorSubtitle}>
              {isExpired
                ? "Waktu pembayaran telah habis."
                : status === "refunded"
                ? "Dana telah dikembalikan ke akun kamu."
                : "Terjadi masalah pada pembayaran."}
            </Text>
            <Text style={[styles.errorSubtitle, { marginTop: 8, fontWeight: '600' }]}>
              Stok tetap tersedia — kamu bisa membuat pesanan baru.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => router.replace("/(customer)")}
              activeOpacity={0.85}
            >
              <Text style={styles.retryBtnText}>Kembali ke Beranda</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Poll error notification */}
        {pollError && (
          <View style={styles.pollErrorBanner}>
            <Text style={styles.pollErrorText}>{pollError}</Text>
          </View>
        )}

        {/* Instructions */}
        {status === "pending" && !isExpired && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Cara Pembayaran</Text>
            {[
              "Buka aplikasi dompet digital atau m-banking",
              'Pilih menu "Scan QR" atau "QRIS"',
              "Arahkan kamera ke QR code di atas",
              "Periksa nominal dan konfirmasi pembayaran",
              "Tunggu konfirmasi otomatis dari halaman ini",
            ].map((step, idx) => (
              <View key={idx} style={styles.instructionRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Refresh button — only when still pending */}
        {status === "pending" && !isExpired && (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            activeOpacity={0.8}
          >
            <Text style={styles.refreshBtnText}>
              {isRefreshing ? "Memperbarui..." : "Perbarui Status"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Go to order detail */}
        <TouchableOpacity
          style={styles.orderDetailBtn}
          onPress={() => router.replace(`/(customer)/orders/${orderId}`)}
          activeOpacity={0.8}
        >
          <Text style={styles.orderDetailBtnText}>Lihat Detail Pesanan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: "#0F172A",
  },

  scroll: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
    alignItems: "center",
  },

  // Amount card
  amountCard: {
    width: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 18,
    padding: Spacing[5],
    alignItems: "center",
    marginBottom: Spacing[3],
  },
  amountLabel: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  expiryLabel: {
    fontSize: FontSize.xs,
    color: ACCENT_YELLOW,
    marginTop: 4,
  },

  // Status banner
  statusBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  statusBannerSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  statusBannerFailed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: "#3B82F6",
  },
  statusTextSuccess: { color: "#059669" },
  statusTextFailed: { color: "#DC2626" },

  // QR Card
  qrCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: Spacing[5],
    alignItems: "center",
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  qrInstructions: {
    fontSize: FontSize.sm,
    color: "#475569",
    textAlign: "center",
    marginBottom: Spacing[4],
    lineHeight: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    marginBottom: Spacing[3],
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  qrHint: {
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
    textAlign: "center",
    lineHeight: 16,
  },

  // Loading QR
  loadingQr: {
    alignItems: "center",
    paddingVertical: Spacing[8],
  },
  loadingQrText: {
    marginTop: Spacing[3],
    color: Colors.neutral[400],
    fontSize: FontSize.sm,
  },

  // Success card
  successCard: {
    width: "100%",
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: Spacing[6],
    alignItems: "center",
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  successEmoji: { fontSize: 56, marginBottom: Spacing[3] },
  successTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: "#065F46",
    marginBottom: Spacing[2],
  },
  successSubtitle: {
    fontSize: FontSize.sm,
    color: "#047857",
    textAlign: "center",
  },

  // Error card
  errorCard: {
    width: "100%",
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    padding: Spacing[6],
    alignItems: "center",
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorEmoji: { fontSize: 56, marginBottom: Spacing[3] },
  errorTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: "#991B1B",
    marginBottom: Spacing[2],
  },
  errorSubtitle: {
    fontSize: FontSize.sm,
    color: "#B91C1C",
    textAlign: "center",
    lineHeight: 20,
  },

  // Poll error
  pollErrorBanner: {
    width: "100%",
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: Spacing[3],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pollErrorText: {
    fontSize: FontSize.xs,
    color: "#92400E",
    textAlign: "center",
  },

  // Instructions
  instructionsCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  instructionsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: "#0F172A",
    marginBottom: Spacing[3],
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing[3],
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: "#334155",
    lineHeight: 20,
  },

  // Buttons
  refreshBtn: {
    width: "100%",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  refreshBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: "#334155",
  },

  orderDetailBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  orderDetailBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: PRIMARY,
  },

  retryBtn: {
    marginTop: 16,
    width: "100%",
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  retryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
  },
});
