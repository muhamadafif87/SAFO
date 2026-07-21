import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Mitra } from '@/types';

export default function AdminListMitraScreen() {
  const router = useRouter();
  const [mitras, setMitras] = useState<Mitra[]>([]);

  useEffect(() => {
    // Mock fetch all mitras
    setMitras([
      {
        id: 'm1',
        userId: 'u2',
        businessName: 'Toko Roti Makmur',
        category: 'Bakery',
        address: 'Jl. Merdeka',
        latitude: -6.2,
        longitude: 106.8,
        verificationStatus: 'approved'
      }
    ]);
  }, []);

  const renderItem = ({ item }: { item: Mitra }) => (
    <View style={styles.card}>
      <Text style={styles.businessName}>{item.businessName}</Text>
      <Text style={styles.category}>{item.category} • {item.verificationStatus.toUpperCase()}</Text>
      <Text style={styles.address}>{item.address}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="< Kembali" variant="ghost" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Daftar Mitra</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={mitras}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
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
    gap: Spacing[3],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
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
});
