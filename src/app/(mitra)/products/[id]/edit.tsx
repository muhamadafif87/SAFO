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

const PRIMARY = '#0E7465';
const WHITE = '#ffffff';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const PAGE_BG = '#F8FAFB';
const INPUT_BG = '#EBEFF0';
const ERROR_BG = '#FBE9E7';
const ERROR_TEXT = '#C0392B';

const BackIcon = ({ color = TEXT_DARK }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
  </Svg>
);

const PhotoAddIcon = ({ color = '#9CA3AF', size = 32 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <Path
      d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M19 19v-4m-2 2h4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PencilIcon = ({ color = '#6B7280', size = 14 }: { color?: string; size?: number }) => (
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
  const [savedStock, setSavedStock] = useState(0);
  const [pickupStart, setPickupStart] = useState('');
  const [pickupEnd, setPickupEnd] = useState('');

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
    } catch {
      showAlert('Gagal', 'Tidak dapat memuat detail produk.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (productId) void loadProduct(productId);
  }, [loadProduct, productId]);

  const pickPhoto = async () => {
    if (!productId) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
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
      let pickupWindowStart: string | undefined;
      let pickupWindowEnd: string | undefined;

      if (pickupStart.trim() && pickupEnd.trim()) {
        const now = new Date();
        const startParts = pickupStart.trim().split(':').map((p) => parseInt(p, 10));
        const endParts = pickupEnd.trim().split(':').map((p) => parseInt(p, 10));

        const start = new Date(now);
        start.setHours(startParts[0] || 0, startParts[1] || 0, 0, 0);

        const end = new Date(now);
        end.setHours(endParts[0] || 23, endParts[1] || 59, 59, 999);

        pickupWindowStart = start.toISOString();
        pickupWindowEnd = end.toISOString();
      } else {
        pickupWindowStart = new Date().toISOString();
        pickupWindowEnd = new Date('2099-12-31T23:59:59.999Z').toISOString();
      }

      await productService.update(productId, {
        name: name.trim(),
        description: description.trim(),
        originalPrice: Math.round(original),
        discountPrice: Math.round(discount),
        stock: Math.round(stock),
        pickupWindowStart,
        pickupWindowEnd,
      });

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const numericOriginal = Number(originalPrice);
  const numericDiscount = Number(discountPrice);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header: < Edit Menu ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <BackIcon color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Menu</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* ── Foto + Nama Menu (Sesuai Wireframe) ── */}
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
                <PhotoAddIcon color="#B0B7BC" size={36} />
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
                  placeholder="Nama Menu ..."
                  placeholderTextColor={TEXT_MUTED}
                  style={styles.nameInput}
                />
                <PencilIcon color="#1F2937" size={14} />
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

          {/* ── Card 1: Kelola stok ── */}
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

          {/* ── Card 2: Harga & Diskon ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Harga & Diskon</Text>

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

          {/* ── Tombol Simpan & Hapus ── */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            activeOpacity={0.8}
            disabled={isSaving}
            onPress={handleSave}
          >
            {isSaving ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.saveText}>Simpan Perubahan</Text>
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
    fontWeight: '800',
    color: '#0B3B32',
  },
  headerSpacer: {
    width: 32,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Product Header */
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  photoBox: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#DDE2E5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_DARK,
    padding: 0,
    flexShrink: 1,
  },
  businessName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 4,
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
    fontSize: 12.5,
    color: TEXT_MUTED,
    textDecorationLine: 'line-through',
  },

  /* Cards matching wireframe */
  card: {
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECED',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F2',
    marginBottom: 12,
  },

  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 8,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: TEXT_DARK,
    marginBottom: 12,
  },

  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  stockLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY,
  },

  /* Action Buttons */
  saveButton: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: ERROR_BG,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteText: {
    color: ERROR_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
});
