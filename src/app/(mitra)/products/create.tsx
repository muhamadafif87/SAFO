import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/typography';
import { productService } from '@/services/product.service';

export default function MitraCreateProductScreen() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('');
  const [pickupStart, setPickupStart] = useState(''); // simplified for MVP, ideally time picker
  const [pickupEnd, setPickupEnd] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !originalPrice || !discountPrice || !stock || !pickupStart || !pickupEnd) {
      Alert.alert('Error', 'Harap isi semua field wajib.');
      return;
    }

    setIsLoading(true);
    try {
      await productService.create({
        name, description, 
        originalPrice: parseInt(originalPrice),
        discountPrice: parseInt(discountPrice),
        stock: parseInt(stock),
        pickupWindowStart: new Date().toISOString(), // Mock ISO strings for MVP
        pickupWindowEnd: new Date(Date.now() + 3600000).toISOString(),
      });
      
      Alert.alert('Sukses', 'Produk berhasil ditambahkan', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Gagal menambahkan produk');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tambah Produk Flash Sale</Text>

      <View style={styles.form}>
        <Input
          label="Nama Produk"
          placeholder="Mis: Nasi Kuning Sisa Pagi"
          value={name}
          onChangeText={setName}
        />
        <Input
          label="Deskripsi (Opsional)"
          placeholder="Kondisi makanan, isian, dll"
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
              placeholder="Rp 0"
              keyboardType="numeric"
              value={originalPrice}
              onChangeText={setOriginalPrice}
            />
          </View>
          <View style={styles.space} />
          <View style={styles.flex1}>
            <Input
              label="Harga Flash Sale"
              placeholder="Rp 0"
              keyboardType="numeric"
              value={discountPrice}
              onChangeText={setDiscountPrice}
            />
          </View>
        </View>

        <Input
          label="Sisa Stok Porsi"
          placeholder="0"
          keyboardType="numeric"
          value={stock}
          onChangeText={setStock}
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Input
              label="Ambil Dari (Jam)"
              placeholder="Mis: 19:00"
              value={pickupStart}
              onChangeText={setPickupStart}
            />
          </View>
          <View style={styles.space} />
          <View style={styles.flex1}>
            <Input
              label="Sampai (Jam)"
              placeholder="Mis: 21:00"
              value={pickupEnd}
              onChangeText={setPickupEnd}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Batal"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.flex1}
          />
          <Button
            title="Simpan"
            onPress={handleCreate}
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
