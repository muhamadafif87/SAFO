import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { productService } from '@/services/product.service';
import type { Product } from '@/types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import * as Location from 'expo-location';

export default function CustomerHome() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { getTotalItems } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchProducts = useCallback(async (lat: number, lng: number) => {
    try {
      const data = await productService.getNearby({ lat, lng, radius: 10 });
      setProducts(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (err) {
      console.warn('Failed to load products:', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let lat = -6.200000;
        let lng = 106.816666;

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }

        setLocation({ lat, lng });
        await fetchProducts(lat, lng);
      } catch (err) {
        console.warn('Location error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (location) {
      await fetchProducts(location.lat, location.lng);
    }
    setRefreshing(false);
  };

  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.mitra?.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const cartCount = getTotalItems();
  const firstName = user?.email?.split('@')[0] || 'Sahabat';

  const renderItem = ({ item }: { item: Product }) => {
    const discountPercent = Math.round(
      ((Number(item.originalPrice) - Number(item.discountPrice)) / Number(item.originalPrice)) * 100
    );
    const isSoldOut = item.stock <= 0 || item.status === 'sold_out';

    return (
      <TouchableOpacity
        style={[styles.card, isSoldOut && styles.cardSoldOut]}
        onPress={() => router.push(`/(customer)/products/${item.id}`)}
        activeOpacity={0.9}
      >
        {/* Product image */}
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImagePlaceholderIcon}>🍱</Text>
          </View>
        )}

        {/* Discount badge */}
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
        </View>

        {/* Sold out overlay */}
        {isSoldOut && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>Habis Terjual</Text>
          </View>
        )}

        {/* Card content */}
        <View style={styles.cardContent}>
          <Text style={styles.mitraName} numberOfLines={1}>{item.mitra?.businessName || 'Mitra'}</Text>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.originalPrice}>Rp {Number(item.originalPrice).toLocaleString('id-ID')}</Text>
              <Text style={styles.discountPrice}>Rp {Number(item.discountPrice).toLocaleString('id-ID')}</Text>
            </View>
            <View style={[styles.stockBadge, isSoldOut && styles.stockBadgeSoldOut]}>
              <Text style={[styles.stockText, isSoldOut && styles.stockTextSoldOut]}>
                {isSoldOut ? 'Habis' : `Sisa ${item.stock}`}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {item.mitra?.distanceKm !== undefined && (
              <Text style={styles.metaText}>📍 {item.mitra.distanceKm.toFixed(1)} km</Text>
            )}
            <Text style={styles.metaText}>
              ⏰ {new Date(item.pickupWindowStart).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}–{new Date(item.pickupWindowEnd).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Halo, {firstName} 👋</Text>
          <Text style={styles.subtitle}>Selamatkan makanan, hemat lebih banyak!</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(customer)/orders')} style={styles.ordersBtn}>
          <Text style={styles.ordersBtnText}>Pesanan</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari makanan atau toko..."
            placeholderTextColor={Colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Section title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Terdekat di Sekitarmu</Text>
        <Text style={styles.sectionCount}>
          {filteredProducts.length} produk
        </Text>
      </View>

      {/* Product list */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary[500]} style={{ marginTop: 60 }} />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>{searchQuery ? '🔍' : '🍽️'}</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Tidak ditemukan' : 'Belum ada makanan surplus'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? `Coba kata kunci lain.`
              : 'Cek lagi nanti — mitra biasanya posting sore hari!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={1}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary[500]} />
          }
        />
      )}

      {/* Floating cart button */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.cartFab}
          onPress={() => router.push('/(customer)/checkout')}
          activeOpacity={0.9}
        >
          <Text style={styles.cartFabIcon}>🛒</Text>
          <View style={styles.cartFabMiddle}>
            <Text style={styles.cartFabLabel}>{cartCount} item dipilih</Text>
            <Text style={styles.cartFabSub}>Lanjut ke Checkout</Text>
          </View>
          <Text style={styles.cartFabArrow}>→</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  subtitle: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: 2 },
  ordersBtn: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  ordersBtnText: { fontSize: FontSize.sm, color: Colors.primary[700], fontWeight: FontWeight.bold },

  searchWrap: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.neutral[0],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[3],
    height: 44,
    gap: Spacing[2],
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[800] },
  sectionCount: { fontSize: FontSize.sm, color: Colors.neutral[400] },

  list: { paddingHorizontal: Spacing[4], paddingBottom: 100 },

  // Product card
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing[4],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardSoldOut: { opacity: 0.65 },

  cardImage: { width: '100%', height: 160 },
  cardImagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderIcon: { fontSize: 60 },

  discountBadge: {
    position: 'absolute',
    top: Spacing[3],
    left: Spacing[3],
    backgroundColor: Colors.secondary[500],
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
  },
  discountBadgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: { color: '#fff', fontSize: FontSize.xl, fontWeight: FontWeight.bold },

  cardContent: { padding: Spacing[4] },
  mitraName: { fontSize: FontSize.sm, color: Colors.neutral[500], marginBottom: 2 },
  productName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[900], marginBottom: Spacing[3] },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing[3],
  },
  originalPrice: { fontSize: FontSize.xs, color: Colors.neutral[400], textDecorationLine: 'line-through' },
  discountPrice: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary[600] },
  stockBadge: {
    backgroundColor: Colors.secondary[100],
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  stockBadgeSoldOut: { backgroundColor: Colors.neutral[200] },
  stockText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.secondary[700] },
  stockTextSoldOut: { color: Colors.neutral[500] },

  metaRow: { flexDirection: 'row', gap: Spacing[4] },
  metaText: { fontSize: FontSize.xs, color: Colors.neutral[500] },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    paddingBottom: 60,
  },
  emptyIcon: { fontSize: 64, marginBottom: Spacing[4] },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[700], marginBottom: Spacing[2] },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },

  // Cart FAB
  cartFab: {
    position: 'absolute',
    bottom: Spacing[6],
    left: Spacing[4],
    right: Spacing[4],
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    shadowColor: Colors.primary[700],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  cartFabIcon: { fontSize: 24, marginRight: Spacing[3] },
  cartFabMiddle: { flex: 1 },
  cartFabLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
  cartFabSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  cartFabArrow: { fontSize: 20, color: '#fff', fontWeight: FontWeight.bold },
});
