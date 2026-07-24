import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { productService } from '@/services/product.service';
import type { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import * as Location from 'expo-location';

export default function CustomerHome() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        let lat = -6.200000;
        let lng = 106.816666;
        
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
        
        setLocation({ lat, lng });
        
        const data = await productService.getNearby({ lat, lng, radius: 10 });
        setProducts(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        console.warn('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(customer)/products/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.mitraName}>{item.mitra?.businessName || 'Mitra'}</Text>
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.originalPrice}>Rp {Number(item.originalPrice).toLocaleString('id-ID')}</Text>
          <Text style={styles.discountPrice}>Rp {Number(item.discountPrice).toLocaleString('id-ID')}</Text>
        </View>
        <View style={styles.stockBadge}>
          <Text style={styles.stockText}>Sisa {item.stock}</Text>
        </View>
      </View>
      <Text style={styles.timeText}>
        Pickup: {new Date(item.pickupWindowStart).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} - {new Date(item.pickupWindowEnd).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo, {user?.email?.split('@')[0]}</Text>
          <Text style={styles.subtitle}>Selamatkan makanan hari ini!</Text>
        </View>
        <Button title="Keluar" variant="ghost" onPress={clearAuth} />
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Terdekat di sekitarmu</Text>
          <Button title="Pesanan Saya" variant="primary" onPress={() => router.push('/(customer)/orders')} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary[500]} style={{ marginTop: 40 }} />
        ) : products.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada makanan surplus di sekitarmu.</Text>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  greeting: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[800],
  },
  list: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[6],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: Spacing[3],
  },
  productName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  mitraName: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing[3],
  },
  originalPrice: {
    fontSize: FontSize.sm,
    color: Colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
  stockBadge: {
    backgroundColor: Colors.secondary[100],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  stockText: {
    color: Colors.secondary[700],
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  timeText: {
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    backgroundColor: Colors.neutral[100],
    padding: Spacing[2],
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing[10],
    color: Colors.neutral[500],
  },
});
