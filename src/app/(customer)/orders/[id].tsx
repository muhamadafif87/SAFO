import { orderService } from "@/services/order.service";
import { paymentService } from "@/services/payment.service";
import type { Order, OrderStatus } from "@/types";
import { Asset } from "expo-asset";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import Svg, { Path, SvgUri } from "react-native-svg";

const PRIMARY = "#00615F";
const DIVIDER = "#EAEAEA";
const STATUS_GOLD = "#E2B640";

const STATUS_STEPS: {
  key: OrderStatus;
  label: string;
  icon: number;
}[] = [
  {
    key: "paid",
    label: "Pesanan Disiapkan",
    icon: require("@/assets/images/figma/order-step-prepare.svg"),
  },
  {
    key: "accepted",
    label: "Pesanan Siap Diambil",
    icon: require("@/assets/images/figma/order-step-ready.svg"),
  },
  {
    key: "completed",
    label: "Selesai",
    icon: require("@/assets/images/figma/order-step-complete.svg"),
  },
];

const STATUS_ORDER_INDEX: Partial<Record<OrderStatus, number>> = {
  pending_payment: -1,
  paid: 0,
  processing: 0,
  accepted: 1,
  ready: 1,
  ready_for_pickup: 1,
  completed: 2,
  cancelled: -1,
  expired: -1,
};

function getStatusIndex(status: OrderStatus): number {
  return STATUS_ORDER_INDEX[status] ?? -1;
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending_payment":
      return "Menunggu Pembayaran";
    case "paid":
      return "Menunggu Diproses";
    case "accepted":
      return "Pesanan Diterima";
    case "processing":
    case "ready":
      return "Pesanan Sedang Disiapkan";
    case "ready_for_pickup":
      return "Pesanan Siap Diambil";
    case "completed":
      return "Selesai";
    case "cancelled":
      return "Pesanan Dibatalkan";
    case "expired":
      return "Pesanan Kedaluwarsa";
  }
}

function formatCurrency(value: number | string | null | undefined): string {
  return `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;
}

function formatOrderDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ${hours} : ${minutes}`;
}

const DYNAMIC_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Menunggu Pembayaran",
  paid: "Pesanan Sedang Disiapkan",
  processing: "Pesanan Sedang Disiapkan",
  accepted: "Pesanan Diterima ✅",
  ready: "Pesanan Siap Diambil 🍿",
  ready_for_pickup: "Pesanan Siap Diambil 🍿",
  completed: "Pesanan Selesai ✅",
  cancelled: "Pesanan Dibatalkan",
  expired: "Pesanan Kedaluwarsa",
};

