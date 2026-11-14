import { Colors } from '@/constants/typography';
import { orderService } from '@/services/order.service';
import { Order, OrderStatus } from '@/types';
import { showAlert, showConfirm } from '@/utils/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
const INPUT_BG = '#F3F5F6';
const DANGER = '#C0392B';
const DANGER_BG = '#FBE9E7';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Menunggu Bayar',
  paid: 'Menunggu Diproses',
  accepted: 'Diterima',
  ready: 'Diterima',
  ready_for_pickup: 'Diterima',
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
  cancelled: { bg: '#FDECEC', fg: DANGER },
  expired: { bg: '#EEF1F2', fg: TEXT_MUTED },
};

const BackIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
  </Svg>
);

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function MitraOrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Array.isArray(id) ? id[0] : id;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [busy, setBusy] = useState<'verify' | 'accept' | 'cancel' | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setOrder(await orderService.getMitraById(orderId));
    } catch {
      showAlert('Gagal', 'Pesanan tidak dapat dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const changeStatus = async (
    status: OrderStatus,
    which: 'accept' | 'cancel',
  ) => {
    if (!orderId) return;
    setBusy(which);
    try {
      await orderService.updateStatus(orderId, status);
      await load();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Gagal mengubah status pesanan';
      Alert.alert('Gagal', Array.isArray(message) ? message.join('\n') : message);
    } finally {
      setBusy(null);
    }
  };

  const handleAccept = () => {
    showConfirm(
      'Terima Pesanan',
      'Terima pesanan ini? Stok sudah terpotong saat checkout.',
      () => changeStatus('accepted', 'accept'),
      { confirmText: 'Terima', cancelText: 'Batal' },
    );
  };

  const handleCancel = () => {
    showConfirm(
      'Batalkan Pesanan',
      'Stok produk akan dikembalikan setelah pesanan dibatalkan. Lanjutkan?',
      () => changeStatus('cancelled', 'cancel'),
      { confirmText: 'Batalkan', cancelText: 'Kembali', destructive: true },
    );
  };

  const handleVerifyPickup = async () => {
    if (!orderId) return;
    if (!pickupCodeInput.trim()) {
      showAlert('Kode kosong', 'Masukkan kode pickup dari pelanggan.');
      return;
    }
    setBusy('verify');
    try {
      const updated = await orderService.verifyPickup(
        orderId,
        pickupCodeInput.trim(),
      );
      setOrder(updated);
      setPickupCodeInput('');
      Alert.alert('Selesai', 'Pesanan dinyatakan selesai.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Kode pickup salah';
      Alert.alert('Gagal', Array.isArray(message) ? message.join('\n') : message);
    } finally {
      setBusy(null);
    }
  };

  const handleContact = () => {
    const phone = order?.customer?.phone;
    if (!phone) {
      showAlert('Kontak tidak tersedia', 'Pelanggan belum mengisi nomor telepon.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      showAlert('Gagal', 'Tidak dapat membuka aplikasi telepon.'),
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <BackIcon color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Pesanan</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingBox}>
          <Text style={styles.emptyText}>Pesanan tidak ditemukan.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chip = STATUS_CHIP[order.status];
  const subtotal = order.totalAmount - order.platformFee;
  const isAwaiting = order.status === 'pending_payment' || order.status === 'paid';
  const isAccepted =
    order.status === 'accepted' ||
    order.status === 'ready' ||
    order.status === 'ready_for_pickup';
  const isTerminal =
    order.status === 'completed' ||
    order.status === 'cancelled' ||
    order.status === 'expired';

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
        <Text style={styles.headerTitle}>Detail Pesanan</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ── Ringkas status ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.orderId}>
                #{order.id.slice(0, 8).toUpperCase()}
              </Text>
              <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                <Text style={[styles.chipText, { color: chip.fg }]}>
                  {STATUS_LABEL[order.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>{formatDate(order.createdAt)}</Text>
            {!!order.note && <Text style={styles.note}>Catatan: {order.note}</Text>}
          </View>

          {/* ── Menu ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Menu</Text>
            {order.orderItems?.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                {item.product?.photoUrl ? (
                  <Image
                    source={{ uri: item.product.photoUrl }}
                    style={styles.itemImage}
                  />
                ) : (
                  <View style={[styles.itemImage, styles.itemImagePh]}>
                    <Text style={{ fontSize: 18 }}>🍽️</Text>
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product?.name || 'Menu'}
                  </Text>
                  <Text style={styles.itemQty}>
                    {item.qty} x Rp{' '}
                    {item.priceAtPurchase.toLocaleString('id-ID')}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  Rp {(item.qty * item.priceAtPurchase).toLocaleString('id-ID')}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Pelanggan ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pelanggan</Text>
            <Text style={styles.customerName}>
              {order.customer?.name || '-'}
            </Text>
            <Text style={styles.customerPhone}>
              {order.customer?.phone || 'Nomor telepon tidak tersedia'}
            </Text>
            <TouchableOpacity
              style={styles.contactButton}
              activeOpacity={0.75}
              onPress={handleContact}
            >
              <Text style={styles.contactButtonText}>Hubungi Pelanggan</Text>
            </TouchableOpacity>
          </View>

          {/* ── Ringkasan biaya ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ringkasan Biaya</Text>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Subtotal</Text>
              <Text style={styles.feeValue}>
                Rp {subtotal.toLocaleString('id-ID')}
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Biaya platform</Text>
              <Text style={styles.feeValue}>
                Rp {order.platformFee.toLocaleString('id-ID')}
              </Text>
            </View>
            <View style={[styles.feeRow, styles.feeRowTotal]}>
              <Text style={styles.feeTotalLabel}>Total</Text>
              <Text style={styles.feeTotalValue}>
                Rp {order.totalAmount.toLocaleString('id-ID')}
              </Text>
            </View>
          </View>

          {/* ── Aksi: menunggu ── */}
          {isAwaiting && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                activeOpacity={0.75}
                disabled={busy !== null}
                onPress={handleCancel}
              >
                <Text style={styles.dangerButtonText}>Batalkan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                activeOpacity={0.75}
                disabled={busy !== null}
                onPress={handleAccept}
              >
                <Text style={styles.primaryButtonText}>Terima Pesanan</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Aksi: sudah diterima → verifikasi pickup ── */}
          {isAccepted && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Verifikasi Pickup</Text>
                <Text style={styles.sectionDesc}>
                  Minta kode 4 karakter dari pelanggan, lalu selesaikan
                  pesanan.
                </Text>
                <TextInput
                  value={pickupCodeInput}
                  onChangeText={setPickupCodeInput}
                  placeholder="Contoh: A3B7"
                  placeholderTextColor={TEXT_MUTED}
                  autoCapitalize="characters"
                  maxLength={4}
                  style={styles.codeInput}
                />
                <TouchableOpacity
                  style={[
                    styles.fullButton,
                    busy === 'verify' && styles.disabledButton,
                  ]}
                  activeOpacity={0.8}
                  disabled={busy === 'verify'}
                  onPress={handleVerifyPickup}
                >
                  {busy === 'verify' ? (
                    <ActivityIndicator color={WHITE} />
                  ) : (
                    <Text style={styles.fullButtonText}>
                      Selesaikan Pesanan
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.fullButton,
                  styles.dangerOutlineButton,
                  busy !== null && styles.disabledButton,
                ]}
                activeOpacity={0.75}
                disabled={busy !== null}
                onPress={handleCancel}
              >
                <Text style={styles.dangerOutlineText}>Batalkan Pesanan</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Sudah selesai ── */}
          {isTerminal && (
            <View style={styles.doneNote}>
              <Text style={styles.doneNoteText}>
                {order.status === 'completed'
                  ? 'Pesanan ini sudah selesai.'
                  : order.status === 'cancelled'
                    ? 'Pesanan ini dibatalkan dan stok sudah dikembalikan.'
                    : 'Pesanan ini kedaluwarsa.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  flex: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WHITE,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 10,
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
  meta: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  note: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 6,
    fontStyle: 'italic',
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#EEF1F2',
  },
  itemImagePh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  itemTotal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT_DARK,
    marginLeft: 8,
  },

  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 3,
  },
  customerPhone: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 12,
  },
  contactButton: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  feeRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    marginTop: 4,
    paddingTop: 10,
  },
  feeLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  feeValue: {
    fontSize: 13,
    color: TEXT_DARK,
    fontWeight: '600',
  },
  feeTotalLabel: {
    fontSize: 14,
    color: TEXT_DARK,
    fontWeight: '700',
  },
  feeTotalValue: {
    fontSize: 15,
    color: PRIMARY,
    fontWeight: '800',
  },

  sectionDesc: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    marginBottom: 12,
    lineHeight: 18,
  },
  codeInput: {
    height: 48,
    borderRadius: 8,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 12,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: PRIMARY,
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 13.5,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: DANGER_BG,
  },
  dangerButtonText: {
    color: DANGER,
    fontSize: 13.5,
    fontWeight: '700',
  },

  fullButton: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  dangerOutlineButton: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: DANGER_BG,
  },
  dangerOutlineText: {
    color: DANGER,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },

  doneNote: {
    backgroundColor: MINT,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneNoteText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
    textAlign: 'center',
  },
});
