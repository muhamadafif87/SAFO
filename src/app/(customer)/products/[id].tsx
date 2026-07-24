import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { productService } from '@/services/product.service';
import { orderService } from '@/services/order.service';
import type { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);

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

  const handleCheckout = async () => {
    if (!product) return;
    setIsOrdering(true);
    try {
      // 1. Create order
      const order = await orderService.create({
        items: [{ productId: product.id, quantity }],
      });

      // 2. Mock payment
      await orderService.payMock(order.id);

      Alert.alert('Sukses', 'Pesanan berhasil dibuat dan dibayar!', [
        { text: 'Lihat Pesanan', onPress: () => router.replace(`/(customer)/orders/${order.id}`) }
      ]);
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.message || 'Gagal membuat pesanan');
    } finally {
      setIsOrdering(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  if (!product) return null;

  const subtotal = Number(product.discountPrice) * quantity;
  const total = subtotal + 1000; // Platform fee

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.mitraName}>{product.mitra?.businessName}</Text>
          <Text style={styles.address}>{product.mitra?.address}</Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.description && <Text style={styles.description}>{product.description}</Text>}

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.originalPrice}>Rp {Number(product.originalPrice).toLocaleString('id-ID')}</Text>
              <Text style={styles.discountPrice}>Rp {Number(product.discountPrice).toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>Sisa {product.stock}</Text>
            </View>
          </View>

          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Waktu Pengambilan</Text>
            <Text style={styles.timeValue}>
              {new Date(product.pickupWindowStart).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} - {new Date(product.pickupWindowEnd).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>Jumlah</Text>
          <View style={styles.qtyControls}>
            <Button 
              title="-" 
              variant="secondary" 
              onPress={() => setQuantity(Math.max(1, quantity - 1))} 
              style={styles.qtyBtn}
              textStyle={styles.qtyBtnText}
            />
            <Text style={styles.qtyValue}>{quantity}</Text>
            <Button 
              title="+" 
              variant="secondary" 
              onPress={() => setQuantity(Math.min(product.stock, quantity + 1))} 
              style={styles.qtyBtn}
              textStyle={styles.qtyBtnText}
            />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total (inc. Rp 1.000 fee)</Text>
          <Text style={styles.summaryValue}>Rp {total.toLocaleString('id-ID')}</Text>
        </View>

        <Button
          title={isOrdering ? "Memproses..." : "Pesan & Bayar (Mock)"}
          onPress={handleCheckout}
          disabled={isOrdering || product.stock < 1}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: Spacing[10] },
  header: {
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  mitraName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  address: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: Spacing[1] },
  details: { padding: Spacing[4], backgroundColor: Colors.neutral[0], marginTop: Spacing[2] },
  productName: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  description: { fontSize: FontSize.md, color: Colors.neutral[600], marginTop: Spacing[2], lineHeight: 22 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing[4] },
  originalPrice: { fontSize: FontSize.md, color: Colors.neutral[400], textDecorationLine: 'line-through' },
  discountPrice: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: Colors.primary[600] },
  stockBadge: { backgroundColor: Colors.secondary[100], paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: BorderRadius.full },
  stockText: { color: Colors.secondary[700], fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  timeBox: { marginTop: Spacing[6], backgroundColor: Colors.primary[50], padding: Spacing[4], borderRadius: BorderRadius.md },
  timeLabel: { fontSize: FontSize.sm, color: Colors.primary[700], marginBottom: Spacing[1] },
  timeValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary[900] },
  bottomBar: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  qtyLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.neutral[700] },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 40, height: 40, padding: 0, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 20 },
  qtyValue: { width: 40, textAlign: 'center', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.neutral[500] },
  summaryValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
});
