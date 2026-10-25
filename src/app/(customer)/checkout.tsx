import { Button } from "@/components/ui/Button";
import {
  BorderRadius,
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from "@/constants/typography";
import { orderService } from "@/services/order.service";
import { paymentService } from "@/services/payment.service";
import { PLATFORM_FEE, useCartStore } from "@/stores/cart.store";
import type { PaymentMethod } from "@/types";
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
import Mapbox from "@rnmapbox/maps";

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
  icon: string;
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

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Gagal membuka aplikasi Google Maps.");
    });
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
                text: "Buka Detail Pesanan",
                onPress: () => router.replace(`/(customer)/orders/${order.id}`),
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
              onPress: () => router.replace(`/(customer)/orders/${order.id}`),
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. LOKASI PENGAMBILAN & EXTENDED MAP VIEW */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Svg
                width={16}
                height={16}
                fill={PRIMARY}
                viewBox="0 0 16 16"
              >
                <Path d="M8 16s6-5.686 6-10A6 6 0 002 6c0 4.314 6 10 6 10m0-7a3 3 0 110-6 3 3 0 010 6" />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Lokasi Pengambilan</Text>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationDetails}>
              <View style={styles.mitraTitleRow}>
                <Text style={styles.mitraName}>{displayMitraName}</Text>
                {distanceKm ? (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{distanceKm} km</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.pickupAddress}>{displayAddress}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.mapButton,
                isMapExpanded && styles.mapButtonActive,
              ]}
              onPress={() => setIsMapExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Svg
                width={20}
                height={20}
                fill={isMapExpanded ? ACCENT_YELLOW : PRIMARY}
                viewBox="0 0 16 16"
              >
                <Path
                  fillRule="evenodd"
                  d="M16 .5a.5.5 0 00-.598-.49L10.5.99 5.598.01a.5.5 0 00-.196 0l-5 1A.5.5 0 000 1.5v14a.5.5 0 00.598.49l4.902-.98 4.902.98a.5.5 0 00.196 0l5-1A.5.5 0 0016 14.5zM5 14.09V1.11l.5-.1.5.1v12.98l-.402-.08a.5.5 0 00-.196 0zm5 .8V1.91l.402.08a.5.5 0 00.196 0L11 1.91v12.98l-.5.1z"
                />
              </Svg>
              <Text
                style={[
                  styles.mapBtnText,
                  isMapExpanded && styles.mapBtnTextActive,
                ]}
              >
                {isMapExpanded ? "Tutup" : "Peta"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* EXTENDED LAYOUT: MAP VIEW SAAT ICON MAP DITEKAN */}
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
                        width={22}
                        height={22}
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

        {/* 2. LAYOUT INFORMASI WAKTU PICKUP */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Svg
                width={16}
                height={16}
                fill={PRIMARY}
                viewBox="0 0 16 16"
              >
                <Path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                <Path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Waktu Pengambilan</Text>
            <View style={styles.pickupDateBadge}>
              <Text style={styles.pickupDateBadgeText}>
                {pickupInfo.dateLabel}
              </Text>
            </View>
          </View>

          <View style={styles.pickupInfoCard}>
            <View style={styles.pickupTimeRow}>
              <View style={styles.pickupClockIconWrap}>
                <Text style={styles.pickupClockEmoji}>⏰</Text>
              </View>
              <View style={styles.pickupTimeCol}>
                <Text style={styles.pickupTimeLabel}>Estimasi Jam Pickup</Text>
                <Text style={styles.pickupTimeValue}>{pickupInfo.timeRange}</Text>
              </View>
            </View>
            <View style={styles.pickupNoteRow}>
              <Text style={styles.pickupNoteBullet}>•</Text>
              <Text style={styles.pickupNoteMessage}>
                Ambil pesanan langsung di toko sebelum batas waktu pickup berakhir
                agar pesanan tetap fresh dan siap diserahkan oleh mitra.
              </Text>
            </View>
          </View>
        </View>

        {/* 3. ORDER SUMMARY (RINGKASAN PESANAN DENGAN GAMBAR PRODUK) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Svg
                width={16}
                height={16}
                fill={PRIMARY}
                viewBox="0 0 16 16"
              >
                <Path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 10H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 4l1.25 5h8.22l1.25-5H3.14zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Ringkasan Pesanan</Text>
            <Text style={styles.itemCountTag}>{items.length} Menu</Text>
          </View>

          {items.map((item) => (
            <View key={item.product.id} style={styles.itemRow}>
              {/* Gambar Produk */}
              <Image
                source={{
                  uri:
                    item.product.photoUrl ||
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
                }}
                style={styles.itemThumbnail}
                resizeMode="cover"
              />

              {/* Detail Produk */}
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
                  Rp{" "}
                  {Number(item.product.discountPrice).toLocaleString("id-ID")}
                  {"  "}
                  <Text style={styles.itemQtyMultiplier}>x{item.qty}</Text>
                </Text>
              </View>

              {/* Subtotal Item */}
              <View style={styles.itemRightCol}>
                <Text style={styles.itemSubtotal}>
                  Rp{" "}
                  {(
                    Number(item.product.discountPrice) * item.qty
                  ).toLocaleString("id-ID")}
                </Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addMoreBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.addMoreText}>+ Tambah Menu Lain dari Toko Ini</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Catatan Pesanan */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Svg
                width={16}
                height={16}
                fill={PRIMARY}
                viewBox="0 0 16 16"
              >
                <Path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z" />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Catatan Pesanan</Text>
            <Text style={styles.optionalTag}>(opsional)</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Contoh: jangan terlalu pedas, kuah dipisah..."
            placeholderTextColor={Colors.neutral[400]}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.charCount}>{note.length}/200</Text>
        </View>

        {/* 5. Metode Pembayaran */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Svg
                width={16}
                height={16}
                fill={PRIMARY}
                viewBox="0 0 16 16"
              >
                <Path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1H2zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z" />
                <Path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1z" />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          </View>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentOption,
                paymentMethod === method.id && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod(method.id)}
              activeOpacity={0.7}
            >
              <View style={styles.paymentLeft}>
                <View style={styles.paymentIconWrap}>
                  <Text style={styles.paymentIcon}>{method.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.paymentLabel,
                      paymentMethod === method.id && styles.paymentLabelSelected,
                    ]}
                  >
                    {method.label}
                  </Text>
                  <Text style={styles.paymentDesc}>{method.desc}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.radio,
                  paymentMethod === method.id && styles.radioSelected,
                ]}
              >
                {paymentMethod === method.id && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, Spacing[4]) },
        ]}
      >
        <View style={styles.summaryRows}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Pesanan</Text>
            <Text style={styles.summaryValue}>
              Rp {subtotal.toLocaleString("id-ID")}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Layanan SAFO</Text>
            <Text style={styles.summaryValue}>
              Rp {PLATFORM_FEE.toLocaleString("id-ID")}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalValue}>
              Rp {total.toLocaleString("id-ID")}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.orderBtn, isLoading && styles.orderBtnDisabled]}
          onPress={handleOrder}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.orderBtnText}>
              Bayar & Konfirmasi · Rp {total.toLocaleString("id-ID")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

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

  scrollArea: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing[3],
    gap: Spacing[2],
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#E6F4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: "#0F172A",
    flex: 1,
  },
  itemCountTag: {
    fontSize: FontSize.xs,
    color: PRIMARY,
    fontWeight: FontWeight.semiBold,
    backgroundColor: "#E6F4F2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  optionalTag: {
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
  },

  // 1. Lokasi Pengambilan
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4FBF9",
    borderWidth: 1,
    borderColor: "#D3EBE7",
    borderRadius: 14,
    padding: 14,
    gap: Spacing[3],
  },
  locationDetails: {
    flex: 1,
  },
  mitraTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  mitraName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: "#0F172A",
  },
  distanceBadge: {
    backgroundColor: ACCENT_YELLOW,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: "#000000",
  },
  pickupAddress: {
    fontSize: FontSize.sm,
    color: "#475569",
    lineHeight: 18,
  },
  mapButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E6F4F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BDE2DC",
  },
  mapButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  mapBtnText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: PRIMARY,
    marginTop: 2,
  },
  mapBtnTextActive: {
    color: ACCENT_YELLOW,
  },

  // Extended Map Layout
  extendedMapContainer: {
    marginTop: Spacing[3],
    borderRadius: 14,
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
    borderRadius: 8,
  },
  openGmapsText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
  },
  mapWrapper: {
    width: "100%",
    height: 180,
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
    fontSize: 32,
    marginBottom: 4,
  },
  mapFallbackText: {
    fontSize: FontSize.xs,
    color: "#475569",
    fontWeight: FontWeight.medium,
  },
  markerPinOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  markerPinPulse: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 97, 95, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  markerPinCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  mapFooter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  mapFooterText: {
    fontSize: FontSize.xs,
    color: "#64748B",
  },

  // 2. Waktu Pickup Card
  pickupDateBadge: {
    backgroundColor: ACCENT_YELLOW,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pickupDateBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: "#000000",
  },
  pickupInfoCard: {
    backgroundColor: "#F0FAF9",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CCEAE5",
  },
  pickupTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  pickupClockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BDE2DC",
  },
  pickupClockEmoji: {
    fontSize: 22,
  },
  pickupTimeCol: {
    flex: 1,
  },
  pickupTimeLabel: {
    fontSize: FontSize.xs,
    color: "#004846",
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  pickupTimeValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: PRIMARY,
  },
  pickupNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 97, 95, 0.12)",
  },
  pickupNoteBullet: {
    fontSize: FontSize.sm,
    color: PRIMARY,
    lineHeight: 18,
  },
  pickupNoteMessage: {
    flex: 1,
    fontSize: FontSize.xs,
    color: "#004846",
    lineHeight: 18,
  },

  // 3. Ringkasan Pesanan (dengan gambar)
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  itemThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemDetailCol: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: "#1E293B",
    marginBottom: 2,
  },
  itemNoteChip: {
    backgroundColor: "#F8FAFC",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemNoteText: {
    fontSize: 10,
    color: "#64748B",
  },
  itemPrice: {
    fontSize: FontSize.xs,
    color: "#64748B",
  },
  itemQtyMultiplier: {
    fontWeight: FontWeight.bold,
    color: PRIMARY,
  },
  itemRightCol: {
    alignItems: "flex-end",
  },
  itemSubtotal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: "#0F172A",
  },

  addMoreBtn: {
    marginTop: Spacing[3],
    paddingVertical: Spacing[2],
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  addMoreText: {
    fontSize: FontSize.xs,
    color: PRIMARY,
    fontWeight: FontWeight.bold,
  },

  // 4. Catatan Pesanan
  noteInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: Spacing[3],
    fontSize: FontSize.sm,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    textAlignVertical: "top",
    minHeight: 76,
  },
  charCount: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "right",
    marginTop: Spacing[1],
  },

  // 5. Metode Pembayaran
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing[3],
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: Spacing[2],
    backgroundColor: "#FFFFFF",
  },
  paymentOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#F0FAF9",
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  paymentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIcon: { fontSize: 20 },
  paymentLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: "#1E293B",
  },
  paymentLabelSelected: { color: PRIMARY },
  paymentDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  radioSelected: { borderColor: PRIMARY },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },

  // Bottom Bar
  bottomBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  summaryRows: { marginBottom: Spacing[3] },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: { fontSize: FontSize.xs, color: "#64748B" },
  summaryValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: "#1E293B",
  },
  totalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 4,
    marginBottom: 0,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: "#0F172A",
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: PRIMARY,
  },

  orderBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  orderBtnDisabled: { opacity: 0.65 },
  orderBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[3],
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 56 },
  emptyText: {
    fontSize: FontSize.md,
    color: "#64748B",
    fontWeight: FontWeight.medium,
  },
});
