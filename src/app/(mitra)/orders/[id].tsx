import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import { orderService } from '@/services/order.service';
import { Order } from '@/types';

export default function MitraOrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    orderService.getById(id as string)
      .then(setOrder)
      .catch(() => Alert.alert('Error', 'Gagal memuat pesanan'));
  }, [id]);

  const handleUpdateStatus = async (status: 'ready' | 'completed') => {
    setIsUpdating(true);
    try {
      const updated = await orderService.updateStatus(id as string, status as any);
      setOrder(updated);
      Alert.alert('Sukses', `Status pesanan diubah menjadi ${status}`);
    } catch (err) {
      Alert.alert('Error', 'Gagal update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyPickup = async () => {
    if (!pickupCodeInput) {
      Alert.alert('Error', 'Masukkan kode pickup');
      return;
    }

    setIsVerifying(true);
    try {
      const updated = await orderService.verifyPickup(id as string, pickupCodeInput);
      setOrder(updated);
      Alert.alert('Verifikasi Berhasil', 'Pesanan selesai diserahkan ke pelanggan.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Gagal verifikasi kode');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!order) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Detail Pesanan</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>ID Pesanan</Text>
        <Text style={styles.value}>{order.id}</Text>

        <Text style={[styles.label, { marginTop: Spacing[4] }]}>Status</Text>
        <Text style={styles.value}>{order.status.toUpperCase()}</Text>

        <Text style={[styles.label, { marginTop: Spacing[4] }]}>Item</Text>
        {order.orderItems?.map(item => (
          <Text key={item.id} style={styles.value}>
            {item.quantity}x {item.product?.name}
          </Text>
        ))}

        <Text style={[styles.label, { marginTop: Spacing[4] }]}>Total</Text>
        <Text style={styles.value}>Rp {order.totalAmount.toLocaleString('id-ID')}</Text>
      </View>

      {order.status === 'paid' && (
        <Button
          title="Tandai Siap Diambil"
          onPress={() => handleUpdateStatus('ready')}
          isLoading={isUpdating}
          style={styles.actionButton}
        />
      )}

      {(order.status === 'paid' || order.status === 'ready') && (
        <View style={styles.verifySection}>
          <Text style={styles.sectionTitle}>Verifikasi Pickup</Text>
          <Text style={styles.sectionDesc}>
            Minta kode 4-digit dari aplikasi customer atau scan QR code mereka.
          </Text>
          <Input
            placeholder="Masukkan 4 digit kode"
            value={pickupCodeInput}
            onChangeText={setPickupCodeInput}
            autoCapitalize="characters"
            maxLength={4}
          />
          <Button
            title="Verifikasi Kode"
            onPress={handleVerifyPickup}
            isLoading={isVerifying}
          />
          {/* Ideal: Add QR scanner button here using expo-camera */}
        </View>
      )}

      <Button
        title="Kembali"
        variant="ghost"
        onPress={() => router.back()}
        style={{ marginTop: Spacing[6] }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  content: {
    padding: Spacing[4],
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
    marginBottom: Spacing[6],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: Spacing[6],
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    marginBottom: Spacing[1],
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.neutral[900],
  },
  actionButton: {
    marginBottom: Spacing[6],
  },
  verifySection: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary[700],
    marginBottom: Spacing[2],
  },
  sectionDesc: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[4],
  },
});
