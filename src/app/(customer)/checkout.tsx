import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore, PLATFORM_FEE } from '@/stores/cart.store';
import { orderService } from '@/services/order.service';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import type { PaymentMethod } from '@/types';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string; icon: string }[] = [
  { id: 'ewallet', label: 'E-Wallet', desc: 'GoPay, OVO, DANA, ShopeePay', icon: '📱' },
  { id: 'bank_transfer', label: 'Transfer Bank', desc: 'BCA, Mandiri, BNI, BRI', icon: '🏦' },
  { id: 'qris', label: 'QRIS', desc: 'Scan QR dari semua aplikasi', icon: '📷' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, mitraName, getTotalPrice, clearCart } = useCartStore();

  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [isLoading, setIsLoading] = useState(false);

  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.product.discountPrice) * i.qty,
    0
  );
  const total = subtotal + PLATFORM_FEE;

  const handleOrder = async () => {
    if (items.length === 0) return;

    setIsLoading(true);
    try {
      // 1. Create order
      const order = await orderService.create({
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        note: note.trim() || undefined,
        paymentMethod,
      });

      // 2. Simulate payment gateway callback (mock)
      await orderService.payMock(order.id);

      // 3. Clear cart
      clearCart();

      // 4. Navigate to order detail
      Alert.alert(
        'Pesanan Berhasil! 🎉',
        `Pesanan kamu sudah dikonfirmasi.\nTunjukkan kode pickup ke mitra saat mengambil.`,
        [
          {
            text: 'Lihat Pesanan',
            onPress: () => router.replace(`/(customer)/orders/${order.id}`),
          },
        ],
        { cancelable: false }
      );
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.message || 'Gagal membuat pesanan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Cart kamu kosong</Text>
          <Button title="Cari Makanan" onPress={() => router.back()} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Pickup Location */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>📍</Text>
            <Text style={styles.sectionTitle}>Lokasi Pengambilan</Text>
          </View>
          <View style={styles.locationCard}>
            <Text style={styles.mitraName}>{mitraName || 'Nama Mitra'}</Text>
            <Text style={styles.pickupNote}>Ambil langsung di toko (self-pickup)</Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🛒</Text>
            <Text style={styles.sectionTitle}>Ringkasan Pesanan</Text>
          </View>
          {items.map((item) => (
            <View key={item.product.id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                <Text style={styles.itemPrice}>
                  Rp {Number(item.product.discountPrice).toLocaleString('id-ID')} / pcs
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemQtyLabel}>x{item.qty}</Text>
                <Text style={styles.itemSubtotal}>
                  Rp {(Number(item.product.discountPrice) * item.qty).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addMoreBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.addMoreText}>+ Tambah dari toko ini</Text>
          </TouchableOpacity>
        </View>

        {/* Catatan Pesanan */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>📝</Text>
            <Text style={styles.sectionTitle}>Catatan Pesanan</Text>
            <Text style={styles.optionalTag}>(opsional)</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Contoh: tanpa bawang, pisahkan saus..."
            placeholderTextColor={Colors.neutral[400]}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.charCount}>{note.length}/200</Text>
        </View>

        {/* Metode Pembayaran */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>💳</Text>
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          </View>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentOption,
                paymentMethod === method.id && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod(method.id)}
              activeOpacity={0.7}
            >
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <View>
                  <Text style={[
                    styles.paymentLabel,
                    paymentMethod === method.id && styles.paymentLabelSelected,
                  ]}>
                    {method.label}
                  </Text>
                  <Text style={styles.paymentDesc}>{method.desc}</Text>
                </View>
              </View>
              <View style={[
                styles.radio,
                paymentMethod === method.id && styles.radioSelected,
              ]}>
                {paymentMethod === method.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.summaryRows}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>Rp {subtotal.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Layanan</Text>
            <Text style={styles.summaryValue}>Rp {PLATFORM_FEE.toLocaleString('id-ID')}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalValue}>Rp {total.toLocaleString('id-ID')}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.orderBtn, isLoading && styles.orderBtnDisabled]}
          onPress={handleOrder}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.orderBtnText}>
              Buat Pesanan · Rp {total.toLocaleString('id-ID')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },

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
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.neutral[900] },

  scroll: { paddingHorizontal: Spacing[4], paddingTop: Spacing[4] },

  section: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
    gap: Spacing[2],
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  optionalTag: { fontSize: FontSize.xs, color: Colors.neutral[400], marginLeft: Spacing[1] },

  locationCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary[400],
  },
  mitraName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary[900] },
  pickupNote: { fontSize: FontSize.sm, color: Colors.primary[600], marginTop: 4 },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  itemLeft: { flex: 1, marginRight: Spacing[3] },
  itemName: { fontSize: FontSize.md, color: Colors.neutral[800], fontWeight: FontWeight.medium },
  itemPrice: { fontSize: FontSize.sm, color: Colors.neutral[500], marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemQtyLabel: { fontSize: FontSize.sm, color: Colors.neutral[500], fontWeight: FontWeight.medium },
  itemSubtotal: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.neutral[900], marginTop: 2 },

  addMoreBtn: {
    marginTop: Spacing[3],
    paddingVertical: Spacing[2],
    alignItems: 'center',
  },
  addMoreText: { fontSize: FontSize.sm, color: Colors.primary[600], fontWeight: FontWeight.medium },

  noteInput: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    fontSize: FontSize.md,
    color: Colors.neutral[800],
    backgroundColor: Colors.neutral[50],
    textAlignVertical: 'top',
    minHeight: 80,
  },
  charCount: { fontSize: FontSize.xs, color: Colors.neutral[400], textAlign: 'right', marginTop: Spacing[1] },

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    marginBottom: Spacing[3],
    backgroundColor: Colors.neutral[0],
  },
  paymentOptionSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  paymentIcon: { fontSize: 24 },
  paymentLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.neutral[800] },
  paymentLabelSelected: { color: Colors.primary[700] },
  paymentDesc: { fontSize: FontSize.xs, color: Colors.neutral[500], marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary[500] },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary[500] },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[6],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  summaryRows: { marginBottom: Spacing[4] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[2] },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.neutral[500] },
  summaryValue: { fontSize: FontSize.sm, color: Colors.neutral[700] },
  totalRow: { paddingTop: Spacing[2], borderTopWidth: 1, borderTopColor: Colors.neutral[200], marginTop: Spacing[2] },
  totalLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.neutral[900] },
  totalValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary[700] },

  orderBtn: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: 'center',
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  orderBtnDisabled: { opacity: 0.7 },
  orderBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
  emptyIcon: { fontSize: 64 },
  emptyText: { fontSize: FontSize.lg, color: Colors.neutral[500] },
});
