import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { orderService } from '@/services/order.service';
import type { Order } from '@/types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';

export default function CustomerOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return Colors.status.pendingPayment;
      case 'paid': return Colors.status.paid;
      case 'ready_for_pickup': return Colors.status.ready;
      case 'completed': return { bg: Colors.status.completed, text: '#fff' };
      case 'cancelled': return Colors.status.cancelled;
      default: return { bg: Colors.neutral[200], text: Colors.neutral[700] };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'Belum Dibayar';
      case 'paid': return 'Menunggu Disiapkan';
      case 'ready_for_pickup': return 'Siap Diambil';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const statusStyle = getStatusColor(item.status);
    const orderItemsList = item.items || (item as any).orderItems;
    const firstProduct = orderItemsList?.[0]?.product;
    const itemQty = orderItemsList?.[0]?.qty || (orderItemsList?.[0] as any)?.quantity || 1;
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(customer)/orders/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.mitraName}>{item.mitra?.businessName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.productName}>{firstProduct?.name || 'Item Surplus'}</Text>
          <Text style={styles.qty}>x{itemQty}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalText}>Total Belanja</Text>
          <Text style={styles.totalAmount}>Rp {Number(item.totalAmount).toLocaleString('id-ID')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="Kembali" variant="ghost" onPress={() => router.back()} />
        <Text style={styles.title}>Pesanan Saya</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary[500]} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada pesanan.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchOrders}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
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
  list: { padding: Spacing[4] },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[3] },
  mitraName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.neutral[800] },
  statusBadge: { paddingHorizontal: Spacing[2], paddingVertical: Spacing[1], borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[4] },
  productName: { fontSize: FontSize.md, color: Colors.neutral[700], flex: 1 },
  qty: { fontSize: FontSize.md, color: Colors.neutral[500], marginLeft: Spacing[2] },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.neutral[100], paddingTop: Spacing[3] },
  totalText: { fontSize: FontSize.sm, color: Colors.neutral[500] },
  totalAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary[700] },
  emptyText: { textAlign: 'center', marginTop: Spacing[10], color: Colors.neutral[500] },
});
