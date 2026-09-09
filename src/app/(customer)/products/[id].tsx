import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { productService } from '@/services/product.service';
import type { Product } from '@/types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import { useCartStore } from '@/stores/cart.store';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const { addItem, forceAddItem, getItemQty, getTotalItems } = useCartStore();
  const cartQty = product ? getItemQty(product.id) : 0;

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const data = await productService.getById(id);
        setProduct(data);
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.message || 'Gagal memuat produk');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;

    const result = addItem(product, quantity);

    if (result === 'mitra_conflict') {
      Alert.alert(
        'Ganti Toko?',
        'Cart kamu berisi produk dari toko lain. Apakah kamu ingin mengosongkan cart dan mulai pesanan dari toko ini?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ganti Toko',
            style: 'destructive',
            onPress: () => {
              forceAddItem(product, quantity);
              Alert.alert('Ditambahkan!', `${product.name} (x${quantity}) ditambahkan ke pesanan.`);
            },
          },
        ]
      );
      return;
    }

    const msg = result === 'updated'
      ? `Qty ${product.name} diperbarui.`
      : `${product.name} (x${quantity}) ditambahkan ke pesanan!`;
    Alert.alert('Berhasil', msg);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  if (!product) return null;

  const discountPercent = Math.round(
    ((Number(product.originalPrice) - Number(product.discountPrice)) / Number(product.originalPrice)) * 100
  );

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const isPickupActive =
    new Date() >= new Date(product.pickupWindowStart) &&
    new Date() <= new Date(product.pickupWindowEnd);

  const isSoldOut = product.stock <= 0 || product.status === 'sold_out';
  const maxQty = Math.min(product.stock, 10);

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        {getTotalItems() > 0 && (
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => router.push('/(customer)/checkout')}
          >
            <Text style={styles.cartBtnText}>🛒 Lihat Pesanan ({getTotalItems()})</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Product image */}
        {product.photoUrl ? (
          <Image source={{ uri: product.photoUrl }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>🍱</Text>
          </View>
        )}

        {/* Discount badge */}
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
        </View>

        {/* Mitra info */}
        <View style={styles.mitraSection}>
          <Text style={styles.mitraName}>{product.mitra?.businessName}</Text>
          <Text style={styles.address}>{product.mitra?.address}</Text>
          {product.mitra?.distanceKm !== undefined && (
            <Text style={styles.distance}>📍 {product.mitra.distanceKm.toFixed(1)} km dari lokasi kamu</Text>
          )}
        </View>

        {/* Product details */}
        <View style={styles.details}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {/* Price */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.originalPrice}>Rp {Number(product.originalPrice).toLocaleString('id-ID')}</Text>
              <Text style={styles.discountPrice}>Rp {Number(product.discountPrice).toLocaleString('id-ID')}</Text>
            </View>
            <View style={[styles.stockBadge, isSoldOut && styles.stockBadgeSoldOut]}>
              <Text style={[styles.stockText, isSoldOut && styles.stockTextSoldOut]}>
                {isSoldOut ? 'Habis' : `Sisa ${product.stock}`}
              </Text>
            </View>
          </View>

          {/* Pickup window */}
          <View style={[styles.timeBox, isPickupActive && styles.timeBoxActive]}>
            <Text style={styles.timeLabel}>⏰ Waktu Pengambilan</Text>
            <Text style={styles.timeValue}>
              {formatTime(product.pickupWindowStart)} – {formatTime(product.pickupWindowEnd)}
            </Text>
            {isPickupActive && (
              <Text style={styles.timeActive}>● Sedang Berlangsung</Text>
            )}
          </View>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Bottom bar */}
      {!isSoldOut && (
        <View style={styles.bottomBar}>
          {/* Qty selector */}
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Jumlah</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.min(maxQty, quantity + 1))}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {cartQty > 0 && (
            <Text style={styles.alreadyInCart}>✓ {cartQty} sudah di pesanan</Text>
          )}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddToCart}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>
              Tambah ke Pesanan · Rp {(Number(product.discountPrice) * quantity).toLocaleString('id-ID')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: Spacing[4] },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  backBtn: { padding: Spacing[1] },
  backText: { fontSize: FontSize.md, color: Colors.primary[600], fontWeight: FontWeight.medium },
  cartBtn: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
  },
  cartBtnText: { fontSize: FontSize.sm, color: '#fff', fontWeight: FontWeight.bold },

  productImage: {
    width: '100%',
    height: 240,
  },
  imagePlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: { fontSize: 80 },

  discountBadge: {
    position: 'absolute',
    top: 56,
    right: Spacing[4],
    backgroundColor: Colors.secondary[500],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  discountBadgeText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  mitraSection: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  mitraName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  address: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: 2 },
  distance: { fontSize: FontSize.sm, color: Colors.primary[600], marginTop: Spacing[1] },

  details: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    marginTop: Spacing[2],
  },
  productName: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  description: { fontSize: FontSize.md, color: Colors.neutral[600], marginTop: Spacing[2], lineHeight: 22 },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing[4],
  },
  originalPrice: { fontSize: FontSize.md, color: Colors.neutral[400], textDecorationLine: 'line-through' },
  discountPrice: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: Colors.primary[600] },

  stockBadge: {
    backgroundColor: Colors.secondary[100],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  stockBadgeSoldOut: { backgroundColor: Colors.neutral[200] },
  stockText: { color: Colors.secondary[700], fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  stockTextSoldOut: { color: Colors.neutral[500] },

  timeBox: {
    marginTop: Spacing[6],
    backgroundColor: Colors.primary[50],
    padding: Spacing[4],
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary[300],
  },
  timeBoxActive: {
    backgroundColor: Colors.secondary[50],
    borderLeftColor: Colors.secondary[400],
  },
  timeLabel: { fontSize: FontSize.sm, color: Colors.primary[700], marginBottom: Spacing[1] },
  timeValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary[900] },
  timeActive: { fontSize: FontSize.xs, color: Colors.secondary[600], marginTop: Spacing[1] },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    paddingBottom: Spacing[6],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  qtyLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.neutral[700] },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, color: Colors.neutral[700], lineHeight: 24 },
  qtyValue: { width: 36, textAlign: 'center', fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[900] },

  alreadyInCart: {
    fontSize: FontSize.sm,
    color: Colors.secondary[600],
    fontWeight: FontWeight.medium,
    marginBottom: Spacing[3],
  },

  addBtn: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: 'center',
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
});
