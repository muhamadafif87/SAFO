import {
  BorderRadius,
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from "@/constants/typography";
import { productService } from "@/services/product.service";
import { useCartStore } from "@/stores/cart.store";
import type { Product } from "@/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = "#1a5c52";
const PRIMARY_LIGHT = "#e8f4f1";
const WHITE = "#ffffff";
const GRAY_50 = "#f9fafb";
const GRAY_100 = "#f3f4f6";
const GRAY_200 = "#e5e7eb";
const GRAY_300 = "#d1d5db";
const GRAY_400 = "#9ca3af";
const GRAY_500 = "#6b7280";
const GRAY_700 = "#374151";
const GRAY_900 = "#111827";
const RED = "#ef4444";
const YELLOW = "#fbbf24";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const { addItem, forceAddItem } = useCartStore();

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const data = await productService.getById(id);
        setProduct(data);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Gagal memuat produk");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;

    // Use a custom object extending product to include the note if needed,
    // or typically we store notes per order item. The cartStore adds items.
    const result = addItem(product, quantity);

    if (result === "mitra_conflict") {
      Alert.alert(
        "Ganti Toko?",
        "Cart kamu berisi produk dari toko lain. Apakah kamu ingin mengosongkan cart dan mulai pesanan dari toko ini?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ganti Toko",
            style: "destructive",
            onPress: () => {
              forceAddItem(product, quantity);
              Alert.alert(
                "Ditambahkan!",
                `${product.name} (x${quantity}) ditambahkan ke pesanan.`,
              );
              router.back();
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      "Berhasil",
      `${product.name} (x${quantity}) ditambahkan ke pesanan!`,
    );
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (!product) return null;

  const discountAmount =
    Number(product.originalPrice) - Number(product.discountPrice);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const maxQty = Math.min(product.stock, 10);
  const isSoldOut = product.stock <= 0 || product.status === "sold_out";

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Full Width Image Header */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: product.photoUrl || "https://via.placeholder.com/400",
            }}
            style={styles.image}
            resizeMode="cover"
          />
          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: Math.max(insets.top, 16) }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>{"<"}</Text>
          </TouchableOpacity>
        </View>

        {/* Content Sheet (overlapping image) */}
        <View style={styles.sheet}>
          {/* Title Row */}
          <Text style={styles.title}>{product.name}</Text>

          {/* Subtitle Row (Mitra Name + Rating) */}
          <View style={styles.mitraRow}>
            <Text style={styles.mitraName}>{product.mitra?.businessName}</Text>
            <View style={styles.ratingWrap}>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.ratingText}>
                {product.avgRating} ({product.reviewCount})
              </Text>
            </View>
          </View>

          {/* Price Row */}
          <View style={styles.priceRow}>
            <View style={styles.priceLeft}>
              <Text style={styles.discountPrice}>
                Rp {Number(product.discountPrice).toLocaleString("id-ID")}
              </Text>
              <Text style={styles.originalPrice}>
                Rp{Number(product.originalPrice).toLocaleString("id-ID")}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                Hemat Rp {discountAmount.toLocaleString("id-ID")}
              </Text>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deskripsi</Text>
            <Text style={styles.descText}>{product.description}</Text>
          </View>

          <View style={styles.divider} />

          {/* Info Rows */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sisa Stok</Text>
            <Text style={styles.stockValue}>{product.stock}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Waktu Pickup</Text>
            <Text style={styles.infoValue}>
              {formatTime(product.pickupWindowStart)} -{" "}
              {formatTime(product.pickupWindowEnd)} WIB
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lokasi Toko</Text>
            <Text style={styles.infoValue}>{product.mitra?.address}</Text>
          </View>

          <View style={styles.divider} />

          {/* Quantity Section */}
          <View style={styles.qtyRow}>
            <Text style={styles.sectionTitle}>Jumlah Pesanan</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNumber}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.min(maxQty, quantity + 1))}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Note Section */}
          <View style={styles.noteSection}>
            <Text style={styles.sectionTitle}>Catatan Pesanan</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Contoh : tidak pedas, tambah alat makan"
              placeholderTextColor={GRAY_400}
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Button */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={[styles.submitBtn, isSoldOut && styles.submitBtnDisabled]}
          onPress={handleAddToCart}
          disabled={isSoldOut}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {isSoldOut ? "Stok Habis" : "Masukkan Keranjang"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 100, // space for bottom bar
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8, // Adjust ratio as needed
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHITE,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY,
    marginLeft: -2,
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24, // Pull up over the image
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: GRAY_900,
    marginBottom: 6,
  },
  mitraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  backBtn: { padding: Spacing[1] },
  backText: {
    fontSize: FontSize.md,
    color: Colors.primary[600],
    fontWeight: FontWeight.medium,
  },
  cartBtn: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
  },
  cartBtnText: {
    fontSize: FontSize.sm,
    color: "#fff",
    fontWeight: FontWeight.bold,
  },

  productImage: {
    width: "100%",
    height: 240,
  },
  mitraName: {
    fontSize: 15,
    color: GRAY_700,
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  imagePlaceholderIcon: { fontSize: 80 },

  discountBadge: {
    position: "absolute",
    top: 56,
    right: Spacing[4],
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.md,
  },
  discountBadgeText: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  mitraSection: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  mitraName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  address: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: 2 },
  distance: {
    fontSize: FontSize.sm,
    color: Colors.primary[600],
    marginTop: Spacing[1],
  },

  details: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    marginTop: Spacing[2],
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  priceLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  discountPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: PRIMARY,
  },
  originalPrice: {
    fontSize: 14,
    color: GRAY_400,
    textDecorationLine: "line-through",
  },
  badge: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: GRAY_900,
    marginBottom: 8,
  },
  descText: {
    fontSize: 14,
    color: GRAY_700,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: GRAY_200,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: GRAY_900,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: "700",
    color: RED,
  },
  infoValue: {
    fontSize: 13,
    color: GRAY_900,
  },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtyLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.neutral[700],
  },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    gap: 12,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  qtyBtnText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  qtyNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: GRAY_900,
  },
  noteSection: {
    marginBottom: 20,
  },
  noteInput: {
    backgroundColor: GRAY_50,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: GRAY_900,
    borderWidth: 1,
    borderColor: GRAY_200,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: GRAY_400,
  },
  submitBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
});
