import { productService } from '@/services/product.service';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import type { Product, PromoBanner, SortFilter } from '@/types';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1a5c52';
const PRIMARY_LIGHT = '#e8f4f1';
const PRIMARY_DARK = '#123d37';
const GOLD = '#f59e0b';
const BG = '#f7f8fa';
const WHITE = '#ffffff';
const GRAY_50 = '#f9fafb';
const GRAY_100 = '#f3f4f6';
const GRAY_200 = '#e5e7eb';
const GRAY_300 = '#d1d5db';
const GRAY_400 = '#9ca3af';
const GRAY_500 = '#6b7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';
const DANGER = '#ef4444';

// ─── Location helpers ─────────────────────────────────────────────────────────

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (result && result[0]) {
      const r = result[0];
      const parts = [r.street, r.subregion || r.district, r.city].filter(Boolean);
      return parts.join(', ') || 'Lokasi Anda';
    }
  } catch { }
  return 'Lokasi Anda';
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface LocationHeaderProps {
  address: string;
  isVip: boolean;
  onEditPress: () => void;
}

function LocationHeader({ address, isVip, onEditPress }: LocationHeaderProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVip) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isVip]);

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.left}>
        <View style={headerStyles.pinRow}>
          <View style={headerStyles.pinIcon}>
            <Svg width="18" height="18" fill={PRIMARY} viewBox="0 0 16 16">
              <Path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>
            </Svg>
          </View>
          <View style={headerStyles.addressWrap}>
            <Text style={headerStyles.locationLabel}>Lokasi</Text>
            <TouchableOpacity onPress={onEditPress} activeOpacity={0.7}>
              <Text style={headerStyles.address} numberOfLines={1}>
                {address}
              </Text>
              <Text style={headerStyles.editHint}>Ketuk untuk ubah ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {isVip && (
        <Animated.View style={[headerStyles.vipBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={headerStyles.vipCrown}>👑</Text>
          <Text style={headerStyles.vipText}>VIP</Text>
        </Animated.View>
      )}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
  },
  left: { flex: 1 },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEmoji: { fontSize: 18 },
  addressWrap: { flex: 1 },
  locationLabel: { fontSize: 10, color: GRAY_500, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  address: { fontSize: 16, fontWeight: '700', color: GRAY_900, marginTop: 2 },
  editHint: { fontSize: 11, color: PRIMARY, marginTop: 1 },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  vipCrown: { fontSize: 12 },
  vipText: { fontSize: 12, fontWeight: '800', color: WHITE, letterSpacing: 0.5 },
});

// ─── Search Bar ────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChangeText: (t: string) => void;
}

function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <View style={searchStyles.wrap}>
      <View style={searchStyles.bar}>
        <Text style={searchStyles.icon}>🔍</Text>
        <TextInput
          style={searchStyles.input}
          placeholder="Cari makanan atau warung..."
          placeholderTextColor={GRAY_400}
          value={value}
          onChangeText={onChangeText}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={searchStyles.clearBtn}>
            <Text style={searchStyles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const searchStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GRAY_100,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  icon: { fontSize: 15 },
  input: { flex: 1, fontSize: 15, color: GRAY_900 },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GRAY_400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { color: WHITE, fontSize: 10, fontWeight: '700' },
});

// ─── Promo Banner Carousel ────────────────────────────────────────────────────

interface PromoBannerCarouselProps {
  banners: PromoBanner[];
}

