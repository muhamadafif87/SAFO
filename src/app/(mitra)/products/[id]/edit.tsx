import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/typography';
// import { productService } from '@/services/product.service';

export default function MitraEditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [name, setName] = useState('Roti Sisa Hari Ini');
  const [description, setDescription] = useState('Aneka roti manis dan gurih, masih sangat layak konsumsi.');
  const [originalPrice, setOriginalPrice] = useState('50000');
  const [discountPrice, setDiscountPrice] = useState('20000');
  const [stock, setStock] = useState('5');
  const [pickupStart, setPickupStart] = useState('19:00');
  const [pickupEnd, setPickupEnd] = useState('21:00');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // In real app, fetch product details by id
  }, [id]);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      // await productService.update(id!, { ... });
      Alert.alert('Sukses', 'Produk berhasil diupdate', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Gagal update produk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Produk',
      'Apakah Anda yakin ingin menghapus produk ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // await productService.delete(id!);
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Gagal hapus produk');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit Produk</Text>

      <View style={styles.form}>
        <Input
          label="Nama Produk"
          value={name}
          onChangeText={setName}
        />
        <Input
          label="Deskripsi (Opsional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={{ height: 80 }}
        />
        
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Input
              label="Harga Asli"
              keyboardType="numeric"
              value={originalPrice}
              onChangeText={setOriginalPrice}
            />
          </View>
          <View style={styles.space} />
          <View style={styles.flex1}>
            <Input
              label="Harga Flash Sale"
              keyboardType="numeric"
              value={discountPrice}
              onChangeText={setDiscountPrice}
            />
          </View>
        </View>

        <Input
          label="Sisa Stok Porsi"
          keyboardType="numeric"
          value={stock}
          onChangeText={setStock}
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Input
              label="Ambil Dari (Jam)"
              value={pickupStart}
              onChangeText={setPickupStart}
            />
          </View>
          <View style={styles.space} />
          <View style={styles.flex1}>
            <Input
              label="Sampai (Jam)"
              value={pickupEnd}
              onChangeText={setPickupEnd}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Hapus"
            variant="danger"
            onPress={handleDelete}
            isLoading={isDeleting}
            style={styles.flex1}
          />
          <Button
            title="Simpan"
            onPress={handleUpdate}
            isLoading={isLoading}
            style={styles.flex1}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
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
  form: {
    gap: Spacing[2],
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  space: {
    width: Spacing[4],
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing[6],
    gap: Spacing[4],
  },
});
