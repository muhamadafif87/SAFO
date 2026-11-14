import { productService } from "@/services/product.service";
import { useAuthStore } from "@/stores/auth.store";
import { useLocationStore } from "@/stores/location.store";
import type { Product } from "@/types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export default function MarketplaceLandingScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const mitra = useAuthStore((state) => state.mitra);
  const isMitra = user?.role === "mitra";
  const activeLocation = useLocationStore((state) => state.activeLocation);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoadError(null);
    try {
      const data = isMitra
        ? await productService.getMitraProducts()
        : await productService.getLiveProducts({
            lat: activeLocation?.lat,
            lng: activeLocation?.lng,
            limit: 15,
          });
      setProducts(data);
    } catch (err) {
      setLoadError(
        isMitra
          ? "Gagal memuat stok produk. Coba tarik layar untuk memuat ulang."
          : "Gagal memuat menu live.",
      );
      console.warn("[MarketplaceLanding] Gagal mengambil produk:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeLocation, isMitra]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProducts();
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

  if (isMitra) {
    return (
      <MitraStockDashboard
        businessName={mitra?.businessName || "Warung Anda"}
        products={products}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        loadError={loadError}
        onRefresh={handleRefresh}
      />
    );
  }

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
            <Text style={styles.sectionTitle}>Menu Hari Ini</Text>
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
    borderRadius: 10,
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

export interface MitraStockDashboardProps {
  businessName: string;
  products: Product[];
  isLoading: boolean;
  isRefreshing: boolean;
  loadError: string | null;
  onRefresh: () => void;
  showBottomNavigation?: boolean;
}

export function MitraStockDashboard({
  businessName,
  products,
  isLoading,
  isRefreshing,
  loadError,
  onRefresh,
  showBottomNavigation = true,
}: MitraStockDashboardProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");

  const activeProducts = products.filter(
    (product) => product.status === "active" && product.stock > 0,
  ).length;
  const soldOutProducts = products.filter(
    (product) => product.status === "sold_out" || product.stock <= 0,
  ).length;
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchText.trim().toLowerCase()),
  );

  const formatPrice = (price: number) =>
    `Rp ${Number(price).toLocaleString("id-ID")}`;

  const handleVipPress = () => {
    Alert.alert(
      "Upgrade VIP",
      "Fitur upgrade VIP belum tersedia.",
    );
  };

  const handleWithdrawPress = () => {
    Alert.alert("Tarik Saldo", "Fitur tarik saldo belum tersedia.");
  };

  const handleProfilePress = () => {
    Alert.alert("Profil Mitra", businessName);
  };

  return (
    <SafeAreaView style={sellerStyles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={sellerStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#00615f"
            colors={["#00615f"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={sellerStyles.header}>
          <Image
            source={require("../../assets/images/figma/seller-meal-award.png")}
            style={sellerStyles.brandIcon}
            resizeMode="contain"
          />
          <Text style={sellerStyles.businessName} numberOfLines={1}>
            {businessName}
          </Text>
        </View>

        <View style={sellerStyles.summaryCard}>
          <Text style={sellerStyles.summaryTitle}>Ringkasan Stok</Text>
          <View style={sellerStyles.limitRow}>
            <View style={sellerStyles.limitBox}>
              <Text style={sellerStyles.limitTitle}>Limit Stok Produk</Text>
              <Text style={sellerStyles.limitValue}>{products.length} / 10</Text>
            </View>
            <TouchableOpacity
              style={sellerStyles.vipButton}
              onPress={handleVipPress}
              accessibilityRole="button"
            >
              <Text style={sellerStyles.vipButtonText}>Upgrade VIP</Text>
            </TouchableOpacity>
          </View>
          <View style={sellerStyles.metricsRow}>
            {[
              { label: "Total Produk", value: products.length },
              { label: "Stok Aktif", value: activeProducts },
              { label: "Stok Habis", value: soldOutProducts },
            ].map((metric, index) => (
              <View
                key={metric.label}
                style={[
                  sellerStyles.metricCell,
                  index < 2 && sellerStyles.metricDivider,
                ]}
              >
                <Text style={sellerStyles.metricTitle}>{metric.label}</Text>
                <Text style={sellerStyles.metricValue}>
                  {metric.value}
                  <Text style={sellerStyles.metricUnit}> Produk</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={sellerStyles.balanceCard}>
          <View style={sellerStyles.balanceInfo}>
            <Text style={sellerStyles.balanceTitle}>Saldo Anda</Text>
            <Text style={sellerStyles.balanceValue}>Belum tersedia</Text>
          </View>
          <TouchableOpacity
            style={sellerStyles.withdrawButton}
            onPress={handleWithdrawPress}
            accessibilityRole="button"
          >
            <Text style={sellerStyles.withdrawButtonText}>Tarik Saldo</Text>
          </TouchableOpacity>
        </View>

        <View style={sellerStyles.actionsRow}>
          <View style={sellerStyles.searchBox}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Cari produk..."
              placeholderTextColor="#4a4a4a"
              style={sellerStyles.searchInput}
              returnKeyType="search"
              accessibilityLabel="Cari produk"
            />
            <Image
              source={require("../../assets/images/figma/seller-search.png")}
              style={sellerStyles.searchIcon}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            style={sellerStyles.addButton}
            onPress={() => router.push("/(mitra)/products/create")}
            accessibilityRole="button"
          >
            <Text style={sellerStyles.addButtonText}>+ Tambah Produk</Text>
          </TouchableOpacity>
        </View>

        <View style={sellerStyles.productList}>
          {loadError ? (
            <Text style={sellerStyles.errorText}>{loadError}</Text>
          ) : isLoading ? (
            <ActivityIndicator color="#00615f" />
          ) : filteredProducts.length === 0 ? (
            <Text style={sellerStyles.emptyText}>
              {searchText.trim()
                ? "Produk tidak ditemukan."
                : "Belum ada produk. Tambahkan produk pertamamu."}
            </Text>
          ) : (
            filteredProducts.map((product) => (
              <View key={product.id} style={sellerStyles.productRow}>
                <Image
                  source={
                    product.photoUrl
                      ? { uri: product.photoUrl }
                      : require("../../assets/images/figma/seller-food.png")
                  }
                  style={sellerStyles.productImage}
                  resizeMode="cover"
                />
                <View style={sellerStyles.productDetails}>
                  <Text style={sellerStyles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View style={sellerStyles.productPriceRow}>
                    <Text style={sellerStyles.productPrice}>
                      {formatPrice(product.discountPrice)}
                    </Text>
                    {product.originalPrice > product.discountPrice && (
                      <Text style={sellerStyles.originalPrice}>
                        {formatPrice(product.originalPrice)}
                      </Text>
                    )}
                  </View>
                  <Text style={sellerStyles.stockLabel}>Stok</Text>
                  <Text style={sellerStyles.stockValue}>
                    {product.stock} tersedia
                  </Text>
                </View>
                <TouchableOpacity
                  style={sellerStyles.editButton}
                  onPress={() =>
                    router.push(`/(mitra)/products/${product.id}/edit`)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${product.name}`}
                >
                  <Text style={sellerStyles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {showBottomNavigation && (
        <View
          style={[
            sellerStyles.tabBar,
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <View style={sellerStyles.tabBarContent}>
            <TouchableOpacity
              style={sellerStyles.tabButton}
              accessibilityRole="button"
              accessibilityState={{ selected: true }}
            >
              <View style={sellerStyles.activeTab}>
                <Image
                  source={require("../../assets/images/figma/seller-home.png")}
                  style={[sellerStyles.tabIcon, sellerStyles.activeTabIcon]}
                  resizeMode="contain"
                />
                <Text style={sellerStyles.activeTabText}>Beranda</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={sellerStyles.tabButton}
              onPress={() => router.push("/(mitra)/orders")}
              accessibilityRole="button"
            >
              <Image
                source={require("../../assets/images/figma/seller-orders.png")}
                style={sellerStyles.ordersIcon}
                resizeMode="contain"
              />
              <Text style={sellerStyles.tabText}>Pesanan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={sellerStyles.tabButton}
              onPress={handleProfilePress}
              accessibilityRole="button"
            >
              <Image
                source={require("../../assets/images/figma/seller-profile.png")}
                style={sellerStyles.profileIcon}
                resizeMode="contain"
              />
              <Text style={sellerStyles.tabText}>Profil</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const sellerStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    height: 26,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 9,
  },
  brandIcon: {
    width: 26,
    height: 26,
  },
  businessName: {
    flex: 1,
    color: "#111111",
    fontSize: 18,
    fontWeight: "700",
  },
  summaryCard: {
    height: 166,
    paddingLeft: 17,
    paddingRight: 14,
    paddingTop: 10,
    paddingBottom: 21,
    marginBottom: 18,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    marginLeft: 2,
    color: "#111111",
    fontSize: 13,
    fontWeight: "700",
  },
  limitRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 17,
    marginTop: 14,
  },
  limitBox: {
    flex: 1,
    height: 37,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
    borderRadius: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
    elevation: 2,
  },
  limitTitle: {
    color: "#111111",
    fontSize: 11,
    fontWeight: "700",
  },
  limitValue: {
    color: "#00615f",
    fontSize: 12,
    fontWeight: "700",
  },
  vipButton: {
    width: 98,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00615f",
    borderRadius: 5,
  },
  vipButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  metricsRow: {
    height: 48,
    flexDirection: "row",
    marginLeft: -2,
    marginTop: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.13,
    shadowRadius: 3,
    elevation: 2,
  },
  metricCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metricDivider: {
    borderRightWidth: 1,
    borderRightColor: "#dddddd",
  },
  metricTitle: {
    marginBottom: 2,
    color: "#111111",
    fontSize: 9,
    fontWeight: "700",
  },
  metricValue: {
    color: "#00615f",
    fontSize: 15,
    fontWeight: "700",
  },
  metricUnit: {
    color: "#00615f",
    fontSize: 10,
    fontWeight: "400",
  },
  balanceCard: {
    height: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 19,
    marginBottom: 25,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceInfo: {
    alignSelf: "stretch",
    paddingTop: 12,
  },
  balanceTitle: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "700",
  },
  balanceValue: {
    marginTop: 12,
    color: "#00615f",
    fontSize: 16,
    fontWeight: "700",
  },
  withdrawButton: {
    width: 98,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00615f",
    borderRadius: 5,
  },
  withdrawButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  actionsRow: {
    height: 29,
    flexDirection: "row",
    gap: 10,
  },
  searchBox: {
    width: "43%",
    height: 29,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    backgroundColor: "#eeeeee",
    borderRadius: 5,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    color: "#111111",
    fontSize: 10,
  },
  searchIcon: {
    width: 14,
    height: 14,
    tintColor: "#777777",
  },
  addButton: {
    flex: 1,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00615f",
    borderRadius: 5,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  productList: {
    marginTop: 22,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 5,
    backgroundColor: "#f0f0f0",
  },
  productDetails: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "center",
    marginLeft: 8,
    paddingTop: 7,
  },
  productName: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  productPrice: {
    color: "#00615f",
    fontSize: 13,
    fontWeight: "700",
  },
  originalPrice: {
    color: "#b9b9b9",
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  stockLabel: {
    marginTop: 3,
    color: "#111111",
    fontSize: 10,
    fontWeight: "600",
  },
  stockValue: {
    color: "#111111",
    fontSize: 11,
    fontWeight: "600",
  },
  editButton: {
    width: 62,
    height: 19,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 12,
    marginLeft: 6,
    backgroundColor: "#d5f6f3",
    borderRadius: 13,
  },
  editButtonText: {
    color: "#356d64",
    fontSize: 11,
  },
  errorText: {
    paddingVertical: 18,
    color: "#b42318",
    fontSize: 12,
    textAlign: "center",
  },
  emptyText: {
    paddingVertical: 24,
    color: "#777777",
    fontSize: 12,
    textAlign: "center",
  },
  tabBar: {
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarContent: {
    width: "85%",
    maxWidth: 342,
    flexDirection: "row",
    alignSelf: "center",
  },
  tabButton: {
    flex: 1,
    height: 47,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    width: 68,
    height: 47,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d5f6f3",
    borderRadius: 10,
  },
  ordersIcon: {
    width: 23,
    height: 26,
    tintColor: "#111111",
  },
  tabIcon: {
    width: 23,
    height: 23,
    tintColor: "#111111",
  },
  activeTabIcon: {
    tintColor: "#00615f",
  },
  profileIcon: {
    width: 23,
    height: 23,
    tintColor: "#111111",
  },
  activeTabText: {
    color: "#00615f",
    fontSize: 11,
  },
  tabText: {
    color: "#111111",
    fontSize: 11,
  },
});
