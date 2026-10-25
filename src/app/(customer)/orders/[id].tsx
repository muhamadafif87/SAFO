import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  Linking,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Path } from 'react-native-svg';
import { orderService } from '@/services/order.service';
import { paymentService } from '@/services/payment.service';
import type { Order, OrderStatus } from '@/types';

// ─── Status helpers ────────────────────────────────────────────────────────

const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'paid', label: 'Pesanan Disiapkan' },
  { key: 'ready_for_pickup', label: 'Pesanan Siap Diambil' },
  { key: 'completed', label: 'Selesai' },
];

const STATUS_ORDER_INDEX: Partial<Record<OrderStatus, number>> = {
  pending_payment: -1,
  paid: 0,
  ready: 0,
  ready_for_pickup: 1,
  completed: 2,
  cancelled: -1,
  expired: -1,
};

function getStatusIndex(status: OrderStatus): number {
  return STATUS_ORDER_INDEX[status] ?? -1;
}

const DYNAMIC_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Menunggu Pembayaran',
  paid: 'Pesanan Sedang Disiapkan',
  ready: 'Pesanan Sedang Disiapkan',
  ready_for_pickup: 'Pesanan Siap Diambil 🍿',
  completed: 'Pesanan Selesai ✅',
  cancelled: 'Pesanan Dibatalkan',
  expired: 'Pesanan Kedaluwarsa',
};

// Status-based text color
function getStatusColor(status: OrderStatus): string {
  if (status === 'paid' || status === 'ready' || status === 'ready_for_pickup') return '#059669';
  if (status === 'completed') return '#00615F';
  if (status === 'cancelled' || status === 'expired') return '#DC2626';
  return '#E2B640'; // pending_payment
}

