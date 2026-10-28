import { Colors } from '@/constants/typography';
import { orderService } from '@/services/order.service';
import { Order, OrderStatus } from '@/types';
import { showConfirm } from '@/utils/alert';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
const DANGER = '#C0392B';
const DANGER_BG = '#FBE9E7';

type FilterKey = 'all' | 'waiting' | 'accepted' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'waiting', label: 'Menunggu' },
  { key: 'accepted', label: 'Terima' },
  { key: 'cancelled', label: 'Batalkan' },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Menunggu Bayar',
  paid: 'Menunggu Diproses',
  accepted: 'Terima',
  ready: 'Terima',
  ready_for_pickup: 'Terima',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
};

const STATUS_CHIP: Record<OrderStatus, { bg: string; fg: string }> = {
  pending_payment: { bg: '#FEF3C7', fg: '#92400E' },
  paid: { bg: '#FEF3C7', fg: '#92400E' },
  accepted: { bg: MINT, fg: PRIMARY },
  ready: { bg: MINT, fg: PRIMARY },
  ready_for_pickup: { bg: MINT, fg: PRIMARY },
  completed: { bg: MINT, fg: PRIMARY },
  cancelled: { bg: '#FDECEC', fg: '#C0392B' },
  expired: { bg: '#EEF1F2', fg: Colors.neutral[500] },
};

const FILTER_GROUPS: Record<FilterKey, OrderStatus[] | null> = {
  all: null,
  waiting: ['pending_payment', 'paid'],
  accepted: ['accepted', 'ready', 'ready_for_pickup', 'completed'],
  cancelled: ['cancelled', 'expired'],
};

const BackIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
  </Svg>
);

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: '-', date: '-' };
  return {
    time: new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
    date: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date),
  };
}

export default function MitraOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderService.getMitraOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[mitra/orders] Gagal memuat pesanan', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchOrders();
  }, [fetchOrders]);

  const visibleOrders = useMemo(() => {
    const allowed = FILTER_GROUPS[filter];
    if (!allowed) return orders;
    return orders.filter((order) => allowed.includes(order.status));
  }, [orders, filter]);

  const changeStatus = async (order: Order, status: OrderStatus) => {
    setBusyOrderId(order.id);
    try {
      await orderService.updateStatus(order.id, status);
      await fetchOrders();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Gagal mengubah status pesanan';
      Alert.alert('Gagal', Array.isArray(message) ? message.join('\n') : message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleAccept = (order: Order) => {
    showConfirm(
      'Terima Pesanan',
      `Terima pesanan dari ${order.customer?.name || 'pelanggan'} ini?`,
      () => changeStatus(order, 'accepted'),
      { confirmText: 'Terima', cancelText: 'Batal' },
    );
  };

  const handleCancel = (order: Order) => {
    showConfirm(
      'Batalkan Pesanan',
      'Stok produk akan dikembalikan setelah pesanan dibatalkan. Lanjutkan?',
      () => changeStatus(order, 'cancelled'),
      { confirmText: 'Batalkan', cancelText: 'Kembali', destructive: true },
    );
  };

  const handleContact = (order: Order) => {
    const phone = order.customer?.phone;
    if (!phone) {
      Alert.alert('Kontak tidak tersedia', 'Pelanggan belum mengisi nomor telepon.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Gagal', 'Tidak dapat membuka aplikasi telepon.'),
    );
  };

  const renderItem = ({ item }: { item: Order }) => {
    const chip = STATUS_CHIP[item.status];
    const firstItem = item.orderItems?.[0];
    const { time, date } = formatDate(item.createdAt);
    const isBusy = busyOrderId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.chip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.chipText, { color: chip.fg }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.productRow}>
          {firstItem?.product?.photoUrl ? (
            <Image
              source={{ uri: firstItem.product.photoUrl }}
              style={styles.productImage}
            />
          ) : (
            <View style={[styles.productImage, styles.productImagePh]}>
              <Text style={styles.productImagePhText}>🍽️</Text>
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {firstItem?.product?.name || 'Pesanan'}
            </Text>
            {!!firstItem && (
              <Text style={styles.productQty}>
                {firstItem.qty} x Rp{' '}
                {firstItem.priceAtPurchase.toLocaleString('id-ID')}
                {item.orderItems && item.orderItems.length > 1
                  ? ` + ${item.orderItems.length - 1} lainnya`
                  : ''}
              </Text>
            )}
          </View>

          <Text style={styles.totalAmount}>
            Rp {item.totalAmount.toLocaleString('id-ID')}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Text style={styles.metaLine} numberOfLines={1}>
              👤 {item.customer?.name || '-'}
            </Text>
            <Text style={styles.metaLine} numberOfLines={1}>
              📞 {item.customer?.phone || '-'}
            </Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLine}>{time} WIB</Text>
            <Text style={styles.metaLine}>{date}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {item.status === 'pending_payment' || item.status === 'paid' ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                activeOpacity={0.75}
                disabled={isBusy}
                onPress={() => handleCancel(item)}
              >
                <Text style={styles.dangerButtonText}>Batalkan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                activeOpacity={0.75}
                disabled={isBusy}
                onPress={() => handleAccept(item)}
              >
                <Text style={styles.primaryButtonText}>Terima Pesanan</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, styles.fullWidth]}
              activeOpacity={0.75}
              onPress={() => handleContact(item)}
            >
              <Text style={styles.primaryButtonText}>Hubungi Pelanggan</Text>
            </TouchableOpacity>
          )}
        </View>

        {isBusy && (
          <ActivityIndicator
            size="small"
            color={PRIMARY}
            style={styles.busyIndicator}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackIcon color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pesanan Masuk</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((item) => {
          const isActive = filter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              activeOpacity={0.75}
              onPress={() => setFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  isActive && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator color={PRIMARY} />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Belum ada pesanan</Text>
              <Text style={styles.emptyText}>
                Pesanan dengan status ini akan muncul di sini.
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
    flex: 1,
  },

  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: PAGE_BG,
  },
  filterPill: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterPillActive: {
    backgroundColor: MINT,
    borderColor: MINT,
  },
  filterText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  filterTextActive: {
    color: PRIMARY,
    fontWeight: '700',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  chip: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EEF1F2',
  },
  productImagePh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImagePhText: {
    fontSize: 20,
  },
  productInfo: {
    flex: 1,
    marginLeft: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 3,
  },
  productQty: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    marginLeft: 8,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
  },
  metaLeft: {
    flex: 1,
    gap: 4,
  },
  metaRight: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 12,
  },
  metaLine: {
    fontSize: 12,
    color: TEXT_MUTED,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: DANGER_BG,
  },
  dangerButtonText: {
    color: DANGER,
    fontSize: 13,
    fontWeight: '700',
  },

  busyIndicator: {
    marginTop: 10,
  },

  emptyBox: {
    paddingVertical: 48,
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
    paddingHorizontal: 32,
  },
});
