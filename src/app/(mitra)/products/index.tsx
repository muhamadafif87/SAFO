import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Product } from '@/types';
import { productService } from '@/services/product.service';

export default function MitraProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      const data = await productService.getMitraProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchProducts();
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/(mitra)/products/${item.id}/edit`)}
    >
      <View style={styles.cardContent}>
        <View style={styles.textContainer}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>Rp {item.discountPrice.toLocaleString('id-ID')} <Text style={styles.originalPrice}>Rp {item.originalPrice.toLocaleString('id-ID')}</Text></Text>
          <Text style={styles.productStock}>Stok: {item.stock} porsi</Text>
        </View>
        <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusSold]}>
          <Text style={styles.statusText}>{item.status === 'active' ? 'Aktif' : 'Habis'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Produk Flash Sale</Text>
        <Button 
          title="+ Tambah" 
          onPress={() => router.push('/(mitra)/products/create')}
          style={styles.addButton}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada produk flash sale.</Text>
              <Text style={styles.emptySubtext}>Mulai posting produk surplusmu hari ini!</Text>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  addButton: {
    height: 36,
    paddingHorizontal: Spacing[3],
  },
  listContainer: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
  },
  productName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  productPrice: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.secondary[600],
    marginBottom: Spacing[1],
  },
  originalPrice: {
    fontSize: FontSize.sm,
    color: Colors.neutral[400],
    textDecorationLine: 'line-through',
    fontWeight: FontWeight.regular,
  },
  productStock: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
  },
  statusBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  statusActive: {
    backgroundColor: Colors.primary[100],
  },
  statusSold: {
    backgroundColor: Colors.neutral[200],
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.neutral[800],
  },
  emptyContainer: {
    padding: Spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
});
