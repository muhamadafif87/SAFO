import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { orderService } from '@/services/order.service';
import type { Order, OrderStatus } from '@/types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';

// ─── Status helpers ────────────────────────────────────────────────────────

const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'paid', label: 'Pembayaran\nDikonfirmasi', icon: '✅' },
  { key: 'ready_for_pickup', label: 'Pesanan\nDisiapkan', icon: '👨‍🍳' },
  { key: 'completed', label: 'Pesanan\nSelesai', icon: '🎉' },
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

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  pending_payment: 'Menunggu Pembayaran',
  paid: 'Sedang Disiapkan',
  ready: 'Sedang Disiapkan',
  ready_for_pickup: 'Siap Diambil',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  expired: 'Kadaluarsa',
};

const STATUS_COLOR: Partial<Record<OrderStatus, string>> = {
  pending_payment: Colors.neutral[500],
  paid: Colors.primary[600],
  ready: Colors.primary[600],
  ready_for_pickup: Colors.secondary[600],
  completed: Colors.secondary[600],
  cancelled: '#EF4444',
  expired: Colors.neutral[400],
};

// ─── Component ─────────────────────────────────────────────────────────────

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

    // Auto-refresh setiap 10 detik jika pesanan belum selesai
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

  const currentStep = getStatusIndex(order.status);
  const showPickup = order.status === 'paid' || order.status === 'ready' || order.status === 'ready_for_pickup';
  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled' || order.status === 'expired';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(customer)/orders')} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Detail Pesanan</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Status Banner */}
        {!isCancelled && (
          <View style={styles.statusBanner}>
            <Text style={[styles.statusLabel, { color: STATUS_COLOR[order.status] || Colors.neutral[700] }]}>
              {STATUS_LABEL[order.status] || order.status}
            </Text>

            {/* Status Stepper */}
            <View style={styles.stepper}>
              {STATUS_STEPS.map((step, idx) => {
                const isDone = currentStep >= idx;
                const isActive = currentStep === idx;
                return (
                  <React.Fragment key={step.key}>
                    <View style={styles.stepItem}>
                      <View style={[
                        styles.stepCircle,
                        isDone && styles.stepCircleDone,
                        isActive && styles.stepCircleActive,
                      ]}>
                        <Text style={styles.stepIcon}>{step.icon}</Text>
                      </View>
                      <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>
                        {step.label}
                      </Text>
                    </View>
                    {idx < STATUS_STEPS.length - 1 && (
                      <View style={[styles.stepLine, currentStep > idx && styles.stepLineDone]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {/* Cancelled Banner */}
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledIcon}>❌</Text>
            <Text style={styles.cancelledTitle}>
              {order.status === 'expired' ? 'Pesanan Kadaluarsa' : 'Pesanan Dibatalkan'}
            </Text>
            <Text style={styles.cancelledSub}>
              {order.status === 'expired'
                ? 'Pesanan tidak dibayar dalam batas waktu.'
                : 'Pesanan ini telah dibatalkan.'}
            </Text>
          </View>
        )}

        {/* QR Code Pickup */}
        {showPickup && (
          <View style={styles.pickupCard}>
            <Text style={styles.pickupTitle}>Kode Pengambilan</Text>
            <Text style={styles.pickupHelper}>Tunjukkan QR atau kode 4 digit ini ke petugas toko</Text>

            <View style={styles.qrWrap}>
              <QRCode
                value={`SAFO-PICKUP-${order.pickupCode}`}
                size={180}
                color={Colors.primary[800]}
                backgroundColor="transparent"
              />
            </View>

            <View style={styles.pickupCodeRow}>
              {order.pickupCode.split('').map((char, i) => (
                <View key={i} style={styles.pickupCodeChar}>
                  <Text style={styles.pickupCodeCharText}>{char}</Text>
                </View>
              ))}
            </View>

            {order.status === 'ready_for_pickup' && (
              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>● Pesanan siap diambil!</Text>
              </View>
            )}
          </View>
        )}

        {/* Completed */}
        {isCompleted && (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Pesanan Selesai!</Text>
            <Text style={styles.successSub}>Terima kasih sudah menyelamatkan makanan hari ini.</Text>
          </View>
        )}

        {/* Toko Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toko</Text>
          <Text style={styles.mitraName}>{order.mitra?.businessName}</Text>
          <Text style={styles.mitraAddress}>{order.mitra?.address}</Text>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Belanja</Text>

          {(order.items || (order as any).orderItems || []).map((item: any) => {
            const itemQty = item.qty || item.quantity || 1;
            const price = Number(item.priceAtPurchase || 0);
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.product?.name || 'Produk Surplus'}</Text>
                  <Text style={styles.itemQty}>x{itemQty} · Rp {price.toLocaleString('id-ID')}</Text>
                </View>
                <Text style={styles.itemTotal}>
                  Rp {(itemQty * price).toLocaleString('id-ID')}
                </Text>
              </View>
            );
          })}

          {order.note ? (
            <View style={styles.noteRow}>
              <Text style={styles.noteLabel}>📝 Catatan: </Text>
              <Text style={styles.noteValue}>{order.note}</Text>
            </View>
          ) : null}

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Biaya Layanan</Text>
            <Text style={styles.feeValue}>Rp {Number(order.platformFee).toLocaleString('id-ID')}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalValue}>Rp {Number(order.totalAmount).toLocaleString('id-ID')}</Text>
          </View>
        </View>

        {/* Refresh button */}
        {!isCompleted && !isCancelled && (
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchOrder}>
            <Text style={styles.refreshBtnText}>↻ Perbarui Status</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: Spacing[8] }} />
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
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backBtn: { padding: Spacing[1] },
  backText: { fontSize: FontSize.md, color: Colors.primary[600], fontWeight: FontWeight.medium },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.neutral[900] },

  scroll: { padding: Spacing[4] },

  // Status banner & stepper
  statusBanner: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing[4],
  },
  stepper: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  stepCircleDone: { backgroundColor: Colors.primary[100] },
  stepCircleActive: { backgroundColor: Colors.primary[100], borderWidth: 2, borderColor: Colors.primary[400] },
  stepIcon: { fontSize: 20 },
  stepLabel: {
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
    textAlign: 'center',
    lineHeight: 16,
  },
  stepLabelDone: { color: Colors.primary[600], fontWeight: FontWeight.medium },
  stepLine: {
    height: 2,
    flex: 1,
    backgroundColor: Colors.neutral[200],
    marginBottom: Spacing[5],
  },
  stepLineDone: { backgroundColor: Colors.primary[300] },

  // Cancelled
  cancelledBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.xl,
    padding: Spacing[6],
    marginBottom: Spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelledIcon: { fontSize: 40, marginBottom: Spacing[2] },
  cancelledTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#DC2626', marginBottom: Spacing[1] },
  cancelledSub: { fontSize: FontSize.sm, color: '#EF4444', textAlign: 'center' },

  // QR Pickup card
  pickupCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[6],
    marginBottom: Spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary[200],
    shadowColor: Colors.primary[300],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  pickupTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary[800], marginBottom: Spacing[1] },
  pickupHelper: { fontSize: FontSize.sm, color: Colors.primary[600], textAlign: 'center', marginBottom: Spacing[5] },
  qrWrap: {
    backgroundColor: '#fff',
    padding: Spacing[4],
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pickupCodeRow: { flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[3] },
  pickupCodeChar: {
    width: 52,
    height: 60,
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary[400],
  },
  pickupCodeCharText: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: Colors.primary[700],
    letterSpacing: 0,
  },
  readyBadge: {
    backgroundColor: Colors.secondary[100],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
  },
  readyBadgeText: { fontSize: FontSize.sm, color: Colors.secondary[700], fontWeight: FontWeight.bold },

  // Success
  successCard: {
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[6],
    marginBottom: Spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary[200],
  },
  successEmoji: { fontSize: 48, marginBottom: Spacing[2] },
  successTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.secondary[700], marginBottom: Spacing[1] },
  successSub: { fontSize: FontSize.sm, color: Colors.secondary[600], textAlign: 'center' },

  // Sections
  section: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[900], marginBottom: Spacing[3] },

  mitraName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.neutral[800] },
  mitraAddress: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: Spacing[1] },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  itemName: { fontSize: FontSize.md, color: Colors.neutral[800] },
  itemQty: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: 2 },
  itemTotal: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.neutral[900] },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: Spacing[3] },
  noteLabel: { fontSize: FontSize.sm, color: Colors.neutral[500], fontWeight: FontWeight.medium },
  noteValue: { fontSize: FontSize.sm, color: Colors.neutral[700], flex: 1 },

  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing[3],
    marginTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  feeLabel: { fontSize: FontSize.sm, color: Colors.neutral[500] },
  feeValue: { fontSize: FontSize.sm, color: Colors.neutral[700] },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing[3],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  totalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary[700] },

  refreshBtn: {
    alignItems: 'center',
    paddingVertical: Spacing[3],
    marginBottom: Spacing[2],
  },
  refreshBtnText: { fontSize: FontSize.sm, color: Colors.primary[600], fontWeight: FontWeight.medium },
});
