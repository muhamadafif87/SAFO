import { Button } from "@/components/ui/Button";
import { orderService } from "@/services/order.service";
import { PLATFORM_FEE, useCartStore } from "@/stores/cart.store";
import type { PaymentMethod } from "@/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// ─── Design Tokens (Figma node 35:135) ─────────────────────────────────────────
const PRIMARY = "#00615F";
const WHITE = "#FFFFFF";
const TEXT_BLACK = "#000000";
const TEXT_DARK = "#363434";
const DIVIDER = "#EAEAEA";
const INPUT_BG = "#F3F3F3";
const GRAY_400 = "#9CA3AF";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  desc: string;
}[] = [
  {
    id: "qris",
    label: "QRIS",
    desc: "Scan QR dari semua aplikasi",
  },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, mitraName, updateQty, clearCart } = useCartStore();

  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qris");
  const [isLoading, setIsLoading] = useState(false);

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
      // 1. Create order
      const order = await orderService.create({
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        note: note.trim() || undefined,
        paymentMethod,
      });

      // 2. Simulate payment gateway callback (mock)
      await orderService.payMock(order.id);

      // 3. Clear cart
      clearCart();

      // 4. Navigate to order detail
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
    } catch (err: any) {
      Alert.alert(
        "Gagal",
        err.response?.data?.message || "Gagal membuat pesanan. Coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 19L8 12L15 5"
                stroke={PRIMARY}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Konfirmasi Pesanan</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Cart kamu kosong</Text>
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
          <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19L8 12L15 5"
              stroke={PRIMARY}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Konfirmasi Pesanan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card 1: Alamat Warung */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alamat Warung</Text>
          <View style={styles.cardDivider} />
          <Text style={styles.mitraName}>{mitraName || "Geprek Kumlot"}</Text>
          <Text style={styles.mitraAddress}>{mitraAddress}</Text>
        </View>

        {/* Card 2: Waktu Pick-up */}
        <View style={styles.cardRowContainer}>
          <Text style={styles.cardTitle}>Waktu Pick-up</Text>
          <Text style={styles.pickupTimeText}>{pickupTimeDisplay}</Text>
        </View>

        {/* Card 3: Detail Pesanan */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detail Pesanan</Text>
          <View style={styles.cardDivider} />
          {items.map((item) => (
            <View key={item.product.id} style={styles.itemRow}>
              {item.product.photoUrl ? (
                <Image
                  source={{ uri: item.product.photoUrl }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.itemImage, styles.imagePlaceholder]}>
                  <Text style={styles.placeholderIcon}>🍱</Text>
                </View>
              )}

              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.product.name}
                </Text>
                <Text style={styles.itemPrice}>
                  Rp {Number(item.product.discountPrice).toLocaleString("id-ID")}
                </Text>
              </View>

              {/* Stepper Kontrol Kuantitas */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => updateQty(item.product.id, item.qty - 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepperBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperQty}>{item.qty}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => updateQty(item.product.id, item.qty + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addMoreBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.addMoreText}>+ Tambah dari toko ini</Text>
          </TouchableOpacity>
        </View>

        {/* Card 4: Catatan Pesanan */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Catatan Pesanan</Text>
          <View style={styles.cardDivider} />
          <TextInput
            style={styles.noteInput}
            placeholder="Contoh : tidak pedas, tambah alat makan"
            placeholderTextColor="#8E8E93"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Card 5: Total & Metode Pembayaran */}
        <View style={styles.card}>
          {/* Subtotal & Fee Rows */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              Rp {subtotal.toLocaleString("id-ID")}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Layanan</Text>
            <Text style={styles.summaryValue}>
              Rp {PLATFORM_FEE.toLocaleString("id-ID")}
            </Text>
          </View>

          <View style={styles.cardDivider} />

          {/* Total Row */}
          <View style={styles.paymentRow}>
            <Text style={styles.cardTitle}>Total Pembayaran</Text>
            <Text style={styles.totalPriceText}>
              Rp {total.toLocaleString("id-ID")}
            </Text>
          </View>

          <View style={styles.cardDivider} />

          {/* Payment Method Row */}
          <View style={styles.paymentRow}>
            <Text style={styles.cardTitle}>Metode Pembayaran</Text>
            <Text style={styles.paymentMethodValue}>
              {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label || "QRIS"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Bar */}
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
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
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
    backgroundColor: WHITE,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 4,
  },
  backBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_BLACK,
    marginLeft: 12,
    letterSpacing: -0.4,
  },
  headerSpacer: {
    width: 28,
  },
  scrollArea: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100, // Space for bottom button
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DIVIDER,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DIVIDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_DARK,
    letterSpacing: -0.4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 10,
  },
  mitraName: {
    fontSize: 13,
    fontWeight: "500",
    color: TEXT_DARK,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  mitraAddress: {
    fontSize: 13,
    fontWeight: "500",
    color: TEXT_DARK,
    lineHeight: 18,
    letterSpacing: -0.3,
  },
  pickupTimeText: {
    fontSize: 13,
    fontWeight: "500",
    color: TEXT_BLACK,
    letterSpacing: -0.3,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 5,
    backgroundColor: "#F3F3F3",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 13,
    fontWeight: "500",
    color: TEXT_BLACK,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: PRIMARY,
    letterSpacing: -0.4,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepperBtn: {
    width: 20,
    height: 20,
    backgroundColor: PRIMARY,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
  stepperQty: {
    fontSize: 13,
    fontWeight: "500",
    color: TEXT_BLACK,
    minWidth: 16,
    textAlign: "center",
  },
  addMoreBtn: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 4,
  },
  addMoreText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: "500",
  },
  noteInput: {
    backgroundColor: INPUT_BG,
    borderRadius: 5,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    color: TEXT_DARK,
    textAlignVertical: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: TEXT_DARK,
  },
  summaryValue: {
    fontSize: 12,
    color: TEXT_DARK,
    fontWeight: "500",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalPriceText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    letterSpacing: -0.3,
  },
  paymentMethodValue: {
    fontSize: 13,
    fontWeight: "500",
    color: TEXT_BLACK,
    letterSpacing: -0.3,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  orderBtn: {
    backgroundColor: PRIMARY,
    height: 52,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  orderBtnDisabled: {
    opacity: 0.7,
  },
  orderBtnText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyText: {
    fontSize: 16,
    color: GRAY_400,
  },
});
