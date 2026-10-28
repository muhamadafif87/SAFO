import { Colors } from '@/constants/typography';
import { productService } from '@/services/product.service';
import { useAuthStore } from '@/stores/auth.store';
import { Product } from '@/types';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const PRIMARY = Colors.primary[600];
const MINT = '#D8EDE7';
const WHITE = '#ffffff';
const TEXT_DARK = Colors.neutral[900];
const TEXT_MUTED = Colors.neutral[500];
const BORDER = '#EAEEF0';
const PAGE_BG = '#F4F6F7';

function StoreIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M2 2.5A.5.5 0 0 1 2.5 2h11a.5.5 0 0 1 .5.5v1.3l-1.4.7A4.5 4.5 0 0 0 8 5.044 4.5 4.5 0 0 0 2.9 4.5L1.5 3.8V2.5zM1 5.11l1.3.65A3.5 3.5 0 0 1 8 4.5a3.5 3.5 0 0 1 5.7 1.26L15 5.11V13a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5.11zM4.5 14.5a1.5 1.5 0 0 0 1.5-1.5h1a1.5 1.5 0 0 0 3 0h1a1.5 1.5 0 0 0 1.5 1.5v1a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5v-1z" />
    </Svg>
  );
}

function SearchIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
    >
      <Path d="M11 11l4 4" strokeLinecap="round" />
      <Path d="M7.5 12.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
    </Svg>
  );
}

function StatBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );
}

export default function MitraHome() {
  const router = useRouter();
  const { mitra } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  // Semua setState dipanggil setelah await, supaya aman dipanggil dari useEffect.
  const fetchProducts = useCallback(async () => {
    try {
      const data = await productService.getMitraProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[mitra/home] Gagal memuat produk', error);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    // Fetch data saat mount — semua setState terjadi setelah await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProducts();
  }, [fetchProducts]);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.stock > 0).length;
    return { total, active, soldOut: total - active };
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.75}
      onPress={() => router.push(`/(mitra)/products/${item.id}/edit`)}
    >
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <StoreIcon color={TEXT_MUTED} size={22} />
        </View>
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceNow}>
            Rp {item.discountPrice.toLocaleString('id-ID')}
          </Text>
          {item.originalPrice > item.discountPrice && (
            <Text style={styles.priceOld}>
              Rp {item.originalPrice.toLocaleString('id-ID')}
            </Text>
          )}
        </View>
        <Text style={styles.productStock}>Stok {item.stock}</Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        activeOpacity={0.7}
        onPress={() => router.push(`/(mitra)/products/${item.id}/edit`)}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
          />
        }
        ListHeaderComponent={
          <View>
            {/* ── Judul warung ── */}
            <View style={styles.titleRow}>
              <View style={styles.titleIcon}>
                <StoreIcon color={PRIMARY} size={16} />
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {mitra?.businessName || 'Warung Saya'}
              </Text>
            </View>

            {/* ── Ringkasan Stok ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ringkasan Stok</Text>
              <View style={styles.statRow}>
                <StatBox label="Total Produk" value={stats.total} unit="Produk" />
                <StatBox label="Stok Aktif" value={stats.active} unit="Produk" />
                <StatBox
                  label="Stok Habis"
                  value={stats.soldOut}
                  unit="Produk"
                />
              </View>
            </View>

            {/* ── Cari + Tambah ── */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <SearchIcon color={TEXT_MUTED} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Cari produk..."
                  placeholderTextColor={TEXT_MUTED}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>
              <TouchableOpacity
                style={styles.addButton}
                activeOpacity={0.75}
                onPress={() => router.push('/(mitra)/products/create')}
              >
                <Text style={styles.addButtonText}>+ Tambah Produk</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={PRIMARY} />
            </View>
          ) : (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Belum ada produk</Text>
              <Text style={styles.emptyText}>
                Tambahkan menu pertama kamu lewat tombol + Tambah Produk.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F7F9F9',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY,
  },
  statUnit: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 1,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT_DARK,
    padding: 0,
  },
  addButton: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '700',
  },

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    marginBottom: 10,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#EEF1F2',
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  priceNow: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
  },
  priceOld: {
    fontSize: 12,
    color: TEXT_MUTED,
    textDecorationLine: 'line-through',
  },
  productStock: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  editButton: {
    backgroundColor: MINT,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },

  centerBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
