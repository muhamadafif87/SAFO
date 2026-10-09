import { productService } from "@/services/product.service";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";
import { useLocationStore } from "@/stores/location.store";
import type { Product, PromoBanner, SortFilter } from "@/types";
import { reverseGeocodeMapbox } from "@/utils/geocoding";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

if (MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY = "#1a5c52";
const PRIMARY_LIGHT = "#e8f4f1";
const PRIMARY_DARK = "#123d37";
const GOLD = "#f59e0b";
const BG = "#ffffff";
const WHITE = "#ffffff";
const GRAY_50 = "#f9fafb";
const GRAY_100 = "#f3f4f6";
const GRAY_200 = "#e5e7eb";
const GRAY_300 = "#d1d5db";
const GRAY_400 = "#9ca3af";
const GRAY_500 = "#6b7280";
const GRAY_700 = "#374151";
const GRAY_900 = "#111827";
const DANGER = "#ef4444";

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
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isVip]);

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.left}>
        <View style={headerStyles.pinRow}>
          <View style={headerStyles.pinIcon}>
            <Svg width="16" height="16" fill={PRIMARY} viewBox="0 0 16 16">
              <Path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
            </Svg>
          </View>
          <View style={headerStyles.addressWrap}>
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
        <Animated.View
          style={[headerStyles.vipBadge, { transform: [{ scale: pulseAnim }] }]}
        >
          <Text style={headerStyles.vipCrown}>👑</Text>
          <Text style={headerStyles.vipText}>VIP</Text>
        </Animated.View>
      )}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
  },
  left: { flex: 1 },
  pinRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pinEmoji: { fontSize: 18 },
  addressWrap: { flex: 1 },
  locationLabel: {
    fontSize: 11,
    color: GRAY_400,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  address: { fontSize: 15, fontWeight: "700", color: GRAY_900, marginTop: 1 },
  editHint: { fontSize: 11, color: PRIMARY, marginTop: 1 },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
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
  vipCrown: { fontSize: 13 },
  vipText: {
    fontSize: 13,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: 0.5,
  },
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
          <TouchableOpacity
            onPress={() => onChangeText("")}
            style={searchStyles.clearBtn}
          >
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
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: { color: WHITE, fontSize: 10, fontWeight: "700" },
});

// ─── Promo Banner Carousel ────────────────────────────────────────────────────

interface PromoBannerCarouselProps {
  banners: PromoBanner[];
}

const BANNER_MARGIN = 16;

