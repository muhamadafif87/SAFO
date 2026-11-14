import { Colors } from '@/constants/typography';
import { orderService } from '@/services/order.service';
import { Order, OrderStatus } from '@/types';
import { showAlert, showConfirm } from '@/utils/alert';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const PRIMARY = '#0E7465'; // Teal brand
const MINT = '#D8EDE7';
const WHITE = '#ffffff';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#6B7280';
const BORDER = '#EAEEF0';
const PAGE_BG = '#F4F6F7';
const DANGER = '#C0392B';
const WARNING = '#B45309';

type FilterKey = 'all' | 'waiting' | 'accepted' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'waiting', label: 'Menunggu' },
  { key: 'accepted', label: 'Terima' },
  { key: 'cancelled', label: 'Batalkan' },
];

const FILTER_GROUPS: Record<FilterKey, OrderStatus[] | null> = {
  all: null,
  waiting: ['pending_payment', 'paid'],
  accepted: ['accepted', 'ready', 'ready_for_pickup', 'completed'],
  cancelled: ['cancelled', 'expired'],
};

const BackIcon = ({ color = TEXT_DARK }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
  </Svg>
);

const UserIcon = ({ color = TEXT_MUTED, size = 13 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
  </Svg>
);

const PhoneIcon = ({ color = TEXT_MUTED, size = 13 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z" />
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
      month: 'short',
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

  // Modal untuk verifikasi pickup
  const [pickupModalVisible, setPickupModalVisible] = useState(false);
  const [selectedOrderForPickup, setSelectedOrderForPickup] = useState<Order | null>(null);
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

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
      `Terima pesanan dari ${order.customer?.name || 'pelanggan'}? Stok produk akan diperbarui.`,
      () => changeStatus(order, 'accepted'),
      { confirmText: 'Terima Pesanan', cancelText: 'Batal' },
    );
  };

  const handleCancel = (order: Order) => {
    showConfirm(
      'Batalkan Pesanan',
      'Stok produk akan dikembalikan setelah pesanan dibatalkan. Lanjutkan batalkan pesanan?',
      () => changeStatus(order, 'cancelled'),
      { confirmText: 'Batalkan', cancelText: 'Kembali', destructive: true },
    );
  };

  const handleContact = (order: Order) => {
    const phone = order.customer?.phone;
    if (!phone) {
      Alert.alert('Kontak Tidak Tersedia', 'Pelanggan belum mencantumkan nomor telepon.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Gagal', 'Tidak dapat membuka aplikasi telepon.'),
    );
  };

  const openPickupModal = (order: Order) => {
    setSelectedOrderForPickup(order);
    setPickupCodeInput('');
    setPickupModalVisible(true);
  };

  const handleConfirmPickup = async () => {
    if (!selectedOrderForPickup) return;
    if (!pickupCodeInput.trim()) {
      Alert.alert('Perhatian', 'Masukkan kode pickup dari pelanggan.');
      return;
    }

    setIsVerifying(true);
    try {
      await orderService.verifyPickup(selectedOrderForPickup.id, pickupCodeInput.trim());
      setPickupModalVisible(false);
      Alert.alert('Berhasil', 'Pesanan telah berhasil diselesaikan dan diambil!');
      await fetchOrders();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Kode pickup salah atau tidak sesuai.';
      Alert.alert('Verifikasi Gagal', msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const firstItem = item.orderItems?.[0];
    const { time, date } = formatDate(item.createdAt);
    const isBusy = busyOrderId === item.id;

    // Status category
    const isWaiting = item.status === 'pending_payment' || item.status === 'paid';
    const isAccepted =
      item.status === 'accepted' ||
      item.status === 'ready' ||
      item.status === 'ready_for_pickup';
    const isCompleted = item.status === 'completed';
    const isCancelled = item.status === 'cancelled' || item.status === 'expired';

    // Status label and color matching wireframe
    let statusText = 'Menunggu Diproses';
    let statusColor = WARNING;

    if (isAccepted) {
      statusText = 'Terima';
      statusColor = PRIMARY;
    } else if (isCompleted) {
      statusText = 'Selesai';
      statusColor = PRIMARY;
    } else if (isCancelled) {
      statusText = 'Dibatalkan';
      statusColor = DANGER;
    }

    const orderCode = `#${(item.pickupCode || item.id.slice(0, 8)).toUpperCase()}`;

    return (
      <View style={styles.card}>
        {/* ── Konten Kartu yang bisa diklik untuk cek detail pesanan dulu ── */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push(`/(mitra)/orders/${item.id}`)}
        >
          {/* ── Card Header ── */}
          <View style={styles.cardHeader}>
            <Text style={styles.orderId}>{orderCode}</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>

          {/* ── Product Row ── */}
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
                {firstItem?.product?.name || 'Pesanan Makanan'}
              </Text>
              <Text style={styles.productQty}>
                {firstItem?.qty || 1} X Rp{' '}
                {(firstItem?.priceAtPurchase || item.totalAmount).toLocaleString('id-ID')}
                {item.orderItems && item.orderItems.length > 1
                  ? ` + ${item.orderItems.length - 1} lainnya`
                  : ''}
              </Text>
            </View>

            <Text style={styles.totalAmount}>
              Rp {item.totalAmount.toLocaleString('id-ID')}
            </Text>
          </View>

          {/* ── Customer & Time Meta ── */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <View style={styles.metaLineContainer}>
                <UserIcon size={13} color={TEXT_MUTED} />
                <Text style={styles.metaLineText} numberOfLines={1}>
                  {item.customer?.name || 'Pelanggan'}
                </Text>
              </View>
              <View style={styles.metaLineContainer}>
                <PhoneIcon size={13} color={TEXT_MUTED} />
                <Text style={styles.metaLineText} numberOfLines={1}>
                  {item.customer?.phone || '-'}
                </Text>
              </View>
            </View>

            <View style={styles.metaRight}>
              <Text style={styles.timeText}>{time} WIB</Text>
              <Text style={styles.dateText}>{date}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Action Buttons ── */}
        <View style={styles.actions}>
          {isWaiting ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                activeOpacity={0.8}
                disabled={isBusy}
                onPress={() => handleCancel(item)}
              >
                <Text style={styles.dangerButtonText}>Batalkan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                activeOpacity={0.8}
                disabled={isBusy}
                onPress={() => handleAccept(item)}
              >
                <Text style={styles.primaryButtonText}>Terima Pesanan</Text>
              </TouchableOpacity>
            </>
          ) : isAccepted ? (
            <View style={styles.actionCol}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, styles.fullWidth]}
                activeOpacity={0.8}
                onPress={() => handleContact(item)}
              >
                <Text style={styles.primaryButtonText}>Hubungi Pelanggan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, styles.fullWidth]}
                activeOpacity={0.8}
                onPress={() => openPickupModal(item)}
              >
                <Text style={styles.secondaryButtonText}>Selesaikan Pesanan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, styles.fullWidth]}
              activeOpacity={0.8}
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
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <BackIcon color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pesanan Masuk</Text>
      </View>

      {/* ── Filter Pills: Horizontal row, strictly fixed height ── */}
      <View style={styles.filterRow}>
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
      </View>

      {/* ── Orders List ── */}
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

      {/* ── Modal Verifikasi Pickup ── */}
      <Modal
        visible={pickupModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Verifikasi Pengambilan</Text>
            <Text style={styles.modalSubtitle}>
              Minta kode pickup dari pelanggan untuk menyelesaikan pesanan{' '}
              {selectedOrderForPickup ? `#${selectedOrderForPickup.id.slice(0, 8)}` : ''}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: A1B2 atau kode 4 digit"
              placeholderTextColor={TEXT_MUTED}
              value={pickupCodeInput}
              onChangeText={setPickupCodeInput}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setPickupModalVisible(false)}
                disabled={isVerifying}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={handleConfirmPickup}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color={WHITE} />
                ) : (
                  <Text style={styles.modalConfirmText}>Verifikasi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  /* Filter Tab Row */
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: PAGE_BG,
    alignItems: 'center',
  },
  filterPill: {
    flex: 1,
    backgroundColor: '#F0F3F4',
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: MINT,
  },
  filterText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4A5568',
  },
  filterTextActive: {
    color: PRIMARY,
    fontWeight: '700',
  },

  /* Order Cards */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 12.5,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#EEF1F2',
  },
  productImagePh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImagePhText: {
    fontSize: 22,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  productQty: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
    marginLeft: 8,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaLeft: {
    flex: 1,
    gap: 4,
  },
  metaLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLineText: {
    fontSize: 12,
    color: '#4B5563',
  },
  metaRight: {
    alignItems: 'flex-end',
    gap: 2,
    marginLeft: 12,
  },
  timeText: {
    fontSize: 11.5,
    color: TEXT_MUTED,
  },
  dateText: {
    fontSize: 11.5,
    color: TEXT_MUTED,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCol: {
    flex: 1,
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
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
    backgroundColor: DANGER,
  },
  dangerButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#BDE3DC',
  },
  secondaryButtonText: {
    color: PRIMARY,
    fontSize: 12.5,
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

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F3F5F6',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F0F3F4',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  modalConfirmBtn: {
    backgroundColor: PRIMARY,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: WHITE,
  },
});
