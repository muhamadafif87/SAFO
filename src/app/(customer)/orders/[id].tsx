import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import QRCode from 'react-native-qrcode-svg';
import { SvgUri } from 'react-native-svg';
import { orderService } from '@/services/order.service';
import type { Order, OrderStatus } from '@/types';
import { Colors, FontWeight } from '@/constants/typography';

const PRIMARY = '#00615F';
const DIVIDER = '#EAEAEA';
const STATUS_GOLD = '#E2B640';

const STATUS_STEPS = [
  {
    label: 'Pesanan Disiapkan',
    icon: require('@/assets/images/figma/order-step-prepare.svg'),
  },
  {
    label: 'Pesanan Siap Diambil',
    icon: require('@/assets/images/figma/order-step-ready.svg'),
  },
  {
    label: 'Selesai',
    icon: require('@/assets/images/figma/order-step-complete.svg'),
  },
];

function getStatusIndex(status: OrderStatus): number {
  switch (status) {
    case 'paid':
    case 'processing':
    case 'ready':
      return 0;
    case 'ready_for_pickup':
      return 1;
    case 'completed':
      return 2;
    default:
      return -1;
  }
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending_payment':
      return 'Menunggu Pembayaran';
    case 'paid':
      return 'Menunggu Diproses';
    case 'processing':
    case 'ready':
      return 'Pesanan Sedang Disiapkan';
    case 'ready_for_pickup':
      return 'Pesanan Siap Diambil';
    case 'completed':
      return 'Selesai';
    case 'cancelled':
      return 'Pesanan Dibatalkan';
    case 'expired':
      return 'Pesanan Kedaluwarsa';
  }
}

function formatCurrency(value: number | string | null | undefined): string {
  return `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`;
}

function formatOrderDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ${hours} : ${minutes}`;
}

function FigmaStepIcon({ source }: { source: number }) {
  return (
    <SvgUri
      uri={Asset.fromModule(source).uri}
      width={26}
      height={26}
    />
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export default function CustomerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const orderRef = useRef<Order | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      if (!id) return;
      const data = await orderService.getById(id);
      setOrder(data);
      orderRef.current = data;
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Gagal memuat pesanan');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const initialFetch = setTimeout(() => {
      void fetchOrder();
    }, 0);

    const interval = setInterval(() => {
      const current = orderRef.current;
      if (
        current &&
        current.status !== 'completed' &&
        current.status !== 'cancelled' &&
        current.status !== 'expired'
      ) {
        fetchOrder();
      }
    }, 10000);

    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [id, fetchOrder]);

  if (loading && !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (!order) return null;

  const items = order.items ?? order.orderItems ?? [];
  const currentStep = getStatusIndex(order.status);
  const showPickup =
    order.status === 'paid' ||
    order.status === 'processing' ||
    order.status === 'ready' ||
    order.status === 'ready_for_pickup';
  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled' || order.status === 'expired';
  const extendedOrder = order as Order & {
    paidAt?: string;
    payment?: { paidAt?: string };
    payments?: { paidAt?: string }[];
  };
  const paymentTime =
    extendedOrder.payment?.paidAt ??
    extendedOrder.payments?.[0]?.paidAt ??
    extendedOrder.paidAt;

  const openLocation = () => {
    const locationQuery = [order.mitra?.businessName, order.mitra?.address]
      .filter(Boolean)
      .join(' ');
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery || 'warung')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lokasi tidak tersedia', 'Lokasi warung belum dapat dibuka.');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Kembali ke daftar pesanan"
          onPress={() => router.push('/(customer)/orders')}
          style={styles.headerButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Pesanan</Text>
        {!isCompleted && !isCancelled ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Perbarui status pesanan"
            onPress={fetchOrder}
            style={styles.headerButton}
          >
            <Text style={styles.refreshIcon}>↻</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.merchantHeader}>
            <Text numberOfLines={1} style={styles.merchantName}>
              {order.mitra?.businessName || 'Warung'}
            </Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Hubungi Warung"
                onPress={() => router.push(`/(customer)/chat/${order.id}`)}
                style={styles.chatButton}
              >
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isCancelled ? (
            <View style={styles.stepper}>
              {STATUS_STEPS.map((step, index) => {
                const isDone = currentStep >= index;
                const isActive = currentStep === index;
                return (
                  <View key={step.label} style={styles.stepItem}>
                    {index > 0 && (
                      <View
                        style={[
                          styles.stepLine,
                          currentStep >= index && styles.stepLineDone,
                        ]}
                      />
                    )}
                    <View
                      style={[
                        styles.stepCircle,
                        isDone && styles.stepCircleDone,
                        isActive && styles.stepCircleActive,
                      ]}
                    >
                      <FigmaStepIcon source={step.icon} />
                    </View>
                    <Text style={styles.stepLabel} numberOfLines={2}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledTitle}>
                {order.status === 'expired' ? 'Pesanan Kedaluwarsa' : 'Pesanan Dibatalkan'}
              </Text>
              <Text style={styles.cancelledSub}>
                {order.status === 'expired'
                  ? 'Pesanan tidak dibayar dalam batas waktu.'
                  : 'Pesanan ini telah dibatalkan.'}
              </Text>
            </View>
          )}

          {showPickup && (
            <>
              <View style={[styles.divider, styles.topDivider]} />
              <View style={styles.pickupSection}>
                <Text style={styles.pickupTitle}>Kode Pengambilan</Text>
                <Text style={styles.pickupHelper}>
                  Tunjukkan QR atau kode 4 digit ini ke petugas toko
                </Text>

                <View style={styles.qrFrame}>
                  <QRCode
                    value={`SAFO-PICKUP-${order.pickupCode}`}
                    size={228}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                  />
                </View>

                <View style={styles.pickupCodeRow}>
                  {[0, 1, 2, 3].map((index) => (
                    <View key={index} style={styles.pickupCodeChar}>
                      <Text style={styles.pickupCodeCharText}>
                        {order.pickupCode[index] ?? ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {isCompleted && (
            <View style={styles.completedNotice}>
              <Text style={styles.completedTitle}>Pesanan Selesai!</Text>
              <Text style={styles.completedSub}>
                Terima kasih sudah menyelamatkan makanan hari ini.
              </Text>
            </View>
          )}

          <View style={[styles.divider, styles.summaryDivider]} />

          <View style={styles.summary}>
            {items.map((item) => {
              const quantity = Number(item.qty ?? 1);
              const price = Number(item.priceAtPurchase ?? 0);
              return (
                <View key={item.id} style={styles.itemRow}>
                  <Image
                    source={
                      item.product?.photoUrl
                        ? { uri: item.product.photoUrl }
                        : require('@/assets/images/figma/order-food-thumbnail.png')
                    }
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.itemInfo}>
                    <Text numberOfLines={1} style={styles.itemName}>
                      {item.product?.name || 'Produk Surplus'}
                    </Text>
                    <Text numberOfLines={1} style={styles.itemQuantity}>
                      {quantity} X {formatCurrency(price)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>
                    {formatCurrency(quantity * price)}
                  </Text>
                </View>
              );
            })}

            {order.note ? (
              <View style={styles.noteRow}>
                <Text style={styles.metaLabel}>Catatan: </Text>
                <Text style={styles.noteValue}>{order.note}</Text>
              </View>
            ) : null}

            <View style={styles.orderMeta}>
              <MetaRow label="Waktu Pemesanan" value={formatOrderDate(order.createdAt)} />
              <MetaRow label="Waktu Pembayaran" value={formatOrderDate(paymentTime)} />
              <MetaRow label="Biaya Layanan" value={formatCurrency(order.platformFee)} />
              <MetaRow label="Total Pembayaran" value={formatCurrency(order.totalAmount)} />
              <MetaRow label="No. Pesanan" value={`#${order.id}`} />
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={openLocation}
              style={styles.locationButton}
              activeOpacity={0.85}
            >
              <Text style={styles.locationButtonText}>Lihat Lokasi Warung</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    height: 40,
    marginTop: 6,
    paddingHorizontal: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    width: 30,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { color: '#1F6223', fontSize: 32, lineHeight: 34, marginTop: -4 },
  refreshIcon: { color: PRIMARY, fontSize: 25, lineHeight: 30 },
  headerTitle: {
    flex: 1,
    marginLeft: 18,
    color: '#000000',
    fontSize: 20,
    fontWeight: FontWeight.bold,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 16,
  },
  card: {
    width: '100%',
    maxWidth: 342,
    minHeight: 739,
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  merchantHeader: { alignItems: 'flex-start' },
  merchantName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  statusRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  statusText: {
    flex: 1,
    color: STATUS_GOLD,
    fontSize: 14,
    fontWeight: FontWeight.semiBold,
  },
  chatButton: { paddingLeft: 8, paddingVertical: 2 },
  chatButtonText: { color: PRIMARY, fontSize: 10, fontWeight: FontWeight.semiBold },
  stepper: {
    width: 250,
    alignSelf: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  stepItem: { flex: 1, alignItems: 'center' },
  stepLine: {
    position: 'absolute',
    zIndex: 0,
    left: '-50%',
    top: 19,
    width: '100%',
    height: 3,
    backgroundColor: '#D9D4D2',
  },
  stepLineDone: { backgroundColor: PRIMARY },
  stepCircle: {
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9D9D9',
  },
  stepCircleDone: { backgroundColor: '#D9D9D9' },
  stepCircleActive: {
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  stepLabel: {
    width: 100,
    marginTop: 6,
    color: '#000000',
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },
  cancelledBanner: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelledTitle: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  cancelledSub: { color: Colors.neutral[600], fontSize: 12, textAlign: 'center' },
  divider: { height: 1, backgroundColor: DIVIDER },
  topDivider: { marginTop: 16 },
  pickupSection: { alignItems: 'center', paddingTop: 8 },
  pickupTitle: {
    color: '#000000',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  pickupHelper: {
    width: 230,
    marginTop: 4,
    color: '#000000',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  qrFrame: {
    width: 246,
    height: 246,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 9,
    borderColor: PRIMARY,
    backgroundColor: '#FFFFFF',
  },
  pickupCodeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pickupCodeChar: {
    width: 36,
    height: 38,
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 4,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupCodeCharText: {
    color: '#000000',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: FontWeight.bold,
  },
  completedNotice: { alignItems: 'center', paddingVertical: 14 },
  completedTitle: {
    color: Colors.primary[700],
    fontSize: 18,
    fontWeight: FontWeight.bold,
  },
  completedSub: {
    marginTop: 4,
    color: Colors.neutral[600],
    fontSize: 12,
    textAlign: 'center',
  },
  summaryDivider: { marginTop: 20 },
  summary: { paddingTop: 18 },
  itemRow: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    marginBottom: 2,
  },
  itemImage: { width: 46, height: 47, borderRadius: 4, backgroundColor: '#F1F1F1' },
  itemInfo: { flex: 1, minWidth: 0, marginLeft: 8 },
  itemName: { color: '#000000', fontSize: 13, fontWeight: FontWeight.semiBold },
  itemQuantity: { color: '#000000', fontSize: 10, lineHeight: 13 },
  itemTotal: {
    marginLeft: 6,
    color: '#000000',
    fontSize: 12,
    fontWeight: FontWeight.semiBold,
  },
  noteRow: { flexDirection: 'row', marginTop: 3 },
  noteValue: { flex: 1, color: Colors.neutral[700], fontSize: 9 },
  orderMeta: { marginTop: 3 },
  metaRow: {
    minHeight: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: { color: '#000000', fontSize: 9, lineHeight: 12 },
  metaValue: {
    maxWidth: '60%',
    color: '#000000',
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'right',
  },
  locationButton: {
    width: 288,
    maxWidth: '100%',
    height: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  locationButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: FontWeight.semiBold },
});
