import { productService } from "@/services/product.service";
import { useAuthStore } from "@/stores/auth.store";
import { useLocationStore } from "@/stores/location.store";
import type { Product } from "@/types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export default function MarketplaceLandingScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeLocation = useLocationStore((state) => state.activeLocation);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiveProducts = useCallback(async () => {
    try {
      const data = await productService.getLiveProducts({
        lat: activeLocation?.lat,
        lng: activeLocation?.lng,
        limit: 15,
      });
      setProducts(data);
    } catch (err) {
      console.warn("[MarketplaceLanding] Gagal mengambil menu live:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeLocation]);

  useEffect(() => {
    fetchLiveProducts();
  }, [fetchLiveProducts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLiveProducts();
  };

  const handleContinue = () => {
    if (isAuthenticated) {
      router.push("/(customer)");
      return;
    }
    router.push("/(auth)/login");
  };

  const renderProductCard = ({ item }: { item: Product }) => {
    const restaurantName =
      item.restaurant?.name || item.mitra?.businessName || "Mitra Kuliner SAFO";
    const rating = item.restaurant?.rating || item.avgRating || 4.8;
    const distance =
      item.distanceKm != null
        ? `${item.distanceKm} km`
        : "Terdekat dengan lokasi anda";
    const originalPrice = Number(item.originalPrice) || 0;
    const discountPrice = Number(item.discountPrice) || 0;
    const discountPercent =
      item.discountPercent ??
      (originalPrice > 0
        ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
        : 0);
    const discountSavings = Math.max(0, originalPrice - discountPrice);

    return (
      <View key={item.id} style={styles.card}>
        {/* Header Bar: Nama Restoran, Rating, Jarak */}
        <View style={styles.restoHeader}>
          <View style={styles.restoInfoLeft}>
            <Text style={styles.restoName} numberOfLines={1}>
              {restaurantName}
            </Text>
          </View>
          <View style={styles.restoMetaRight}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingText}>
                {typeof rating === "number" ? rating.toFixed(1) : rating}
              </Text>
            </View>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>
                <Svg width="16" height="16" fill="GRAY" viewBox="0 0 16 16">
                  <Path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
                </Svg>
                {distance}
              </Text>
            </View>
          </View>
        </View>

        {/* Gambar Menu & Floating Badges */}
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri:
                item.photoUrl ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
            }}
            style={styles.cardImage}
          />
          {discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
            </View>
          )}
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>Sisa {item.stock} porsi</Text>
          </View>
        </View>

        {/* Detail Menu & Harga */}
        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>

          {item.description ? (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                Rp {discountPrice.toLocaleString("id-ID")}
              </Text>
              {originalPrice > discountPrice && (
                <Text style={styles.oldPrice}>
                  Rp {originalPrice.toLocaleString("id-ID")}
                </Text>
              )}
            </View>
            {discountSavings > 0 && (
              <View style={styles.savingsTag}>
                <Text style={styles.savingsText}>
                  Hemat Rp {discountSavings.toLocaleString("id-ID")}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.cardButton}
            activeOpacity={0.85}
            onPress={handleContinue}
          >
            <Text style={styles.cardButtonText}>
              {isAuthenticated ? "Pesan Sekarang" : "Mulai Pesan"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#1a5c52"]}
            tintColor="#1a5c52"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.brand}>safo</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              router.push(isAuthenticated ? "/(customer)" : "/(auth)/login")
            }
          >
            <Text style={styles.headerButtonText}>
              {isAuthenticated ? "Dashboard" : "Login"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.eyebrow}>Makanan enak, harga ramah</Text>
          <Text style={styles.heroTitle}>
            Belanja makanan favoritmu di sini
          </Text>
          <Text style={styles.heroSubtitle}>
            Pilih menu favorit dari partner kuliner terdekat. Hemat, cepat, dan
            siap diantar ke lokasi Anda.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinue}
            >
              <Text style={styles.primaryButtonText}>Mulai Pesan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.secondaryButtonText}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View>
            <Text style={styles.sectionTitle}>Menu Live Hari Ini</Text>
            <Text style={styles.sectionSubtitle}>
              Makanan lezat & surplus siap santap dengan harga hemat
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a5c52" />
            <Text style={styles.loadingText}>
              Memuat daftar menu live terdekat...
            </Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>Belum Ada Menu Live</Text>
            <Text style={styles.emptySubtitle}>
              Menu surplus sedang disiapkan oleh mitra restoran kami. Tarik ke
              bawah untuk memperbarui.
            </Text>
          </View>
        ) : (
          <FlatList
            data={products}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.cardList}
          />
        )}

        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>Kenapa pilih SAFO?</Text>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>•</Text>
            <Text style={styles.featureText}>
              Menu surplus berkualitas dengan harga hingga 70% lebih murah
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>•</Text>
            <Text style={styles.featureText}>
              Pemesanan cepat dan pengambilan tanpa ribet
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>•</Text>
            <Text style={styles.featureText}>
              Mendukung gerakan mengurangi makanan terbuang untuk bumi
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f0eb",
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 12,
  },
  brand: {
    fontSize: 40,
    fontWeight: "800",
    color: "#121212",
    letterSpacing: -2,
  },
  headerButton: {
    backgroundColor: "#1a5c52",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  headerButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  heroSection: {
    backgroundColor: "#e7e1d9",
    borderRadius: 28,
    padding: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  eyebrow: {
    color: "#1a5c52",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111111",
    lineHeight: 40,
    letterSpacing: -1.2,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 15,
    color: "#4a4a4a",
    lineHeight: 23,
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#1a5c52",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 140,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 140,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d9d0c6",
  },
  secondaryButtonText: {
    color: "#1a1a1a",
    fontWeight: "700",
    fontSize: 15,
  },
  sectionRow: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#121212",
    letterSpacing: -0.8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  cardList: {
    gap: 18,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e1d9cf",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  restoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#fafafa",
  },
  restoInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  restoIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  restoName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    flexShrink: 1,
  },
  restoMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingStar: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "800",
  },
  ratingText: {
    color: "#92400e",
    fontSize: 11,
    fontWeight: "700",
  },
  distanceBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceText: {
    color: "#4b5563",
    fontSize: 11,
    fontWeight: "600",
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 190,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  discountBadgeText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
  },
  stockBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  stockBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  cardContent: {
    padding: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginBottom: 10,
  },
  priceContainer: {
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a5c52",
  },
  oldPrice: {
    fontSize: 13,
    color: "#9ca3af",
    textDecorationLine: "line-through",
  },
  savingsTag: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  cardButton: {
    backgroundColor: "#1a5c52",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  cardButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e1d9cf",
    marginBottom: 18,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
  },
  infoPanel: {
    backgroundColor: "#edf4ef",
    borderRadius: 24,
    padding: 20,
    marginTop: 4,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  featureDot: {
    fontSize: 18,
    color: "#1a5c52",
    marginRight: 10,
    fontWeight: "800",
    lineHeight: 22,
  },
  featureText: {
    flex: 1,
    color: "#2d2d2d",
    fontSize: 14,
    lineHeight: 21,
  },
});
