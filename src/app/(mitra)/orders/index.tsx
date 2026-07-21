import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import { Order } from '@/types';
import { orderService } from '@/services/order.service';

export default function MitraOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getMitraOrders();
      setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.status.paid;
      case 'ready': return Colors.status.ready;
      case 'completed': return Colors.status.completed;
      case 'cancelled': return Colors.status.cancelled;
      default: return Colors.status.pendingPayment;
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const statusStyle = getStatusColor(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/(mitra)/orders/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order #{item.id.substring(0, 8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.itemName}>
            {item.orderItems?.[0]?.quantity}x {item.orderItems?.[0]?.product?.name}
            {item.orderItems && item.orderItems.length > 1 ? ` + ${item.orderItems.length - 1} item lain` : ''}
          </Text>
          <Text style={styles.totalAmount}>Rp {item.totalAmount.toLocaleString('id-ID')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pesanan Masuk</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada pesanan.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  listContainer: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  orderId: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    fontWeight: FontWeight.medium,
  },
  statusBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.neutral[900],
    flex: 1,
  },
  totalAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.secondary[600],
  },
  emptyContainer: {
    padding: Spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.neutral[500],
  },
});
