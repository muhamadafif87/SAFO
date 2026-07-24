import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { MitraProfile } from '@/types';
import { adminService } from '@/services/admin.service';

export default function AdminPendingMitraScreen() {
  const router = useRouter();
  const [pendingMitras, setPendingMitras] = useState<MitraProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingMitras();
  }, []);

  const fetchPendingMitras = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getPendingMitra();
      setPendingMitras(data);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat data mitra pending');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = (id: string, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'Setujui Mitra' : 'Tolak Mitra',
      `Yakin ingin ${action === 'approve' ? 'menyetujui' : 'menolak'} mitra ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Ya', 
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await adminService.verifyMitra(id, action);
              setPendingMitras(prev => prev.filter(m => m.id !== id));
              Alert.alert('Sukses', `Mitra berhasil di-${action === 'approve' ? 'setujui' : 'tolak'}`);
            } catch (error) {
              Alert.alert('Error', 'Gagal memproses verifikasi');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: MitraProfile }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.businessName}>{item.businessName}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.address}>{item.address}</Text>
      </View>
      <View style={styles.cardActions}>
        <Button 
          title="Setujui" 
          onPress={() => handleVerify(item.id, 'approve')} 
          style={{ flex: 1 }}
        />
        <Button 
          title="Tolak" 
          variant="danger"
          onPress={() => handleVerify(item.id, 'reject')} 
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="< Kembali" variant="ghost" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Review Mitra Pending</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={pendingMitras}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>Tidak ada mitra yang perlu direview saat ini.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  listContainer: {
    padding: Spacing[4],
    gap: Spacing[4],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  cardInfo: {
    marginBottom: Spacing[4],
  },
  businessName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing[1],
  },
  category: {
    fontSize: FontSize.sm,
    color: Colors.primary[600],
    marginBottom: Spacing[1],
  },
  address: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.neutral[500],
    marginTop: Spacing[10],
  },
});