// Status-based text color
function getStatusColor(status: OrderStatus): string {
  if (
    status === "paid" ||
    status === "accepted" ||
    status === "ready" ||
    status === "ready_for_pickup"
  )
    return "#059669";
  if (status === "completed") return "#00615F";
  if (status === "cancelled" || status === "expired") return "#DC2626";
  return "#E2B640"; // pending_payment
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CustomerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const orderRef = useRef<Order | null>(null);

  const fetchOrder = useCallback(
    async (isRefresh = false) => {
      try {
        if (!id) return;
        if (isRefresh) setRefreshing(true);
        const data = await orderService.getById(id);
        setOrder(data);
        orderRef.current = data;
      } catch (err: any) {
        // 401 ditangani oleh Axios interceptor (session expired → redirect login)
        if (err?.response?.status === 401) return;
        Alert.alert(
          "Error",
          err.response?.data?.message || "Gagal memuat pesanan",
        );
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(customer)/orders");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, router],
  );

  const handlePayNow = async () => {
    if (!order) return;
    setIsPaying(true);
    try {
      const idempotencyKey = `qris-${order.id}-${Date.now()}`;
      const payment = await paymentService.createQrisPayment(
        order.id,
        idempotencyKey,
      );
      router.push({
        pathname: "/(customer)/payment/qris",
        params: {
          paymentId: payment.paymentId,
          orderId: order.id,
          amount: String(payment.amount),
          qrString: payment.qrString || "",
          expiresAt: payment.expiresAt || "",
        },
      });
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      Alert.alert(
        "Gagal Memuat Pembayaran",
        err.response?.data?.message ||
          "Terjadi kesalahan saat memuat QRIS. Silakan coba lagi.",
      );
    } finally {
      setIsPaying(false);
    }
  };

  // Re-fetch whenever screen comes into focus (e.g. returning from QRIS screen)
  useFocusEffect(
    useCallback(() => {
      fetchOrder();
    }, [fetchOrder]),
  );

  useEffect(() => {
    // Auto-refresh interval while order is active:
    // Poll every 4 seconds if pending_payment (reconciles with Midtrans when paid),
    // or every 8 seconds if order is active (preparing / ready for pickup).
    const pollInterval =
      orderRef.current?.status === "pending_payment" ? 4000 : 8000;
    const interval = setInterval(() => {
      const current = orderRef.current;
      if (
        current &&
        current.status !== "completed" &&
        current.status !== "cancelled" &&
        current.status !== "expired"
      ) {
        fetchOrder();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [id, fetchOrder, order?.status]);

  const handleViewLocation = () => {
    const { latitude, longitude, address, businessName } = order?.mitra || {};
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(url).catch(() => {
        Alert.alert(
          businessName || "Lokasi Warung",
          address || "Alamat lokasi tidak dapat dibuka di peta",
        );
      });
    } else {
      Alert.alert(
        businessName || "Lokasi Warung",
        address || "Alamat lokasi warung belum tersedia",
      );
    }
  };

  if (loading && !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00615F" />
      </View>
    );
  }

  if (!order) return null;

  const currentStep = getStatusIndex(order.status);
  const items = order.items ?? order.orderItems ?? [];
  const pickupChars = order.pickupCode
    ? order.pickupCode.split("")
    : ["X", "X", "X", "X"];
  const paymentTime =
    order.payments?.[0]?.paidAt || order.updatedAt || order.createdAt;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19l-7-7 7-7"
              stroke="#005B4F"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Pesanan</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrder(true)}
            colors={["#00615F"]}
          />
        }
      >
        {/* ── Main Card (Wireframe Style) ── */}
        <View style={styles.card}>
          {/* Restaurant / Warung Name */}
          <Text numberOfLines={1} style={styles.restaurantName}>
            {order.mitra?.businessName || "Nama Warung"}
          </Text>

          {/* Dynamic Status Text */}
          <Text
            style={[
              styles.dynamicStatus,
              { color: getStatusColor(order.status) },
            ]}
          >
            {DYNAMIC_STATUS_LABEL[order.status] || "Pesanan Sedang Disiapkan"}
          </Text>

          {/* ── Status Stepper (only show for active or completed orders) ── */}
          {order.status !== "cancelled" && order.status !== "expired" ? (
            <View style={styles.stepperContainer}>
              <View style={styles.stepperRow}>
                {STATUS_STEPS.map((step, idx) => {
                  const isPassed = currentStep >= idx;
                  const isActive = currentStep === idx;
                  return (
                    <React.Fragment key={step.key}>
                      <View style={styles.stepCircleWrapper}>
                        <View
                          style={[
                            styles.stepCircle,
                            (isActive || isPassed) && styles.stepCircleActive,
                          ]}
                        >
                          <SvgUri
                            uri={Asset.fromModule(step.icon).uri}
                            onError={(error) =>
                              console.error(
                                "[orders] Gagal memuat ikon status:",
                                error,
                              )
                            }
                          />
                        </View>
                      </View>
                      {idx < STATUS_STEPS.length - 1 && (
                        <View
                          style={[
                            styles.stepLine,
                            currentStep > idx && styles.stepLineActive,
                          ]}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Step Labels */}
              <View style={styles.stepLabelsRow}>
                {STATUS_STEPS.map((step, idx) => (
                  <View
                    key={step.key}
                    style={[
                      styles.stepLabelItem,
                      idx === 0 && styles.firstStepLabel,
                      idx === 1 && styles.secondStepLabel,
                      idx === 2 && styles.thirdStepLabel,
                    ]}
                  >
                    <Text numberOfLines={1} style={styles.stepLabelText}>
                      {step.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.failedBadgeWrapper}>
              <View style={styles.failedBadge}>
                <Text style={styles.failedBadgeText}>
                  {order.status === "cancelled"
                    ? "❌ Transaksi Dibatalkan"
                    : "⏰ Batas Waktu Pembayaran Habis"}
                </Text>
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* ── Kode Pengambilan / Pending Payment / Inactive ── */}
          {order.status === "pending_payment" ? (
            <View style={styles.pendingPaymentSection}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  ⏳ Menunggu Pembayaran
                </Text>
              </View>
              <Text style={styles.pendingPaymentTitle}>
                Selesaikan Pembayaran
              </Text>
              <Text style={styles.pendingPaymentSubtitle}>
                Pesanan belum dibayar. Buka QRIS untuk membayar agar pesanan
                langsung disiapkan oleh mitra.
              </Text>
              <TouchableOpacity
                style={styles.payButton}
                activeOpacity={0.85}
                disabled={isPaying}
                onPress={handlePayNow}
              >
                {isPaying ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.payButtonText}>
                    Bayar Sekarang (QRIS)
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : order.status === "cancelled" || order.status === "expired" ? (
            <View style={styles.inactiveSection}>
              <Text style={styles.inactiveTitle}>
                {order.status === "cancelled"
                  ? "Pesanan Dibatalkan ❌"
                  : "Pesanan Kedaluwarsa ⏰"}
              </Text>
              <Text style={styles.inactiveSubtitle}>
                {order.status === "cancelled"
                  ? "Pembayaran tidak berhasil. Stok tetap tersedia — kamu bisa membuat pesanan baru."
                  : "Waktu pembayaran telah habis. Stok tetap tersedia — kamu bisa membuat pesanan baru."}
              </Text>
              <TouchableOpacity
                style={styles.newOrderBtn}
                activeOpacity={0.85}
                onPress={() => router.replace("/(customer)")}
              >
                <Text style={styles.newOrderBtnText}>🛒 Buat Pesanan Baru</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickupSection}>
              <Text style={styles.pickupTitle}>Kode Pengambilan</Text>
              <Text style={styles.pickupSubtitle}>
                Tunjukkan QR atau kode 4 digit ini ke petugas toko
              </Text>

              {/* QR Code with Teal Border */}
              <View style={styles.qrWrapper}>
                <QRCode
                  value={`SAFO-PICKUP-${order.pickupCode || order.id.slice(0, 4)}`}
                  size={246}
                  color="#000000"
                  backgroundColor="#ffffff"
                />
              </View>

              {/* 4 Digit Code Boxes */}
              <View style={styles.pickupCodeRow}>
                {pickupChars.map((char, index) => (
                  <View key={index} style={styles.pickupBox}>
                    <Text style={styles.pickupBoxText}>{char}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.summaryDivider} />

          {/* ── Order Item Summary ── */}
          <View style={styles.itemsSection}>
            {items.map((item) => {
              const itemQty = item.qty;
              const price = Number(item.priceAtPurchase || 0);
              const photo = item.product?.photoUrl;
              return (
                <View key={item.id} style={styles.productRow}>
                  {photo ? (
                    <Image
                      source={{ uri: photo }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[styles.productImage, styles.imagePlaceholder]}
                    >
                      <Text style={styles.placeholderIcon}>🍱</Text>
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text numberOfLines={1} style={styles.productName}>
                      {item.product?.name || "Produk Pesanan"}
                    </Text>
                    <Text style={styles.productQtyPrice}>
                      {itemQty} X Rp {price.toLocaleString("id-ID")}
                    </Text>
                  </View>
                  <Text style={styles.productPriceTotal}>
                    Rp {(itemQty * price).toLocaleString("id-ID")}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ── Metadata Info Table ── */}
          <View style={styles.metadataSection}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Waktu Pemesanan</Text>
              <Text style={styles.metaValue}>
                {formatOrderDate(order.createdAt)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Waktu Pembayaran</Text>
              <Text style={styles.metaValue}>
                {formatOrderDate(paymentTime)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>No. Pesanan</Text>
              <Text style={styles.metaValue}>
                #{order.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* ── Button Actions ── */}
          <View style={styles.actionButtonContainer}>
            {order.status !== "cancelled" && order.status !== "expired" && (
              <TouchableOpacity
                style={styles.chatButton}
                activeOpacity={0.85}
                onPress={() => router.push(`/(customer)/chat/${order.id}`)}
              >
                <Text style={styles.chatButtonText}>💬 Hubungi Warung</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.locationButton}
              activeOpacity={0.85}
              onPress={handleViewLocation}
            >
              <Text style={styles.locationButtonText}>Lihat Lokasi Warung</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stylesheet ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },

  // Header
  header: {
    height: 40,
    marginTop: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    gap: 12,
  },
  backButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Poppins",
    color: "#000000",
    textAlign: "left",
  },

  // Scroll Content
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  // Main Card
  card: {
    width: 342,
    maxWidth: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  // Restaurant & Status
  restaurantName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins",
    color: "#000000",
    textAlign: "left",
    lineHeight: 20,
    marginBottom: 2,
  },
  dynamicStatus: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins",
    color: "#E2B640",
    textAlign: "left",
    lineHeight: 18,
    marginBottom: 8,
  },

  // Stepper
  stepperContainer: {
    width: 260,
    maxWidth: "100%",
    alignSelf: "center",
    marginBottom: 0,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  stepCircleWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    borderWidth: 2.5,
    borderColor: "#00D078",
    shadowColor: "#00D078",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 5,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#D9D9D9",
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: "#00D078",
  },
  stepLabelsRow: {
    marginTop: 8,
    width: "100%",
    height: 12,
    position: "relative",
  },
  stepLabelItem: {
    alignItems: "center",
    position: "absolute",
  },
  firstStepLabel: {
    left: -25,
    width: 90,
  },
  secondStepLabel: {
    left: 76,
    width: 108,
  },
  thirdStepLabel: {
    left: 218,
    width: 44,
  },
  stepLabelText: {
    fontSize: 9,
    fontFamily: "Poppins",
    fontWeight: "400",
    color: "#000000",
    textAlign: "center",
    lineHeight: 12,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginTop: 18,
    marginBottom: 8,
    width: "100%",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginTop: 25,
    marginBottom: 15,
    width: "100%",
  },

  // Pickup Section
  pickupSection: {
    alignItems: "center",
    width: "100%",
  },
  pickupTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Poppins",
    color: "#000000",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 4,
  },
  pickupSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    fontFamily: "Poppins",
    color: "#000000",
    textAlign: "center",
    maxWidth: 235,
    lineHeight: 21,
    marginBottom: 8,
  },
  qrWrapper: {
    borderWidth: 9,
    borderColor: "#00615F",
    borderRadius: 12,
    padding: 0,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  pickupCodeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  pickupBox: {
    width: 36,
    height: 38,
    backgroundColor: "#D9D9D9",
    borderWidth: 2,
    borderColor: "#00615F",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupBoxText: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "700",
    fontFamily: "Poppins",
    color: "#000000",
  },

  // Items Summary
  itemsSection: {
    width: "100%",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  productImage: {
    width: 46,
    height: 46,
    borderRadius: 4,
    marginRight: 8,
  },
  imagePlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: 20,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins",
    color: "#000000",
    lineHeight: 16,
  },
  productQtyPrice: {
    fontSize: 10,
    fontFamily: "Poppins",
    color: "#555555",
    lineHeight: 12,
  },
  productPriceTotal: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins",
    color: "#000000",
    marginLeft: 8,
  },

  // Metadata Table
  metadataSection: {
    width: "100%",
    marginTop: 0,
    gap: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 9,
    fontFamily: "Poppins",
    color: "#333333",
    lineHeight: 12,
  },
  metaValue: {
    fontSize: 9,
    fontFamily: "Poppins",
    color: "#333333",
    textAlign: "right",
    lineHeight: 12,
  },

  // Action Buttons
  actionButtonContainer: {
    width: 288,
    maxWidth: "100%",
    alignSelf: "center",
    marginTop: 11,
    gap: 8,
  },
  chatButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#00615F",
    borderRadius: 5,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  chatButtonText: {
    color: "#00615F",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Poppins",
    lineHeight: 16,
  },
  locationButton: {
    backgroundColor: "#00615F",
    borderRadius: 5,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  locationButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Poppins",
    lineHeight: 16,
  },

  // Pending Payment & Inactive Sections
  pendingPaymentSection: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: "#FFFBEA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F6E05E",
    marginVertical: 4,
  },
  pendingBadge: {
    backgroundColor: "#FEFCBF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B7791F",
    fontFamily: "Poppins",
  },
  pendingPaymentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2D3748",
    fontFamily: "Poppins",
    marginBottom: 4,
    textAlign: "center",
  },
  pendingPaymentSubtitle: {
    fontSize: 12,
    color: "#718096",
    fontFamily: "Poppins",
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  payButton: {
    backgroundColor: "#00615F",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#00615F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins",
  },
  inactiveSection: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#F7FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 4,
  },
  inactiveTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A0AEC0",
    fontFamily: "Poppins",
    marginBottom: 4,
  },
  inactiveSubtitle: {
    fontSize: 12,
    color: "#A0AEC0",
    fontFamily: "Poppins",
    textAlign: "center",
  },
  newOrderBtn: {
    backgroundColor: "#00615F",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 14,
  },
  newOrderBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins",
  },
  failedBadgeWrapper: {
    marginVertical: 10,
    alignItems: "center",
  },
  failedBadge: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  failedBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
    fontFamily: "Poppins",
  },
});
