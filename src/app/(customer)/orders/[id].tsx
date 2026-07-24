import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { orderService } from '@/services/order.service';
import type { Order } from '@/types';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';

export default function CustomerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      if (!id) return;
      const data = await orderService.getById(id);
      setOrder(data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Gagal memuat pesanan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    
    // Auto-refresh every 10 seconds if waiting for pickup
    const interval = setInterval(() => {
      if (order && order.status !== 'completed' && order.status !== 'cancelled') {
        fetchOrder();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [id, order?.status]);

  if (loading && !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  if (!order) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="Kembali" variant="ghost" onPress={() => router.push('/(customer)/orders')} />
        <Text style={styles.title}>Detail Pesanan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {order.status === 'ready_for_pickup' || order.status === 'paid' ? (
          <View style={styles.pickupCard}>
            <Text style={styles.pickupLabel}>Kode Pengambilan</Text>
            <View style={styles.pickupCodeBox}>
              <Text style={styles.pickupCode}>{order.pickupCode}</Text>
            </View>
            <Text style={styles.pickupHelper}>
              Tunjukkan kode ini kepada petugas toko saat mengambil makanan.
            </Text>
          </View>
        ) : null}
        
        {order.status === 'completed' && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>Pesanan Selesai 🎉</Text>
            <Text style={styles.successSubtext}>Terima kasih telah menyelamatkan makanan hari ini!</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toko</Text>
          <Text style={styles.mitraName}>{order.mitra?.businessName}</Text>
          <Text style={styles.mitraAddress}>{order.mitra?.address}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Belanja</Text>
          {(order.items || (order as any).orderItems || [])?.map((item: any) => {
            const itemQty = item.qty || item.quantity || 1;
            const price = Number(item.priceAtPurchase || 0);
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.product?.name || 'Paket Roti Surplus'}</Text>
                  <Text style={styles.itemQty}>{itemQty} x Rp {price.toLocaleString('id-ID')}</Text>
                </View>
                <Text style={styles.itemTotal}>
                  Rp {(itemQty * price).toLocaleString('id-ID')}
                </Text>
              </View>
            );
          })}
          
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Biaya Layanan</Text>
            <Text style={styles.feeValue}>Rp {Number(order.platformFee).toLocaleString('id-ID')}</Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalValue}>Rp {Number(order.totalAmount).toLocaleString('id-ID')}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  scroll: { padding: Spacing[4] },
  
  pickupCard: {
    backgroundColor: Colors.primary[50],
    padding: Spacing[6],
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  pickupLabel: { fontSize: FontSize.md, color: Colors.primary[700], marginBottom: Spacing[2] },
  pickupCodeBox: {
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[4],
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary[500],
    borderStyle: 'dashed',
    marginBottom: Spacing[3],
  },
  pickupCode: { fontSize: FontSize['4xl'], fontWeight: FontWeight.bold, letterSpacing: 4, color: Colors.primary[700] },
  pickupHelper: { fontSize: FontSize.sm, color: Colors.primary[600], textAlign: 'center' },
  
  successCard: {
    backgroundColor: Colors.secondary[50],
    padding: Spacing[6],
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  successText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.secondary[700], marginBottom: Spacing[1] },
  successSubtext: { fontSize: FontSize.sm, color: Colors.secondary[600], textAlign: 'center' },

  section: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing[4],
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[900], marginBottom: Spacing[3] },
  mitraName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.neutral[800] },
  mitraAddress: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: Spacing[1] },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[3] },
  itemName: { fontSize: FontSize.md, color: Colors.neutral[800] },
  itemQty: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: 2 },
  itemTotal: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing[3], borderTopWidth: 1, borderTopColor: Colors.neutral[100] },
  feeLabel: { fontSize: FontSize.sm, color: Colors.neutral[500] },
  feeValue: { fontSize: FontSize.sm, color: Colors.neutral[700] },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing[3], paddingTop: Spacing[3], borderTopWidth: 1, borderTopColor: Colors.neutral[200] },
  totalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary[700] },
});
