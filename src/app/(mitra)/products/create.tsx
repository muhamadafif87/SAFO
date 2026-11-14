import { Colors } from '@/constants/typography';
import { productService } from '@/services/product.service';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const PRIMARY = '#0E7465';
const WHITE = '#ffffff';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const PAGE_BG = '#FFFFFF';
const INPUT_BG = '#F9FAFB';

const BackIcon = ({ color = TEXT_DARK }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
  </Svg>
);

const CameraIcon = ({ color = PRIMARY, size = 28 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
    <Path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z" />
  </Svg>
);

export default function MitraCreateProductScreen() {
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('');
  const [pickupStart, setPickupStart] = useState('');
  const [pickupEnd, setPickupEnd] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Gagal', 'Tidak dapat memilih foto dari galeri.');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Perhatian', 'Nama produk wajib diisi.');
      return;
    }
    const orig = parseInt(originalPrice.replace(/\D/g, ''), 10);
    const disc = parseInt(discountPrice.replace(/\D/g, ''), 10);
    const stk = parseInt(stock.replace(/\D/g, ''), 10);

    if (Number.isNaN(orig) || orig <= 0) {
      Alert.alert('Perhatian', 'Harga asli harus lebih besar dari 0.');
      return;
    }
    if (Number.isNaN(disc) || disc <= 0) {
      Alert.alert('Perhatian', 'Harga flash sale harus lebih besar dari 0.');
      return;
    }
    if (disc >= orig) {
      Alert.alert('Perhatian', 'Harga flash sale harus lebih murah dari harga asli.');
      return;
    }
    if (Number.isNaN(stk) || stk <= 0) {
      Alert.alert('Perhatian', 'Sisa stok minimal 1.');
      return;
    }

    setIsLoading(true);

    try {
      const now = new Date();
      let startTimeISO: string;
      let endTimeISO: string;

      // Jika jam diisi kedua-duanya, sesuaikan dengan jam yang dimasukkan
      if (pickupStart.trim() && pickupEnd.trim()) {
        const startParts = pickupStart.trim().split(':').map((p) => parseInt(p, 10));
        const endParts = pickupEnd.trim().split(':').map((p) => parseInt(p, 10));

        const startTime = new Date(now);
        startTime.setHours(startParts[0] || 0, startParts[1] || 0, 0, 0);

        const endTime = new Date(now);
        endTime.setHours(endParts[0] || 23, endParts[1] || 59, 59, 999);

        startTimeISO = startTime.toISOString();
        endTimeISO = endTime.toISOString();
      } else {
        // Jika tidak diisi (opsional), jadikan permanen (selalu aktif hingga 2099)
        startTimeISO = now.toISOString();
        endTimeISO = new Date('2099-12-31T23:59:59.999Z').toISOString();
      }

      // 1. Simpan data produk ke database (hanya kirim photoUrl jika sudah remote URL)
      const isRemoteUrl =
        Boolean(imageUri &&
        (imageUri.startsWith('http://') || imageUri.startsWith('https://')) &&
        !imageUri.startsWith('blob:') &&
        !imageUri.includes('localhost'));

      const created = await productService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        originalPrice: orig,
        discountPrice: disc,
        stock: stk,
        pickupWindowStart: startTimeISO,
        pickupWindowEnd: endTimeISO,
        photoUrl: isRemoteUrl ? imageUri : undefined,
      });

      // 2. Jika ada foto lokal yang dipilih, unggah filenya ke S3 Supabase
      if (imageUri && created?.id && !isRemoteUrl) {
        try {
          await productService.uploadPhoto(created.id, imageUri);
        } catch (uploadErr: any) {
          console.warn('[uploadPhoto] Gagal upload foto multipart ke Supabase:', uploadErr);
          const errDetail = uploadErr?.response?.data?.message || uploadErr?.message;
          Alert.alert(
            'Perhatian',
            `Produk berhasil disimpan, namun foto gagal diunggah: ${errDetail}`,
          );
        }
      }

      Alert.alert('Sukses', 'Produk flash sale berhasil ditambahkan ke database!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Gagal menambahkan produk. Silakan coba lagi.';
      Alert.alert('Gagal', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah Produk Flash Sale</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Area Pilih Foto dari File ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Foto Makanan</Text>
            <TouchableOpacity
              style={styles.photoPicker}
              activeOpacity={0.8}
              onPress={pickImage}
            >
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <View style={styles.changeBadge}>
                    <Text style={styles.changeBadgeText}>Ubah Foto</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <CameraIcon color={PRIMARY} size={32} />
                  <Text style={styles.photoPlaceholderText}>
                    Pilih Foto Makanan dari Galeri / File
                  </Text>
                  <Text style={styles.photoSubText}>Mendukung JPG, PNG (Maks 5MB)</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Nama Produk ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama Produk</Text>
            <TextInput
              style={styles.input}
              placeholder="Mis: Nasi Kuning Sisa Pagi"
              placeholderTextColor={TEXT_MUTED}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* ── Deskripsi (Opsional) ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Deskripsi (Opsional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Kondisi makanan, isian, dll"
              placeholderTextColor={TEXT_MUTED}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ── Harga Asli & Harga Flash Sale ── */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.col]}>
              <Text style={styles.label}>Harga Asli</Text>
              <TextInput
                style={styles.input}
                placeholder="Rp 0"
                placeholderTextColor={TEXT_MUTED}
                keyboardType="numeric"
                value={originalPrice}
                onChangeText={setOriginalPrice}
              />
            </View>

            <View style={[styles.fieldGroup, styles.col]}>
              <Text style={styles.label}>Harga Flash Sale</Text>
              <TextInput
                style={styles.input}
                placeholder="Rp 0"
                placeholderTextColor={TEXT_MUTED}
                keyboardType="numeric"
                value={discountPrice}
                onChangeText={setDiscountPrice}
              />
            </View>
          </View>

          {/* ── Sisa Stok Porsi ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Sisa Stok Porsi</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
          </View>

          {/* ── Ambil Dari (Jam) & Sampai (Jam) ── */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.col]}>
              <Text style={styles.label}>Ambil Dari (Jam) (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Mis: 19:00"
                placeholderTextColor={TEXT_MUTED}
                value={pickupStart}
                onChangeText={setPickupStart}
              />
            </View>

            <View style={[styles.fieldGroup, styles.col]}>
              <Text style={styles.label}>Sampai (Jam) (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Mis: 21:00"
                placeholderTextColor={TEXT_MUTED}
                value={pickupEnd}
                onChangeText={setPickupEnd}
              />
            </View>
          </View>

          <Text style={styles.optionalHelperText}>
            * Kosongkan jam jika produk flash sale ingin tersedia setiap saat (Permanen).
          </Text>

          {/* ── Tombol Batal & Simpan ── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isLoading && styles.btnDisabled]}
              activeOpacity={0.8}
              onPress={handleCreate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 8,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    fontSize: 14,
    color: TEXT_DARK,
  },
  textarea: {
    height: 90,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  optionalHelperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
  },

  /* Photo Picker */
  photoPicker: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  photoSubText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  imagePreviewContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeBadgeText: {
    color: WHITE,
    fontSize: 11.5,
    fontWeight: '600',
  },

  /* Action Buttons */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#2A9D8F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
});