function PromoBannerCarousel({ banners }: PromoBannerCarouselProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef<FlatList>(null);

  // Auto-scroll
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % banners.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <View style={bannerStyles.outerWrap}>
      <FlatList
        ref={flatRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (e.nativeEvent.layoutMeasurement.width));
          setActiveIdx(idx);
        }}
        renderItem={({ item }) => (
          <View style={[bannerStyles.card, { backgroundColor: item.bgColor }]}>
            <View style={bannerStyles.textWrap}>
              <Text style={bannerStyles.title}>{item.title}</Text>
              <Text style={bannerStyles.subtitle}>{item.subtitle}</Text>
            </View>
            <View style={[bannerStyles.emojiCircle, { backgroundColor: item.accentColor + '33' }]}>
              <Text style={bannerStyles.emoji}>{item.emoji}</Text>
              <View style={[bannerStyles.percentCircle, { backgroundColor: item.accentColor }]}>
                <Text style={bannerStyles.percentText}>%</Text>
              </View>
            </View>
          </View>
        )}
      />
      {banners.length > 1 && (
        <View style={bannerStyles.dotsRow}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[
                bannerStyles.dot,
                i === activeIdx && bannerStyles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const BANNER_H = 110;

const bannerStyles = StyleSheet.create({
  outerWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  card: {
    width: '100%',
    height: BANNER_H,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
    lineHeight: 18,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emoji: { fontSize: 36 },
  percentCircle: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: { fontSize: 12, fontWeight: '900', color: WHITE },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GRAY_300,
  },
  dotActive: {
    width: 18,
    backgroundColor: PRIMARY,
  },
});

// ─── Filter Chips ────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: SortFilter; label: string }[] = [
  { key: 'nearby', label: 'Di sekitar' },
  { key: 'discount', label: 'Diskon Terbesar' },
  { key: 'rating', label: 'Rating Tertinggi' },
];

interface FilterChipsProps {
  active: SortFilter;
  onChange: (f: SortFilter) => void;
}

function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={chipStyles.row}
      style={chipStyles.wrapper}
    >
      {FILTER_OPTIONS.map((opt) => {
        const isActive = opt.key === active;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[chipStyles.chip, isActive && chipStyles.chipActive]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.75}
          >
            <Text style={[chipStyles.chipText, isActive && chipStyles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const chipStyles = StyleSheet.create({
  wrapper: {
    marginTop: 14,
    marginBottom: 6,
  },
  row: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: GRAY_200,
    backgroundColor: WHITE,
  },
  chipActive: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY_LIGHT,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAY_700,
  },
  chipTextActive: {
    color: PRIMARY,
  },
});

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  item: Product;
  onPress: () => void;
}

function ProductCard({ item, onPress }: ProductCardProps) {
  const isSoldOut = Number(item.stock) <= 0 || item.status === 'sold_out';
  const discountPct = Math.round(
    ((Number(item.originalPrice) - Number(item.discountPrice)) / Number(item.originalPrice)) * 100
  );
  const rating = item.avgRating ?? null;
  const reviewCount = item.reviewCount ?? 0;

  return (
    <TouchableOpacity
      style={[cardStyles.container, isSoldOut && cardStyles.soldOut]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Image */}
      <View style={cardStyles.imageWrap}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={cardStyles.image} resizeMode="cover" />
        ) : (
          <View style={[cardStyles.image, cardStyles.imagePlaceholder]}>
            <Text style={cardStyles.imagePlaceholderIcon}>🍱</Text>
          </View>
        )}
        {isSoldOut && (
          <View style={cardStyles.soldOutOverlay}>
            <Text style={cardStyles.soldOutLabel}>Habis</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={cardStyles.content}>
        {/* Name */}
        <Text style={cardStyles.productName} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Warung */}
        <Text style={cardStyles.mitraName} numberOfLines={1}>
          {item.mitra?.businessName || 'Mitra'}
        </Text>

        {/* Rating */}
        {rating !== null && (
          <View style={cardStyles.ratingRow}>
            <Text style={cardStyles.ratingStar}>⭐</Text>
            <Text style={cardStyles.ratingValue}>{Number(rating).toFixed(1)}</Text>
            <Text style={cardStyles.ratingCount}>({reviewCount})</Text>
          </View>
        )}

        {/* Price row */}
        <View style={cardStyles.priceRow}>
          <Text style={cardStyles.discountPrice}>
            Rp {Number(item.discountPrice).toLocaleString('id-ID')}
          </Text>
          <Text style={cardStyles.originalPrice}>
            Rp{Number(item.originalPrice).toLocaleString('id-ID')}
          </Text>
          <View style={[cardStyles.stockBadge, isSoldOut && cardStyles.stockBadgeSoldOut]}>
            <Text style={[cardStyles.stockText, isSoldOut && cardStyles.stockTextSoldOut]}>
              {isSoldOut ? 'Habis' : `Sisa ${item.stock}`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    marginHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
    paddingVertical: 14,
    gap: 12,
    alignItems: 'center',
  },
  soldOut: { opacity: 0.6 },

  imageWrap: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 14,
  },
  imagePlaceholder: {
    backgroundColor: GRAY_100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: { fontSize: 40 },
  soldOutOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutLabel: { color: WHITE, fontSize: 13, fontWeight: '800' },

  content: { flex: 1, justifyContent: 'center' },

  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: GRAY_900,
    marginBottom: 2,
  },
  mitraName: {
    fontSize: 12,
    color: GRAY_500,
    marginBottom: 4,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 6,
  },
  ratingStar: { fontSize: 12 },
  ratingValue: { fontSize: 13, fontWeight: '700', color: GRAY_700 },
  ratingCount: { fontSize: 12, color: GRAY_400 },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discountPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY_DARK,
  },
  originalPrice: {
    fontSize: 12,
    color: GRAY_400,
    textDecorationLine: 'line-through',
    flexShrink: 1,
  },
  stockBadge: {
    marginLeft: 'auto',
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stockBadgeSoldOut: { backgroundColor: GRAY_100 },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
    color: WHITE,
  },
  stockTextSoldOut: { color: GRAY_500 },
});

// ─── Location Edit Modal ──────────────────────────────────────────────────────

interface LocationModalProps {
  visible: boolean;
  currentAddress: string;
  onClose: () => void;
  onDetect: () => void;
}

