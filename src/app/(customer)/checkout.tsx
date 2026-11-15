import { Button } from "@/components/ui/Button";
import { FontSize, FontWeight, Spacing } from "@/constants/typography";
import { orderService } from "@/services/order.service";
import { paymentService } from "@/services/payment.service";
import { PLATFORM_FEE, useCartStore } from "@/stores/cart.store";
import type { PaymentMethod } from "@/types";
import Mapbox from "@rnmapbox/maps";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
if (MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
}

const PRIMARY = "#00615F";
const ACCENT_YELLOW = "#ffd600";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  desc: string;
  icon?: string;
}[] = [
    {
      id: "qris",
      label: "QRIS",
      desc: "Scan QR dari semua aplikasi dompet & bank",
      icon: "💳",
    },
  ];

// Helper format waktu pickup
function formatPickupWindow(startStr?: string, endStr?: string) {
  if (!startStr || !endStr) {
    return {
      dateLabel: "Hari Ini",
      timeRange: "17:00 - 20:00 WIB",
      status: "Tersedia Hari Ini",
    };
  }

  try {
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        dateLabel: "Hari Ini",
        timeRange: "17:00 - 20:00 WIB",
        status: "Tersedia Hari Ini",
      };
    }

    const startH = String(start.getHours()).padStart(2, "0");
    const startM = String(start.getMinutes()).padStart(2, "0");
    const endH = String(end.getHours()).padStart(2, "0");
    const endM = String(end.getMinutes()).padStart(2, "0");

    const today = new Date();
    const isToday =
      start.getDate() === today.getDate() &&
      start.getMonth() === today.getMonth() &&
      start.getFullYear() === today.getFullYear();

    const dateLabel = isToday
      ? "Hari Ini"
      : start.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

    return {
      dateLabel,
      timeRange: `${startH}:${startM} - ${endH}:${endM} WIB`,
      status: isToday ? "Siap Diambil Hari Ini" : "Jadwal Pengambilan",
    };
  } catch {
    return {
      dateLabel: "Hari Ini",
      timeRange: "17:00 - 20:00 WIB",
      status: "Tersedia Hari Ini",
    };
  }
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    items,
    mitraName,
    mitraAddress: storedAddress,
    mitraLatitude: storedLat,
    mitraLongitude: storedLng,
    clearCart,
    updateQty,
    removeItem,
  } = useCartStore();

  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qris");
  const [isLoading, setIsLoading] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const firstItem = items[0];
  const pickupInfo = formatPickupWindow(
    firstItem?.product.pickupWindowStart,
    firstItem?.product.pickupWindowEnd,
  );

  const displayMitraName =
    mitraName || firstItem?.product?.mitra?.businessName || "Mitra SAFO";
  const displayAddress =
    storedAddress ||
    firstItem?.product?.mitra?.address ||
    "Alamat lokasi pengambilan belum ditentukan";
  const latitude =
    storedLat ?? firstItem?.product?.mitra?.latitude ?? -6.200000;
  const longitude =
    storedLng ?? firstItem?.product?.mitra?.longitude ?? 106.816666;
  const distanceKm = firstItem?.product?.mitra?.distanceKm;

  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.product.discountPrice) * i.qty,
    0,
  );
  const total = subtotal + PLATFORM_FEE;

  const firstProduct = items[0]?.product;
  const formatTime = (iso?: string | null) => {
    if (!iso) return "--.--";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(":", ".");
  };

  const pickupTimeDisplay =
    firstProduct?.pickupWindowStart && firstProduct?.pickupWindowEnd
      ? `${formatTime(firstProduct.pickupWindowStart)} - ${formatTime(firstProduct.pickupWindowEnd)} WIB`
      : "17.00 - 20.00 WIB";

  const mitraAddress =
    firstProduct?.mitra?.address || "Jl. Kartika No 12, Jebres, Surakarta";

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Gagal membuka aplikasi Google Maps.");
    });
  };

  const handleIncreaseQty = (item: (typeof items)[0]) => {
    if (item.qty >= item.product.stock) {
      Alert.alert(
        "Batas Stok",
        `Stok maksimal untuk "${item.product.name}" adalah ${item.product.stock}.`
      );
      return;
    }
    updateQty(item.product.id, item.qty + 1);
  };

  const handleDecreaseQty = (item: (typeof items)[0]) => {
    if (item.qty <= 1) {
      Alert.alert(
        "Hapus Menu",
        `Apakah kamu yakin ingin menghapus "${item.product.name}" dari pesanan?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Hapus",
            style: "destructive",
            onPress: () => removeItem(item.product.id),
          },
        ]
      );
      return;
    }
    updateQty(item.product.id, item.qty - 1);
  };

  const handleOrder = async () => {
    if (items.length === 0) return;

    // Pre-flight: cek stok lokal sebelum kirim ke backend
    const outOfStock = items.find((i) => Number(i.product.stock) < i.qty);
    if (outOfStock) {
      Alert.alert(
        "Stok Tidak Cukup",
        `Stok "${outOfStock.product.name}" saat ini hanya tersisa ${outOfStock.product.stock}. Silakan kurangi jumlah atau hapus dari pesanan.`,
      );
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create order in backend (status: PENDING_PAYMENT)
      const order = await orderService.create({
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        note: note.trim() || undefined,
        paymentMethod,
      });

      if (paymentMethod === "qris") {
        // 2. Create QRIS payment via Midtrans Core API
        const idempotencyKey = `qris-${order.id}-${Date.now()}`;
        try {
          const payment = await paymentService.createQrisPayment(order.id, idempotencyKey);

          // 3. Clear cart since order has been created and stock reserved
          clearCart();

          // 4. Navigate directly to QRIS Payment Screen
          router.replace({
            pathname: "/(customer)/payment/qris",
            params: {
              paymentId: payment.paymentId,
              orderId: order.id,
              amount: String(payment.amount),
              qrString: payment.qrString || "",
              expiresAt: payment.expiresAt || "",
            },
          });
        } catch (payErr: any) {
          clearCart();
          Alert.alert(
            "Pesanan Berhasil Dibuat",
            payErr.response?.data?.message ||
            "Pesanan berhasil dibuat, namun pembayaran QRIS belum dapat ditampilkan. Silakan bayar melalui halaman Pesanan.",
            [
              {
                text: "Lihat Pesanan",
                onPress: () => router.replace("/(customer)/orders"),
              },
            ],
            { cancelable: false },
          );
        }
      } else {
        // Backward compatibility fallback for any other method
        await orderService.payMock(order.id);
        clearCart();
        Alert.alert(
          "Pesanan Berhasil! 🎉",
          `Pesanan kamu sudah dikonfirmasi.\nTunjukkan kode pickup ke mitra saat mengambil.`,
          [
            {
              text: "Lihat Pesanan",
              onPress: () => router.replace("/(customer)/orders"),
            },
          ],
          { cancelable: false },
        );
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const errorText = Array.isArray(msg)
        ? msg.join("\n")
        : (msg || err.message || "Gagal membuat pesanan. Coba lagi.");
      Alert.alert("Gagal", errorText);
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "bottom", "left", "right"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Svg
              width={20}
              height={20}
              fill={PRIMARY}
              viewBox="0 0 16 16"
            >
              <Path
                fillRule="evenodd"
                d="M11.354 1.646a.5.5 0 010 .708L5.707 8l5.647 5.646a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708l6-6a.5.5 0 01.708 0"
              />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Konfirmasi Pesanan</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Keranjang kamu masih kosong</Text>
          <Button
            title="Cari Makanan"
            onPress={() => router.back()}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke={PRIMARY}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Konfirmasi Pesanan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card 1: Alamat Warung & Utilitas Mapbox */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alamat Warung</Text>
          <View style={styles.cardDivider} />

          <View style={styles.addressRow}>
            <View style={styles.addressInfoCol}>
              <Text style={styles.mitraName}>{displayMitraName}</Text>
              <Text style={styles.mitraAddress}>{displayAddress}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.arrowButton,
                isMapExpanded && styles.arrowButtonActive,
              ]}
              onPress={() => setIsMapExpanded((prev) => !prev)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d={isMapExpanded ? "M18 15L12 9L6 15" : "M9 18L15 12L9 6"}
                  stroke={isMapExpanded ? "#FFFFFF" : PRIMARY}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Utilitas Peta Interaktif Mapbox (Accordion View) */}
          {isMapExpanded && (
            <View style={styles.extendedMapContainer}>
              <View style={styles.mapHeaderRow}>
                <Text style={styles.mapHeaderTitle}>Titik Lokasi Toko</Text>
                <TouchableOpacity
                  onPress={handleOpenGoogleMaps}
                  style={styles.openGmapsBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.openGmapsText}>Buka Google Maps ↗</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.mapWrapper}>
                {MAPBOX_ACCESS_TOKEN ? (
                  <Mapbox.MapView
                    style={styles.mapView}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    attributionEnabled={false}
                    logoEnabled={false}
                  >
                    <Mapbox.Camera
                      centerCoordinate={[longitude, latitude]}
                      zoomLevel={15}
                      animationDuration={400}
                    />
                  </Mapbox.MapView>
                ) : (
                  <View style={styles.mapFallback}>
                    <Text style={styles.mapFallbackEmoji}>🗺️</Text>
                    <Text style={styles.mapFallbackText}>
                      Koordinat: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </Text>
                  </View>
                )}

                {/* Marker Pin di Tengah Peta */}
                <View pointerEvents="none" style={styles.markerPinOverlay}>
                  <View style={styles.markerPinPulse}>
                    <View style={styles.markerPinCore}>
                      <Svg
                        width={20}
                        height={20}
                        fill="#ffffff"
                        viewBox="0 0 16 16"
                      >
                        <Path d="M8 16s6-5.686 6-10A6 6 0 002 6c0 4.314 6 10 6 10m0-7a3 3 0 110-6 3 3 0 010 6" />
                      </Svg>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.mapFooter}>
                <Text style={styles.mapFooterText}>
                  📍 {displayAddress}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Card 2: Waktu Pick-up */}
        <View style={styles.pickupCard}>
          <Text style={styles.cardTitle}>Waktu Pick-up</Text>
          <Text style={styles.pickupTimeText}>{pickupTimeDisplay}</Text>
        </View>

        {/* Card 3: Detail Pesanan */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detail Pesanan</Text>
          <View style={styles.cardDivider} />

          {items.map((item) => (
            <View key={item.product.id} style={styles.itemRow}>
              {/* Gambar Menu */}
              <Image
                source={{
                  uri:
                    item.product.photoUrl ||
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
                }}
                style={styles.itemThumbnail}
                resizeMode="cover"
              />

              {/* Detail Menu */}
              <View style={styles.itemDetailCol}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                {item.note ? (
                  <View style={styles.itemNoteChip}>
                    <Text style={styles.itemNoteText} numberOfLines={1}>
                      📝 {item.note}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.itemPrice}>
                  Rp {Number(item.product.discountPrice).toLocaleString("id-ID")}
                </Text>
              </View>

              {/* Stepper Kuantitas */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperMinusBtn}
                  onPress={() => handleDecreaseQty(item)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.stepperMinusText}>-</Text>
                </TouchableOpacity>

                <Text style={styles.stepperQtyText}>{item.qty}</Text>

                <TouchableOpacity
                  style={styles.stepperPlusBtn}
                  onPress={() => handleIncreaseQty(item)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.stepperPlusText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Tombol Tambah Menu Lain */}
          <TouchableOpacity
            style={styles.addMoreBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.addMoreText}>+ Tambah Menu Lain dari Toko Ini</Text>
          </TouchableOpacity>
        </View>

        {/* Card 4: Catatan Pesanan */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Catatan Pesanan</Text>
          <View style={styles.cardDivider} />
          <TextInput
            style={styles.noteInput}
            placeholder="Contoh : tidak pedas, tambah alat makan"
            placeholderTextColor="#888888"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Card 5: Ringkasan Total & Metode Pembayaran */}
        <View style={styles.card}>
          {/* Subtotal Pesanan */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Pesanan</Text>
            <Text style={styles.summaryValue}>
              Rp {subtotal.toLocaleString("id-ID")}
            </Text>
          </View>

          {/* Biaya Layanan SAFO */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Layanan SAFO</Text>
            <Text style={styles.summaryValue}>
              Rp {PLATFORM_FEE.toLocaleString("id-ID")}
            </Text>
          </View>

          <View style={styles.cardDivider} />

          {/* Total Pembayaran */}
          <View style={styles.summaryRow}>
            <Text style={styles.cardTitle}>Total Pembayaran</Text>
            <Text style={styles.totalPriceHighlight}>
              Rp {total.toLocaleString("id-ID")}
            </Text>
          </View>

          <View style={styles.cardDivider} />

          {/* Metode Pembayaran */}
          <View style={styles.summaryRow}>
            <Text style={styles.cardTitle}>Metode Pembayaran</Text>
            <Text style={styles.paymentMethodValue}>QRIS</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={[styles.orderBtn, isLoading && styles.orderBtnDisabled]}
          onPress={handleOrder}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.orderBtnText}>Pesan Sekarang</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  scrollArea: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Base Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: Platform.OS === "android" ? 0.6 : 0,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#363434",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },

  // Card 1: Alamat Warung
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addressInfoCol: {
    flex: 1,
    paddingRight: 10,
  },
  mitraName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#363434",
    marginBottom: 4,
  },
  mitraAddress: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E6F4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowButtonActive: {
    backgroundColor: PRIMARY,
  },

  // Extended Map
  extendedMapContainer: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
  },
  mapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  mapHeaderTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: "#334155",
  },
  openGmapsBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  openGmapsText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
  },
  mapWrapper: {
    width: "100%",
    height: 170,
    position: "relative",
  },
  mapView: {
    ...StyleSheet.absoluteFill,
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },
  mapFallbackEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  mapFallbackText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  markerPinOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  markerPinPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 97, 95, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  markerPinCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  mapFooter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  mapFooterText: {
    fontSize: 11,
    color: "#64748B",
  },

  // Card 2: Waktu Pick-up
  pickupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: Platform.OS === "android" ? 0.6 : 0,
    borderColor: "#E2E8F0",
  },
  pickupTimeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#363434",
  },

  // Card 3: Detail Pesanan
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  itemThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  itemDetailCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 3,
  },
  itemNoteChip: {
    backgroundColor: "#F8FAFC",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemNoteText: {
    fontSize: 10,
    color: "#64748B",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepperMinusBtn: {
    width: 26,
    height: 26,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  stepperMinusText: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY,
    lineHeight: 18,
  },
  stepperQtyText: {
    width: 24,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
  },
  stepperPlusBtn: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperPlusText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 18,
  },
  addMoreBtn: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  addMoreText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "600",
  },

  // Card 4: Catatan Pesanan
  noteInput: {
    backgroundColor: "#F3F3F3",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: "#363434",
    minHeight: 50,
    textAlignVertical: "top",
  },

  // Card 5: Ringkasan & Pembayaran
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1E293B",
  },
  totalPriceHighlight: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
  },
  paymentMethodValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#000000",
  },

  // Bottom Bar
  bottomBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  orderBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBtnDisabled: {
    opacity: 0.65,
  },
  orderBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Empty State
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[3],
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: "#64748B",
    fontWeight: FontWeight.medium,
  },
});