function formatOrderDate(dateStr?: string | Date): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year} ${hours} : ${minutes}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CustomerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const orderRef = useRef<Order | null>(null);

  const fetchOrder = useCallback(async (isRefresh = false) => {
    try {
      if (!id) return;
      if (isRefresh) setRefreshing(true);
      const data = await orderService.getById(id);
      setOrder(data);
      orderRef.current = data;
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Gagal memuat pesanan');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, router]);

  const handlePayNow = async () => {
    if (!order) return;
    setIsPaying(true);
    try {
      const idempotencyKey = `qris-${order.id}-${Date.now()}`;
      const payment = await paymentService.createQrisPayment(order.id, idempotencyKey);
      router.push({
        pathname: '/(customer)/payment/qris',
        params: {
          paymentId: payment.paymentId,
          orderId: order.id,
          amount: String(payment.amount),
          qrString: payment.qrString || '',
          expiresAt: payment.expiresAt || '',
        },
      });
    } catch (err: any) {
      Alert.alert(
        'Gagal Memuat Pembayaran',
        err.response?.data?.message || 'Terjadi kesalahan saat memuat QRIS. Silakan coba lagi.',
      );
    } finally {
      setIsPaying(false);
    }
  };

  // Re-fetch whenever screen comes into focus (e.g. returning from QRIS screen)
  useFocusEffect(
    useCallback(() => {
      fetchOrder();
    }, [fetchOrder]),
  );

  useEffect(() => {
    // Auto-refresh interval while order is active:
    // Poll every 4 seconds if pending_payment (reconciles with Midtrans when paid),
    // or every 8 seconds if order is active (preparing / ready for pickup).
    const pollInterval = orderRef.current?.status === 'pending_payment' ? 4000 : 8000;
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
    }, pollInterval);

    return () => clearInterval(interval);
  }, [id, fetchOrder, order?.status]);

  const handleViewLocation = () => {
    const { latitude, longitude, address, businessName } = order?.mitra || {};
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(url).catch(() => {
        Alert.alert(
          businessName || 'Lokasi Warung',
          address || 'Alamat lokasi tidak dapat dibuka di peta'
        );
      });
    } else {
      Alert.alert(
        businessName || 'Lokasi Warung',
        address || 'Alamat lokasi warung belum tersedia'
      );
    }
  };

  if (loading && !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00615F" />
      </View>
    );
  }

  if (!order) return null;

  const currentStep = getStatusIndex(order.status);
  const items = order.items ?? order.orderItems ?? [];
  const pickupChars = order.pickupCode ? order.pickupCode.split('') : ['X', 'X', 'X', 'X'];
  const paymentTime = order.payments?.[0]?.paidAt || order.updatedAt || order.createdAt;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19l-7-7 7-7"
              stroke="#005B4F"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Pesanan</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrder(true)}
            colors={['#00615F']}
          />
        }
      >
        {/* ── Main Card (Wireframe Style) ── */}
        <View style={styles.card}>
          {/* Restaurant / Warung Name */}
          <Text numberOfLines={1} style={styles.restaurantName}>
            {order.mitra?.businessName || 'Nama Warung'}
          </Text>

          {/* Dynamic Status Text */}
          <Text style={[styles.dynamicStatus, { color: getStatusColor(order.status) }]}>
            {DYNAMIC_STATUS_LABEL[order.status] || 'Pesanan Sedang Disiapkan'}
          </Text>

          {/* ── Status Stepper (only show for active or completed orders) ── */}
          {order.status !== 'cancelled' && order.status !== 'expired' ? (
            <View style={styles.stepperContainer}>
              <View style={styles.stepperRow}>
                {STATUS_STEPS.map((step, idx) => {
                  const isPassed = currentStep >= idx;
                  const isActive = currentStep === idx;
                  return (
                    <React.Fragment key={step.key}>
                      <View style={styles.stepCircleWrapper}>
                        <View
                          style={[
                            styles.stepCircle,
                            (isActive || isPassed) && styles.stepCircleActive,
                          ]}
                        />
                      </View>
                      {idx < STATUS_STEPS.length - 1 && (
                        <View
                          style={[
                            styles.stepLine,
                            currentStep > idx && styles.stepLineActive,
                          ]}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Step Labels */}
              <View style={styles.stepLabelsRow}>
                {STATUS_STEPS.map((step) => (
                  <View key={step.key} style={styles.stepLabelItem}>
                    <Text style={styles.stepLabelText}>{step.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.failedBadgeWrapper}>
              <View style={styles.failedBadge}>
                <Text style={styles.failedBadgeText}>
                  {order.status === 'cancelled' ? '❌ Transaksi Dibatalkan' : '⏰ Batas Waktu Pembayaran Habis'}
                </Text>
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* ── Kode Pengambilan / Pending Payment / Inactive ── */}
          {order.status === 'pending_payment' ? (
            <View style={styles.pendingPaymentSection}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>⏳ Menunggu Pembayaran</Text>
              </View>
              <Text style={styles.pendingPaymentTitle}>Selesaikan Pembayaran</Text>
              <Text style={styles.pendingPaymentSubtitle}>
                Pesanan belum dibayar. Buka QRIS untuk membayar agar pesanan langsung disiapkan oleh mitra.
              </Text>
              <TouchableOpacity
                style={styles.payButton}
                activeOpacity={0.85}
                disabled={isPaying}
                onPress={handlePayNow}
              >
                {isPaying ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.payButtonText}>Bayar Sekarang (QRIS)</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : order.status === 'cancelled' || order.status === 'expired' ? (
            <View style={styles.inactiveSection}>
              <Text style={styles.inactiveTitle}>
                {order.status === 'cancelled' ? 'Pesanan Dibatalkan ❌' : 'Pesanan Kedaluwarsa ⏰'}
              </Text>
              <Text style={styles.inactiveSubtitle}>
                {order.status === 'cancelled'
                  ? 'Pembayaran tidak berhasil. Stok tetap tersedia — kamu bisa membuat pesanan baru.'
                  : 'Waktu pembayaran telah habis. Stok tetap tersedia — kamu bisa membuat pesanan baru.'}
              </Text>
              <TouchableOpacity
                style={styles.newOrderBtn}
                activeOpacity={0.85}
                onPress={() => router.replace('/(customer)')}
              >
                <Text style={styles.newOrderBtnText}>🛒 Buat Pesanan Baru</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickupSection}>
              <Text style={styles.pickupTitle}>Kode Pengambilan</Text>
              <Text style={styles.pickupSubtitle}>
                Tunjukkan QR atau kode 4 digit ini ke petugas toko
              </Text>

              {/* QR Code with Teal Border */}
              <View style={styles.qrWrapper}>
                <QRCode
                  value={`SAFO-PICKUP-${order.pickupCode || order.id.slice(0, 4)}`}
                  size={180}
                  color="#000000"
                  backgroundColor="#ffffff"
                />
              </View>

              {/* 4 Digit Code Boxes */}
              <View style={styles.pickupCodeRow}>
                {pickupChars.map((char, index) => (
                  <View key={index} style={styles.pickupBox}>
                    <Text style={styles.pickupBoxText}>{char}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* ── Order Item Summary ── */}
          <View style={styles.itemsSection}>
            {items.map((item) => {
              const itemQty = item.qty;
              const price = Number(item.priceAtPurchase || 0);
              const photo = item.product?.photoUrl;
              return (
                <View key={item.id} style={styles.productRow}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.productImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.productImage, styles.imagePlaceholder]}>
                      <Text style={styles.placeholderIcon}>🍱</Text>
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text numberOfLines={1} style={styles.productName}>
                      {item.product?.name || 'Produk Pesanan'}
                    </Text>
                    <Text style={styles.productQtyPrice}>
                      {itemQty} X Rp {price.toLocaleString('id-ID')}
                    </Text>
                  </View>
                  <Text style={styles.productPriceTotal}>
                    Rp {(itemQty * price).toLocaleString('id-ID')}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ── Metadata Info Table ── */}
          <View style={styles.metadataSection}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Waktu Pemesanan</Text>
              <Text style={styles.metaValue}>{formatOrderDate(order.createdAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Waktu Pembayaran</Text>
              <Text style={styles.metaValue}>{formatOrderDate(paymentTime)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>No. Pesanan</Text>
              <Text style={styles.metaValue}>
                #{order.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* ── Button Action ── */}
          <TouchableOpacity
            style={styles.locationButton}
            activeOpacity={0.85}
            onPress={handleViewLocation}
          >
            <Text style={styles.locationButtonText}>Lihat Lokasi Warung</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stylesheet ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  backButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins',
    color: '#000000',
    textAlign: 'left',
  },

  // Scroll Content
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  // Main Card
  card: {
    width: 342,
    maxWidth: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },

  // Restaurant & Status
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
    color: '#000000',
    textAlign: 'left',
    marginBottom: 4,
  },
  dynamicStatus: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
    color: '#E2B640',
    textAlign: 'left',
    marginBottom: 16,
  },

  // Stepper
  stepperContainer: {
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
  },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D9D9D9',
  },
  stepCircleActive: {
    borderWidth: 2.5,
    borderColor: '#00D078',
    shadowColor: '#00D078',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 5,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#D9D9D9',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#00D078',
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    width: '100%',
  },
  stepLabelItem: {
    width: 80,
    alignItems: 'center',
  },
  stepLabelText: {
    fontSize: 10,
    fontFamily: 'Poppins',
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 13,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
    width: '100%',
  },

  // Pickup Section
  pickupSection: {
    alignItems: 'center',
    width: '100%',
  },
  pickupTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  pickupSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Poppins',
    color: '#000000',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
    marginBottom: 16,
  },
  qrWrapper: {
    borderWidth: 4,
    borderColor: '#00615F',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pickupCodeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pickupBox: {
    width: 44,
    height: 44,
    backgroundColor: '#D9D9D9',
    borderWidth: 2,
    borderColor: '#00615F',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupBoxText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins',
    color: '#000000',
  },

  // Items Summary
  itemsSection: {
    width: '100%',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
  },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 20,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins',
    color: '#000000',
    marginBottom: 2,
  },
  productQtyPrice: {
    fontSize: 11,
    fontFamily: 'Poppins',
    color: '#555555',
  },
  productPriceTotal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins',
    color: '#000000',
    marginLeft: 8,
  },

  // Metadata Table
  metadataSection: {
    width: '100%',
    marginTop: 10,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: 'Poppins',
    color: '#333333',
  },
  metaValue: {
    fontSize: 11,
    fontFamily: 'Poppins',
    color: '#333333',
    textAlign: 'right',
  },

  // Action Button
  locationButton: {
    backgroundColor: '#00615F',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    width: '100%',
  },
  locationButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },

  // Pending Payment & Inactive Sections
  pendingPaymentSection: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#FFFBEA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F6E05E',
    marginVertical: 4,
  },
  pendingBadge: {
    backgroundColor: '#FEFCBF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B7791F',
    fontFamily: 'Poppins',
  },
  pendingPaymentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
    fontFamily: 'Poppins',
    marginBottom: 4,
    textAlign: 'center',
  },
  pendingPaymentSubtitle: {
    fontSize: 12,
    color: '#718096',
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  payButton: {
    backgroundColor: '#00615F',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#00615F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
  inactiveSection: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4,
  },
  inactiveTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A0AEC0',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  inactiveSubtitle: {
    fontSize: 12,
    color: '#A0AEC0',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  newOrderBtn: {
    backgroundColor: '#00615F',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 14,
  },
  newOrderBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
  failedBadgeWrapper: {
    marginVertical: 10,
    alignItems: 'center',
  },
  failedBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  failedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    fontFamily: 'Poppins',
  },
});
