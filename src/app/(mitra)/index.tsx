import { productService } from '@/services/product.service';
import { useAuthStore } from '@/stores/auth.store';
import { Product } from '@/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

const PRIMARY = '#0E7465';
const MINT = '#D8EDE7';
const WHITE = '#ffffff';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#6B7280';
const BORDER = '#EAEEF0';
const PAGE_BG = '#F4F6F7';

function CutleryIcon({ color = PRIMARY, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M13.5 0a.5.5 0 0 1 .5.5v7.25a2.25 2.25 0 0 1-2 2.236v5.514a.5.5 0 0 1-1 0V9.986a2.25 2.25 0 0 1-2-2.236V.5a.5.5 0 0 1 1 0v7.25a1.25 1.25 0 1 0 2.5 0V.5a.5.5 0 0 1 .5-.5z" />
      <Path d="M4.5 0a.5.5 0 0 1 .5.5v5.75a1.25 1.25 0 0 0 1 1.22v8.03a.5.5 0 0 1-1 0V7.47a2.25 2.25 0 0 1-2-2.22V.5a.5.5 0 0 1 .5-.5h1.5z" />
    </Svg>
  );
}

function SearchIcon({ color = TEXT_MUTED, size = 16 }: { color?: string; size?: number }) {
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

export default function MitraHome() {
  const router = useRouter();
  const { mitra } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      const data = await productService.getMitraProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[mitra/home] Gagal memuat produk', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Re-fetch setiap kali layar beranda aktif (misal setelah edit stok atau order diterima)
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

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
    <View style={styles.productCard}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <Text style={{ fontSize: 24 }}>🍲</Text>
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
        <Text style={styles.productStock}>
          Stok <Text style={styles.stockBold}>{item.stock}</Text>
        </Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        activeOpacity={0.7}
        onPress={() => router.push(`/(mitra)/products/${item.id}/edit`)}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
    </View>
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
            {/* ── Nama Usaha Mitra ── */}
            <TouchableOpacity
              style={styles.titleRow}
              activeOpacity={0.8}
              onPress={() => router.push('/(mitra)/edit-profile')}
            >
              <View style={styles.titleIcon}>
                <CutleryIcon color={PRIMARY} size={18} />
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {mitra?.businessName || 'Warung Kumlot'}
              </Text>
            </TouchableOpacity>

            {/* ── Card 1: Ringkasan Stok ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ringkasan Stok</Text>

              {/* Box Limit Stok + Tombol VIP */}
              <View style={styles.limitBox}>
                <View style={styles.limitInfo}>
                  <Text style={styles.limitLabel}>Limit Stok Produk</Text>
                  <Text style={styles.limitCount}>
                    {stats.active} <Text style={styles.limitTotal}>/ 10</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.vipButton}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(mitra)/vip')}
                >
                  <Text style={styles.vipButtonText}>Upgrade VIP</Text>
                </TouchableOpacity>
              </View>

              {/* 3 Metrik Stok */}
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Total Produk</Text>
                  <Text style={styles.statNumber}>
                    {stats.total} <Text style={styles.statUnit}>Produk</Text>
                  </Text>
                </View>
                <View style={[styles.statBox, styles.statBoxBorder]}>
                  <Text style={styles.statLabel}>Stok Aktif</Text>
                  <Text style={styles.statNumber}>
                    {stats.active} <Text style={styles.statUnit}>Produk</Text>
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Stok Habis</Text>
                  <Text style={styles.statNumber}>
                    {stats.soldOut} <Text style={styles.statUnit}>Produk</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Card 2: Saldo Anda ── */}
            <View style={styles.card}>
              <View style={styles.saldoRow}>
                <View>
                  <Text style={styles.saldoLabel}>Saldo Anda</Text>
                  <Text style={styles.saldoAmount}>Rp 000.000,00</Text>
                </View>
                <TouchableOpacity
                  style={styles.tarikButton}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(mitra)/profile')}
                >
                  <Text style={styles.tarikButtonText}>Tarik Saldo</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Baris Cari & Tambah Produk ── */}
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
                activeOpacity={0.8}
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
                Tambahkan menu flash sale pertama melalui tombol + Tambah Produk.
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
    paddingTop: 10,
    paddingBottom: 32,
  },

  /* Title Row */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  /* Cards */
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 12,
  },

  /* Limit Box */
  limitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  limitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  limitCount: {
    fontSize: 15,
    fontWeight: '800',
    color: PRIMARY,
  },
  limitTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  vipButton: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  vipButtonText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '700',
  },

  /* 3 Stat Columns */
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '500',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIMARY,
  },

  /* Saldo Card */
  saldoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saldoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  saldoAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: PRIMARY,
  },
  tarikButton: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tarikButtonText: {
    color: WHITE,
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Search & Add */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
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
    paddingHorizontal: 12,
    height: 42,
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
    paddingHorizontal: 14,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: WHITE,
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Product Cards */
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#EEF1F2',
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  priceNow: {
    fontSize: 13.5,
    fontWeight: '700',
    color: PRIMARY,
  },
  priceOld: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    textDecorationLine: 'line-through',
  },
  productStock: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  stockBold: {
    fontWeight: '700',
    color: TEXT_DARK,
  },

  /* Edit Button (Mint Pill) */
  editButton: {
    backgroundColor: MINT,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  editButtonText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },

  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