function LocationModal({ visible, currentAddress, onClose, onDetect }: LocationModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.title}>Ubah Lokasi</Text>
        <View style={modalStyles.currentWrap}>
          <Text style={modalStyles.currentLabel}>Lokasi saat ini</Text>
          <Text style={modalStyles.currentAddress}>{currentAddress}</Text>
        </View>
        <TouchableOpacity style={modalStyles.detectBtn} onPress={onDetect} activeOpacity={0.85}>
          <Text style={modalStyles.detectBtnText}>📍  Deteksi Ulang Lokasi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.75}>
          <Text style={modalStyles.cancelBtnText}>Batal</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 14,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GRAY_200,
    alignSelf: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: '800', color: GRAY_900 },
  currentWrap: {
    backgroundColor: GRAY_50,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: GRAY_200,
  },
  currentLabel: { fontSize: 11, color: GRAY_400, fontWeight: '600', marginBottom: 4 },
  currentAddress: { fontSize: 14, color: GRAY_700, fontWeight: '600' },
  detectBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  detectBtnText: { color: WHITE, fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: GRAY_500, fontWeight: '600', fontSize: 14 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerHome() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getTotalItems } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SortFilter>('nearby');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('Mendeteksi lokasi...');
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const isVip = user?.isVip ?? false;
  const cartCount = getTotalItems();

  // Fetch products
  const fetchProducts = useCallback(
    async (lat: number, lng: number, sort: SortFilter, search?: string) => {
      try {
        const data = await productService.getNearby({
          lat,
          lng,
          radius: 10,
          sort,
          search: search || undefined,
        });
        setProducts(Array.isArray(data) ? data : (data as any)?.data || []);
      } catch (err) {
        console.warn('Failed to load products:', err);
      }
    },
    []
  );

  // Fetch banners
  const fetchBanners = useCallback(async () => {
    try {
      const data = await productService.getBanners();
      setBanners(data);
    } catch { }
  }, []);

  // Init location
  useEffect(() => {
    (async () => {
      let lat = -7.575273;
      let lng = 110.8218226;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch { }

      setLocation({ lat, lng });
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      await Promise.all([fetchProducts(lat, lng, 'nearby'), fetchBanners()]);
      setLoading(false);
    })();
  }, []);

  // Re-fetch when filter changes
  useEffect(() => {
    if (!location) return;
    setLoading(true);
    fetchProducts(location.lat, location.lng, activeFilter, searchQuery).finally(() =>
      setLoading(false)
    );
  }, [activeFilter]);

  // Debounced search
  useEffect(() => {
    if (!location) return;
    const timer = setTimeout(() => {
      fetchProducts(location.lat, location.lng, activeFilter, searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (location) {
      await fetchProducts(location.lat, location.lng, activeFilter, searchQuery);
    }
    setRefreshing(false);
  };

  const handleDetectLocation = async () => {
    setLocationModalVisible(false);
    setAddress('Mendeteksi lokasi...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aktifkan izin lokasi di pengaturan perangkat.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLocation({ lat, lng });
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      setLoading(true);
      await fetchProducts(lat, lng, activeFilter, searchQuery);
      setLoading(false);
    } catch {
      setAddress('Gagal mendeteksi lokasi');
    }
  };

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard
      item={item}
      onPress={() => router.push(`/(customer)/products/${item.id}`)}
    />
  );

  const ListHeader = (
    <>
      {/* Search */}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {/* Promo Banner */}
      {banners.length > 0 && <PromoBannerCarousel banners={banners} />}

      {/* Filter Chips */}
      <FilterChips active={activeFilter} onChange={setActiveFilter} />

      {/* Section label */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {activeFilter === 'nearby'
            ? 'Terdekat di Sekitarmu'
            : activeFilter === 'discount'
              ? 'Diskon Terbesar'
              : 'Rating Tertinggi'}
        </Text>
        <Text style={styles.sectionCount}>{products.length} produk</Text>
      </View>
    </>
  );

  const EmptyComponent = loading ? null : (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>{searchQuery ? '🔍' : '🍽️'}</Text>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Tidak ditemukan' : 'Belum ada makanan'}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery ? 'Coba kata kunci lain.' : 'Cek lagi nanti — mitra biasanya posting sore hari!'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Location Header */}
      <LocationHeader
        address={address}
        isVip={isVip}
        onEditPress={() => setLocationModalVisible(true)}
      />

      {loading && products.length === 0 ? (
        <>
          {/* Show banner skeleton while loading */}
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
          {banners.length > 0 && <PromoBannerCarousel banners={banners} />}
          <FilterChips active={activeFilter} onChange={setActiveFilter} />
          <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />
        </>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyComponent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY} />
          }
        />
      )}

      {/* Floating Cart FAB */}
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

      {/* Location Modal */}
      <LocationModal
        visible={locationModalVisible}
        currentAddress={address}
        onClose={() => setLocationModalVisible(false)}
        onDetect={handleDetectLocation}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  listContent: {
    paddingBottom: 120,
    backgroundColor: BG,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GRAY_900,
  },
  sectionCount: {
    fontSize: 12,
    color: GRAY_400,
  },
  emptyWrap: {
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 60, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: GRAY_700, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: GRAY_500, textAlign: 'center', lineHeight: 20 },

  // Cart FAB
  cartFab: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: PRIMARY,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  cartFabIcon: { fontSize: 22, marginRight: 12 },
  cartFabMiddle: { flex: 1 },
  cartFabLabel: { fontSize: 15, fontWeight: '700', color: WHITE },
  cartFabSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  cartFabArrow: { fontSize: 18, color: WHITE, fontWeight: '700' },
});