function PromoBannerCarousel({ banners }: PromoBannerCarouselProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef<FlatList>(null);

  // Lebar layar dibaca lewat hook (bukan Dimensions.get sekali di module
  // scope) supaya carousel ikut menyesuaikan saat device di-rotate.
  const { width: screenWidth } = useWindowDimensions();
  const bannerWidth = screenWidth - BANNER_MARGIN * 2;
  // Tinggi proporsional terhadap lebar, dengan batas min/max supaya tetap
  // enak dilihat baik di HP kecil maupun tablet — bukan angka fixed 110
  // untuk semua ukuran layar.
  const bannerHeight = Math.round(
    Math.min(140, Math.max(96, bannerWidth * 0.32)),
  );

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
        // Lebar item eksplisit (angka), bukan "100%" — di dalam FlatList
        // horizontal, "100%" tidak reliable karena parent-nya tidak
        // punya lebar pasti sebelum anak-anaknya diukur. Ini juga yang
        // membuat pagingEnabled salah snap di sebagian device.
        getItemLayout={(_, index) => ({
          length: bannerWidth,
          offset: bannerWidth * index,
          index,
        })}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
          setActiveIdx(idx);
        }}
        renderItem={({ item }) => (
          <View
            style={[
              bannerStyles.card,
              {
                width: bannerWidth,
                height: bannerHeight,
                backgroundColor: item.bgColor,
              },
            ]}
          >
            <View style={bannerStyles.textWrap}>
              <Text style={bannerStyles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={bannerStyles.subtitle} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </View>
            <View
              style={[
                bannerStyles.emojiCircle,
                { backgroundColor: item.accentColor + "33" },
              ]}
            >
              <Text style={bannerStyles.emoji}>{item.emoji}</Text>
              <View
                style={[
                  bannerStyles.percentCircle,
                  { backgroundColor: item.accentColor },
                ]}
              >
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

const bannerStyles = StyleSheet.create({
  outerWrap: {
    marginHorizontal: BANNER_MARGIN,
    marginTop: 14,
    marginBottom: 4,
  },
  card: {
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    marginTop: 4,
    lineHeight: 18,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  emoji: { fontSize: 36 },
  percentCircle: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  percentText: { fontSize: 12, fontWeight: "900", color: WHITE },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
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
  { key: "nearby", label: "Di sekitar" },
  { key: "discount", label: "Diskon Terbesar" },
  { key: "rating", label: "Rating Tertinggi" },
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
            <Text
              style={[
                chipStyles.chipText,
                isActive && chipStyles.chipTextActive,
              ]}
            >
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
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
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
  const [imgError, setImgError] = useState(false);
  const isSoldOut = Number(item.stock) <= 0 || item.status === "sold_out";
  const discountPct = Math.round(
    ((Number(item.originalPrice) - Number(item.discountPrice)) /
      Number(item.originalPrice)) *
      100,
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
        {item.photoUrl && !imgError ? (
          <Image
            source={{ uri: item.photoUrl }}
            style={cardStyles.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
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
          {item.mitra?.businessName || "Mitra"}
        </Text>

        {/* Rating */}
        {rating !== null && (
          <View style={cardStyles.ratingRow}>
            <Text style={cardStyles.ratingStar}>⭐</Text>
            <Text style={cardStyles.ratingValue}>
              {Number(rating).toFixed(1)}
            </Text>
            <Text style={cardStyles.ratingCount}>({reviewCount})</Text>
          </View>
        )}

        {/* Price row */}
        <View style={cardStyles.priceRow}>
          <Text style={cardStyles.discountPrice}>
            Rp {Number(item.discountPrice).toLocaleString("id-ID")}
          </Text>
          <Text style={cardStyles.originalPrice}>
            Rp{Number(item.originalPrice).toLocaleString("id-ID")}
          </Text>
          <View
            style={[
              cardStyles.stockBadge,
              isSoldOut && cardStyles.stockBadgeSoldOut,
            ]}
          >
            <Text
              style={[
                cardStyles.stockText,
                isSoldOut && cardStyles.stockTextSoldOut,
              ]}
            >
              {isSoldOut ? "Habis" : `Sisa ${item.stock}`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: WHITE,
    alignSelf: "center",
    width: "92%",
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
    alignItems: "center",
  },
  soldOut: { opacity: 0.6 },

  imageWrap: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: "hidden",
    flexShrink: 0,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 14,
  },
  imagePlaceholder: {
    backgroundColor: GRAY_100,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderIcon: { fontSize: 40 },
  soldOutOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutLabel: { color: WHITE, fontSize: 13, fontWeight: "800" },

  content: { flex: 1, justifyContent: "center" },

  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: GRAY_900,
    marginBottom: 2,
  },
  mitraName: {
    fontSize: 12,
    color: GRAY_500,
    marginBottom: 4,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 6,
  },
  ratingStar: { fontSize: 12 },
  ratingValue: { fontSize: 13, fontWeight: "700", color: GRAY_700 },
  ratingCount: { fontSize: 12, color: GRAY_400 },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  discountPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY_DARK,
  },
  originalPrice: {
    fontSize: 12,
    color: GRAY_400,
    textDecorationLine: "line-through",
    flexShrink: 1,
  },
  stockBadge: {
    marginLeft: "auto",
    right: 10,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stockBadgeSoldOut: { backgroundColor: GRAY_100 },
  stockText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
  },
  stockTextSoldOut: { color: GRAY_500 },
});

// ─── Location Picker Modal (peta + pin-point + deteksi lokasi saat ini) ──────

interface LocationPickerModalProps {
  visible: boolean;
  initialLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onConfirm: (lat: number, lng: number, address: string) => void;
}

// Fallback default kalau belum ada lokasi sama sekali (Solo).
const DEFAULT_COORD = {
  latitude: -7.575273,
  longitude: 110.8218226,
};

function LocationPickerModal({
  visible,
  initialLocation,
  onClose,
  onConfirm,
}: LocationPickerModalProps) {
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Koordinat pin saat ini (mengikuti titik tengah peta — lihat pola
  // "fixed center pin" di bawah).
  const [coord, setCoord] = useState<{ latitude: number; longitude: number }>(
    initialLocation
      ? { latitude: initialLocation.lat, longitude: initialLocation.lng }
      : {
          latitude: DEFAULT_COORD.latitude,
          longitude: DEFAULT_COORD.longitude,
        },
  );
  const [previewAddress, setPreviewAddress] = useState("");
  const [isPanning, setIsPanning] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const resolveAddress = useCallback((lat: number, lng: number) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    setResolvingAddress(true);
    geocodeTimer.current = setTimeout(async () => {
      const { shortName } = await reverseGeocodeMapbox(lat, lng);
      setPreviewAddress(shortName);
      setResolvingAddress(false);
    }, 400);
  }, []);

  // Reset ke lokasi awal setiap kali modal dibuka.
  useEffect(() => {
    if (!visible) return;
    const start = initialLocation
      ? { latitude: initialLocation.lat, longitude: initialLocation.lng }
      : {
          latitude: DEFAULT_COORD.latitude,
          longitude: DEFAULT_COORD.longitude,
        };
    setCoord(start);
    resolveAddress(start.latitude, start.longitude);
    cameraRef.current?.setCamera({
      centerCoordinate: [start.longitude, start.latitude],
      zoomLevel: 13,
      animationDuration: 300,
    });
  }, [visible, initialLocation, resolveAddress]);

  // Pola "pin tetap di tengah, peta yang digeser" — lebih stabil di
  // Android/iOS dibanding draggable marker, dan ini yang dipakai
  // kebanyakan app on-demand untuk fitur "set lokasi lewat pin-point".
  const handleRegionChangeComplete = (coords: {
    latitude: number;
    longitude: number;
  }) => {
    setIsPanning(false);
    setCoord({ latitude: coords.latitude, longitude: coords.longitude });
    resolveAddress(coords.latitude, coords.longitude);
  };

  const handleUseCurrentLocation = async () => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Ditolak",
          "Aktifkan izin lokasi di pengaturan perangkat untuk memakai fitur ini.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const next = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      mapRef.current?.setCamera({
        centerCoordinate: [next.longitude, next.latitude],
        zoomLevel: 13,
        animationDuration: 500,
      });
      // setCamera akan memicu update peta, tapi kita set
      // juga di sini supaya address preview langsung mulai diresolve
      // tanpa menunggu animasi peta selesai.
      setCoord(next);
      resolveAddress(next.latitude, next.longitude);
    } catch {
      Alert.alert("Gagal", "Tidak bisa mendeteksi lokasi saat ini.");
    } finally {
      setDetecting(false);
    }
  };

  const handleConfirm = () => {
    if (resolvingAddress) return;
    onConfirm(coord.latitude, coord.longitude, previewAddress || "Lokasi Anda");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={pickerStyles.container}>
        {/* Top bar */}
        <View style={pickerStyles.topBar}>
          <TouchableOpacity
            onPress={onClose}
            style={pickerStyles.closeBtn}
            activeOpacity={0.7}
          >
            <Text style={pickerStyles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={pickerStyles.topBarTitle}>Atur Titik Lokasi</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Map */}
        <View style={pickerStyles.mapWrap}>
          <Mapbox.MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            onRegionWillChange={() => setIsPanning(true)}
            onRegionDidChange={(feature) => {
              const [longitude, latitude] = feature.geometry.coordinates;
              handleRegionChangeComplete({ latitude, longitude });
            }}
          >
            <Mapbox.Camera
              ref={cameraRef}
              centerCoordinate={[coord.longitude, coord.latitude]}
              zoomLevel={13}
              animationDuration={300}
            />
          </Mapbox.MapView>

          {/* Pin tetap di tengah layar — peta yang bergerak di bawahnya */}
          <View pointerEvents="none" style={pickerStyles.centerPinWrap}>
            <View
              style={[
                pickerStyles.pinBounce,
                isPanning && pickerStyles.pinBounceLifted,
              ]}
            >
              <Svg width="34" height="34" fill={PRIMARY} viewBox="0 0 16 16">
                <Path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
              </Svg>
            </View>
            <View style={pickerStyles.pinShadow} />
          </View>

          {/* Tombol deteksi lokasi saat ini — floating di atas peta */}
          <TouchableOpacity
            style={pickerStyles.myLocationBtn}
            onPress={handleUseCurrentLocation}
            activeOpacity={0.8}
            disabled={detecting}
          >
            {detecting ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <Text style={pickerStyles.myLocationIcon}>🎯</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom sheet: preview alamat + konfirmasi */}
        <View style={pickerStyles.sheet}>
          <Text style={pickerStyles.sheetLabel}>Titik lokasi terpilih</Text>
          <Text style={pickerStyles.sheetAddress} numberOfLines={2}>
            {resolvingAddress ? "Mencari alamat..." : previewAddress}
          </Text>
          <TouchableOpacity
            style={pickerStyles.currentLocationRow}
            onPress={handleUseCurrentLocation}
            activeOpacity={0.75}
            disabled={detecting}
          >
            <Text style={pickerStyles.currentLocationRowText}>
              {detecting ? "Mendeteksi..." : "📍 Gunakan Lokasi Saat Ini"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              pickerStyles.confirmBtn,
              resolvingAddress && pickerStyles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={resolvingAddress}
          >
            <Text style={pickerStyles.confirmBtnText}>
              Konfirmasi Lokasi Ini
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GRAY_100,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 16, color: GRAY_700, fontWeight: "700" },
  topBarTitle: { fontSize: 16, fontWeight: "800", color: GRAY_900 },
  mapWrap: { flex: 1 },
  centerPinWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -17,
    marginTop: -40,
    alignItems: "center",
  },
  pinBounce: { transform: [{ translateY: 0 }] },
  pinBounceLifted: { transform: [{ translateY: -8 }] },
  pinShadow: {
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.25)",
    marginTop: 2,
  },
  myLocationBtn: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  myLocationIcon: { fontSize: 20 },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetLabel: {
    fontSize: 11,
    color: GRAY_400,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sheetAddress: {
    fontSize: 15,
    color: GRAY_900,
    fontWeight: "700",
    minHeight: 40,
  },
  currentLocationRow: {
    paddingVertical: 10,
  },
  currentLocationRowText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: "700",
  },
  confirmBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: WHITE, fontWeight: "700", fontSize: 15 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerHome() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const {
    activeLocation,
    setActiveLocation,
    restoreLocation,
    isLocationReady,
  } = useLocationStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SortFilter>("nearby");

  // Derived dari store — tampilkan label singkat di header
  const address = activeLocation?.address ?? "Mendeteksi lokasi...";
  const location = activeLocation ? { lat: activeLocation.lat, lng: activeLocation.lng } : null;

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
        console.warn("Failed to load products:", err);
      }
    },
    [],
  );

  // Fetch banners
  const fetchBanners = useCallback(async () => {
    try {
      const data = await productService.getBanners();
      setBanners(data);
    } catch {}
  }, []);

  // Init location: coba restore dari storage dulu, lalu GPS jika belum ada
  useEffect(() => {
    (async () => {
      // 1. Restore dari SecureStore (persistensi antar session)
      await restoreLocation();

      let lat = -7.575273;
      let lng = 110.8218226;

      if (activeLocation) {
        // Sudah ada lokasi tersimpan, langsung pakai
        lat = activeLocation.lat;
        lng = activeLocation.lng;
      } else {
        // Belum ada — deteksi via GPS
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({});
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        } catch {}

        const { shortName, fullAddress } = await reverseGeocodeMapbox(lat, lng);
        await setActiveLocation({ lat, lng, address: shortName, fullAddress });
      }

      await Promise.all([fetchProducts(lat, lng, "nearby"), fetchBanners()]);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filter changes
  useEffect(() => {
    if (!location) return;
    setLoading(true);
    fetchProducts(
      location.lat,
      location.lng,
      activeFilter,
      searchQuery,
    ).finally(() => setLoading(false));
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
      await fetchProducts(
        location.lat,
        location.lng,
        activeFilter,
        searchQuery,
      );
    }
    setRefreshing(false);
  };

  // Dipanggil dari location-picker route setelah user memilih lokasi
  const handleConfirmLocation = async (
    lat: number,
    lng: number,
    resolvedAddress: string,
    fullAddress?: string,
  ) => {
    await setActiveLocation({ lat, lng, address: resolvedAddress, fullAddress });
    setLoading(true);
    await fetchProducts(lat, lng, activeFilter, searchQuery);
    setLoading(false);
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
          {activeFilter === "nearby"
            ? "Terdekat di Sekitarmu"
            : activeFilter === "discount"
              ? "Diskon Terbesar"
              : "Rating Tertinggi"}
        </Text>
        <Text style={styles.sectionCount}>{products.length} produk</Text>
      </View>
    </>
  );

  const EmptyComponent = loading ? null : (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>{searchQuery ? "🔍" : "🍽️"}</Text>
      <Text style={styles.emptyTitle}>
        {searchQuery ? "Tidak ditemukan" : "Belum ada makanan"}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery
          ? "Coba kata kunci lain."
          : "Cek lagi nanti — mitra biasanya posting sore hari!"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Location Header */}
      <LocationHeader
        address={address}
        isVip={isVip}
        onEditPress={() => router.push("/(customer)/location-picker")}
      />

      {loading && products.length === 0 ? (
        <>
          {/* Show banner skeleton while loading */}
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
          {banners.length > 0 && <PromoBannerCarousel banners={banners} />}
          <FilterChips active={activeFilter} onChange={setActiveFilter} />
          <ActivityIndicator
            size="large"
            color={PRIMARY}
            style={{ marginTop: 60 }}
          />
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={PRIMARY}
            />
          }
        />
      )}

      {/* Cart FAB */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.cartFab}
          onPress={() => router.push("/(customer)/checkout")}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: GRAY_900,
  },
  sectionCount: {
    fontSize: 12,
    color: GRAY_400,
  },
  emptyWrap: {
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 60, marginBottom: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GRAY_700,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: GRAY_500,
    textAlign: "center",
    lineHeight: 20,
  },

  // Cart FAB
  cartFab: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: PRIMARY,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  cartFabIcon: { fontSize: 22, marginRight: 12 },
  cartFabMiddle: { flex: 1 },
  cartFabLabel: { fontSize: 15, fontWeight: "700", color: WHITE },
  cartFabSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  cartFabArrow: { fontSize: 18, color: WHITE, fontWeight: "700" },
});
