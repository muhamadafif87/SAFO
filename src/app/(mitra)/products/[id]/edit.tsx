import { Colors } from '@/constants/typography';
import { productService } from '@/services/product.service';
import { useAuthStore } from '@/stores/auth.store';
import { showAlert, showConfirm } from '@/utils/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
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

const PRIMARY = Colors.primary[600];
const WHITE = '#ffffff';
const TEXT_DARK = Colors.neutral[900];
const TEXT_MUTED = Colors.neutral[500];
const BORDER = '#EAEEF0';
const PAGE_BG = '#F4F6F7';
const INPUT_BG = '#F3F5F6';
const ERROR_BG = '#FBE9E7';
const ERROR_TEXT = '#C0392B';

const BackIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
  </Svg>
);

const CameraIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M6.2 2.5A.5.5 0 0 1 6.66 2h2.68a.5.5 0 0 1 .46.3l.66 1.46 1.53.51A2.5 2.5 0 0 1 14 6.74v4.76a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5V6.74a2.5 2.5 0 0 1 1.66-2.35l1.4-.54.66-1.45a.5.5 0 0 1 .48-.3zM8 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
  </Svg>
);

const PencilIcon = ({ color, size = 14 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.85.65a1.5 1.5 0 0 1 2.12 0l1.38 1.38a1.5 1.5 0 0 1 0 2.12L5.5 14H2.5a.5.5 0 0 1-.5-.5V10.5L11.85.65z" />
  </Svg>
);

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export default function MitraEditProductScreen() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const productId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { mitra } = useAuthStore();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stockInput, setStockInput] = useState('');
  /** Stok yang benar-benar tersimpan di database — diperbarui setelah simpan. */
  const [savedStock, setSavedStock] = useState(0);
  const [pickupStart, setPickupStart] = useState('19:00');
  const [pickupEnd, setPickupEnd] = useState('21:00');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProduct = useCallback(async (id: string) => {
    try {
      const product = await productService.getById(id);
      setName(product.name);
      setDescription(product.description || '');
      setOriginalPrice(String(product.originalPrice));
      setDiscountPrice(String(product.discountPrice));
      setStockInput(String(product.stock));
      setSavedStock(product.stock);
      setPhotoUrl(product.photoUrl || null);
      setPickupStart('19:00');
      setPickupEnd('21:00');
    } catch {
      showAlert('Gagal', 'Tidak dapat memuat detail produk.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (productId) void loadProduct(productId);
  }, [loadProduct, productId]);

  const pickPhoto = async () => {
    if (!productId) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setIsUploading(true);
      const { photoUrl: uploaded } = await productService.uploadPhoto(
        productId,
        result.assets[0].uri,
      );
      setPhotoUrl(uploaded);
    } catch {
      showAlert('Gagal', 'Foto tidak dapat diunggah. Coba lagi.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!productId) return;

    const stock = Number(stockInput);
    const original = Number(originalPrice);
    const discount = Number(discountPrice);

    if (!name.trim()) {
      showAlert('Nama menu kosong', 'Isi nama menu terlebih dahulu.');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      showAlert('Stok tidak valid', 'Stok harus berupa angka 0 atau lebih.');
      return;
    }
    if (!Number.isFinite(original) || original < 0) {
      showAlert('Harga tidak valid', 'Harga awal harus berupa angka.');
      return;
    }
    if (!Number.isFinite(discount) || discount < 0) {
      showAlert('Harga tidak valid', 'Harga diskon harus berupa angka.');
      return;
    }

    setIsSaving(true);
    try {
      await productService.update(productId, {
        name: name.trim(),
        description: description.trim(),
        originalPrice: Math.round(original),
        discountPrice: Math.round(discount),
        stock: Math.round(stock),
      });
      // Backend sudah menyimpan — tampilkan nilai terbaru di "Stok saat ini".
      setSavedStock(Math.round(stock));
      showAlert('Tersimpan', 'Perubahan menu berhasil dikirim ke database.');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Gagal menyimpan menu';
      Alert.alert('Gagal', Array.isArray(message) ? message.join('\n') : message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!productId) return;
    showConfirm(
      'Hapus Menu',
      'Apakah Anda yakin ingin menghapus menu ini?',
      async () => {
        setIsDeleting(true);
        try {
          await productService.delete(productId);
          router.back();
        } catch {
          showAlert('Gagal', 'Menu tidak dapat dihapus.');
        } finally {
          setIsDeleting(false);
        }
      },
      { confirmText: 'Hapus', cancelText: 'Batal', destructive: true },
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  const numericOriginal = Number(originalPrice);
  const numericDiscount = Number(discountPrice);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackIcon color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Menu</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ── Foto + nama ── */}
          <View style={styles.productHeader}>
            <TouchableOpacity
              style={styles.photoBox}
              activeOpacity={0.8}
              disabled={isUploading}
              onPress={pickPhoto}
            >
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.photo} />
              ) : (
                <CameraIcon color={TEXT_MUTED} />
              )}
              {isUploading && (
                <View style={styles.photoOverlay}>
                  <ActivityIndicator color={WHITE} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.productMeta}>
              <View style={styles.nameRow}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nama menu"
                  placeholderTextColor={TEXT_MUTED}
                  style={styles.nameInput}
                />
                <PencilIcon color={TEXT_MUTED} />
              </View>
              <Text style={styles.businessName} numberOfLines={1}>
                {mitra?.businessName || 'Nama warung'}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceNow}>
                  Rp {(Number.isFinite(numericDiscount) ? numericDiscount : 0).toLocaleString('id-ID')}
                </Text>
                <Text style={styles.priceOld}>
                  Rp {(Number.isFinite(numericOriginal) ? numericOriginal : 0).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Kelola stok ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kelola stok</Text>

            <FieldLabel>Masukkan Stok</FieldLabel>
            <TextInput
              value={stockInput}
              onChangeText={setStockInput}
              placeholder="Masukkan jumlah"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>Stok saat ini</Text>
              <Text style={styles.stockValue}>{savedStock}</Text>
            </View>
          </View>

          {/* ── Harga & Diskon ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Harga &amp; Diskon</Text>

            <FieldLabel>Harga Awal</FieldLabel>
            <TextInput
              value={originalPrice}
              onChangeText={setOriginalPrice}
              placeholder="Masukkan harga"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="numeric"
              style={styles.input}
            />

            <FieldLabel>Harga Diskon</FieldLabel>
            <TextInput
              value={discountPrice}
              onChangeText={setDiscountPrice}
              placeholder="Masukkan harga"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* ── Informasi lain (di luar wireframe, dipertahankan) ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informasi Lainnya</Text>

            <FieldLabel>Deskripsi</FieldLabel>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Deskripsi menu (opsional)"
              placeholderTextColor={TEXT_MUTED}
              multiline
              style={[styles.input, styles.textarea]}
            />

            <View style={styles.timeRow}>
              <View style={styles.flex}>
                <FieldLabel>Ambil Dari</FieldLabel>
                <TextInput
                  value={pickupStart}
                  onChangeText={setPickupStart}
                  placeholder="19:00"
                  placeholderTextColor={TEXT_MUTED}
                  style={styles.input}
                />
              </View>
              <View style={styles.gap} />
              <View style={styles.flex}>
                <FieldLabel>Sampai</FieldLabel>
                <TextInput
                  value={pickupEnd}
                  onChangeText={setPickupEnd}
                  placeholder="21:00"
                  placeholderTextColor={TEXT_MUTED}
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          {/* ── Aksi ── */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            activeOpacity={0.8}
            disabled={isSaving}
            onPress={handleSave}
          >
            {isSaving ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.saveText}>Simpan</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.disabledButton]}
            activeOpacity={0.8}
            disabled={isDeleting}
            onPress={handleDelete}
          >
            {isDeleting ? (
              <ActivityIndicator color={ERROR_TEXT} />
            ) : (
              <Text style={styles.deleteText}>Hapus Menu</Text>
            )}
          </TouchableOpacity>
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
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WHITE,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  headerSpacer: {
    width: 36,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  productHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  photoBox: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productMeta: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    padding: 0,
  },
  businessName: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    marginTop: 4,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceNow: {
    fontSize: 15,
    fontWeight: '800',
    color: PRIMARY,
  },
  priceOld: {
    fontSize: 13,
    color: TEXT_MUTED,
    textDecorationLine: 'line-through',
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 12,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_DARK,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 8,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 12,
    fontSize: 14,
    color: TEXT_DARK,
    marginBottom: 12,
  },
  textarea: {
    height: 84,
    paddingTop: 10,
    textAlignVertical: 'top',
  },

  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  stockLabel: {
    fontSize: 13,
    color: TEXT_DARK,
    fontWeight: '500',
  },
  stockValue: {
    fontSize: 15,
    fontWeight: '800',
    color: PRIMARY,
  },

  timeRow: {
    flexDirection: 'row',
  },
  gap: {
    width: 12,
  },

  saveButton: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: ERROR_BG,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteText: {
    color: ERROR_TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
});
