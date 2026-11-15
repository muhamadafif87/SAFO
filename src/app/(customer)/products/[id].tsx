import { productService } from "@/services/product.service";
import { useCartStore } from "@/stores/cart.store";
import type { Product } from "@/types";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
import Svg, { Path } from "react-native-svg";

// ─── Design Tokens (from Figma node 2:2) ───────────────────────────────────────
const PRIMARY = "#00615F";
const PRIMARY_LIGHT = "#CEE7E5";
const WHITE = "#FFFFFF";
const TEXT_BLACK = "#000000";
const TEXT_DARK = "#363434";
const TEXT_MUTED = "#685A5A";
const TEXT_STRIKE = "#B9B9B9";
const INPUT_BG = "#F3F3F3";
const DIVIDER = "#EAEAEA";
const DANGER_RED = "#FF0000";
const GRAY_400 = "#9CA3AF";

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
  const [imgSrc, setImgSrc] = useState<string>("");

  // Refresh data produk setiap kali screen ini mendapat focus,
  // sehingga stok selalu up-to-date setelah user balik dari checkout.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      productService
        .getById(id)
        .then((data) => {
          setProduct(data);
          if (data?.photoUrl) {
            setImgSrc(data.photoUrl);
          }
        })
        .catch((err: any) => {
          Alert.alert("Error", err.message || "Gagal memuat produk");
          router.back();
        })
        .finally(() => setLoading(false));
    }, [id]),
  );

  const handleAddToCart = (directCheckout = false) => {
    if (!product) return;

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
              if (directCheckout) {
                router.push("/(customer)/checkout");
              } else {
                Alert.alert(
                  "Ditambahkan!",
                  `${product.name} (x${quantity}) ditambahkan ke pesanan.`,
                );
                router.back();
              }
            },
          },
        ],
      );
      return;
    }

    if (directCheckout) {
      router.push("/(customer)/checkout");
    } else {
      Alert.alert(
        "Berhasil",
        `${product.name} (x${quantity}) ditambahkan ke pesanan!`,
      );
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (!product) return null;

  const discountAmount = Math.max(
    0,
    Number(product.originalPrice) - Number(product.discountPrice),
  );

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

  const maxQty = Math.max(1, Math.min(product.stock, 99));
  const isSoldOut = product.stock <= 0 || product.status === "sold_out";

  const ratingValue = product.avgRating
    ? Number(product.avgRating).toFixed(1).replace(".", ",")
    : "4,8";
  const reviewCount = product.reviewCount ?? 120;

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
              uri:
                imgSrc ||
                product.photoUrl ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
            }}
            style={styles.image}
            resizeMode="cover"
            onError={() => {
              setImgSrc(
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
              );
            }}
          />

          {/* Back Button (Teal Chevron) */}
          <TouchableOpacity
            style={[styles.backBtn, { top: Math.max(insets.top + 6, 20) }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backBtnText}>
              <Svg
                width={16}
                height={16}
                fill="currentColor"
                className="bi bi-chevron-left"
                viewBox="0 0 16 16"
              >
                <Path
                  fillRule="evenodd"
                  d="M11.354 1.646a.5.5 0 010 .708L5.707 8l5.647 5.646a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708l6-6a.5.5 0 01.708 0"
                />
              </Svg>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Sheet (overlapping image) */}
        <View style={styles.sheet}>
          {/* Title */}
          <Text style={styles.title}>{product.name}</Text>

          {/* Subtitle Row (Mitra Name + Rating) */}
          <View style={styles.mitraRow}>
            <Text style={styles.mitraName}>
              {product.mitra?.businessName || "Mitra"}
            </Text>
            <View style={styles.ratingWrap}>
              <Image
                source={require("@/assets/images/figma/rating-star.png")}
                style={styles.starIcon}
                resizeMode="contain"
              />
              <Text style={styles.ratingText}>
                {ratingValue} ({reviewCount})
              </Text>
            </View>
          </View>

          {/* Price Row */}
          <View style={styles.priceRow}>
            <View style={styles.priceLeft}>
              <Text style={styles.discountPrice}>
                Rp {Number(product.discountPrice).toLocaleString("id-ID")}
              </Text>
              {Number(product.originalPrice) >
                Number(product.discountPrice) && (
                  <Text style={styles.originalPrice}>
                    Rp{Number(product.originalPrice).toLocaleString("id-ID")}
                  </Text>
                )}
            </View>
            {discountAmount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  Hemat Rp {discountAmount.toLocaleString("id-ID")}
                </Text>
              </View>
            )}
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deskripsi</Text>
            <Text style={styles.descText}>
              {product.description || "Tidak ada deskripsi."}
            </Text>
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
            <Text
              style={[styles.infoValue, styles.locationText]}
              numberOfLines={2}
            >
              {product.mitra?.address || "-"}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Quantity Section */}
          <View style={styles.qtyRow}>
            <Text style={styles.sectionTitle}>Jumlah Pesanan</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNumber}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.min(maxQty, quantity + 1))}
                activeOpacity={0.7}
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
              placeholderTextColor="#8E8E93"
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
        {isSoldOut ? (
          <View style={[styles.submitBtn, styles.submitBtnDisabled]}>
            <Text style={styles.submitBtnText}>Stok Habis</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => handleAddToCart(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>Masukkan Keranjang</Text>
          </TouchableOpacity>
        )}
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
    backgroundColor: WHITE,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom button
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: 283,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -20, // Overlap the food image
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_BLACK,
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  mitraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  mitraName: {
    fontSize: 16,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starIcon: {
    width: 16,
    height: 16,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "400",
    color: TEXT_MUTED,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  priceLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  discountPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: -0.8,
  },
  originalPrice: {
    fontSize: 15,
    color: TEXT_STRIKE,
    textDecorationLine: "line-through",
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 12,
    height: 29,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
    letterSpacing: -0.4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_DARK,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  descText: {
    fontSize: 14,
    color: TEXT_DARK,
    lineHeight: 20,
    letterSpacing: -0.4,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_DARK,
    letterSpacing: -0.4,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: "600",
    color: DANGER_RED,
    letterSpacing: -0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_DARK,
    letterSpacing: -0.4,
  },
  locationText: {
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyBtn: {
    width: 20,
    height: 20,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 3,
  },
  qtyBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
  qtyNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_BLACK,
    minWidth: 16,
    textAlign: "center",
  },
  noteSection: {
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: INPUT_BG,
    borderRadius: 6,
    height: 46,
    paddingHorizontal: 14,
    fontSize: 12,
    color: TEXT_DARK,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    paddingTop: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    height: 52,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: GRAY_400,
  },
  submitBtnText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
});
