import { productService } from '@/services/product.service';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { isAxiosError } from 'axios';
import { useRef, useState } from 'react';
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

type ProductDraft = {
  id: number;
  imageUri: string | null;
  name: string;
  description: string;
  originalPrice: string;
  discountPrice: string;
  stock: string;
};

function createDraft(id: number): ProductDraft {
  return {
    id,
    imageUri: null,
    name: '',
    description: '',
    originalPrice: '',
    discountPrice: '',
    stock: '',
  };
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string' && message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Terjadi kesalahan. Silakan coba lagi.';
}

export default function MitraBulkCreateProductsScreen() {
  const router = useRouter();
  const nextId = useRef(2);
  const [drafts, setDrafts] = useState<ProductDraft[]>([createDraft(1)]);
  const [isSaving, setIsSaving] = useState(false);

  const updateDraft = (id: number, changes: Partial<ProductDraft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...changes } : draft)),
    );
  };

  const pickImage = async (id: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        updateDraft(id, { imageUri: result.assets[0].uri });
      }
    } catch {
      Alert.alert('Gagal', 'Tidak dapat memilih foto dari galeri.');
    }
  };

  const handleSave = async () => {
    if (isSaving || drafts.length === 0) return;

    const products = drafts.map((draft, index) => ({
      draft,
      index,
      originalPrice: parseInt(draft.originalPrice.replace(/\D/g, ''), 10),
      discountPrice: parseInt(draft.discountPrice.replace(/\D/g, ''), 10),
      stock: parseInt(draft.stock.replace(/\D/g, ''), 10),
    }));

    const invalidProduct = products.find(
      ({ draft, originalPrice, discountPrice, stock }) =>
        !draft.name.trim() ||
        Number.isNaN(originalPrice) ||
        originalPrice <= 0 ||
        Number.isNaN(discountPrice) ||
        discountPrice <= 0 ||
        discountPrice >= originalPrice ||
        Number.isNaN(stock) ||
        stock <= 0,
    );

    if (invalidProduct) {
      const { draft, index, originalPrice, discountPrice, stock } = invalidProduct;
      const message = !draft.name.trim()
        ? 'Nama produk wajib diisi.'
        : Number.isNaN(originalPrice) || originalPrice <= 0
          ? 'Harga asli harus lebih besar dari 0.'
          : Number.isNaN(discountPrice) || discountPrice <= 0
            ? 'Harga diskon harus lebih besar dari 0.'
            : discountPrice >= originalPrice
              ? 'Harga diskon harus lebih murah dari harga asli.'
              : Number.isNaN(stock) || stock <= 0
                ? 'Sisa stok minimal 1.'
                : 'Periksa kembali data produk.';
      Alert.alert(`Menu ${index + 1} belum valid`, message);
      return;
    }

    setIsSaving(true);
    let savedCount = 0;
    const photoFailures: string[] = [];

    try {
      for (const { draft, originalPrice, discountPrice, stock } of products) {
        let created;
        try {
          created = await productService.create({
            name: draft.name.trim(),
            description: draft.description.trim() || undefined,
            originalPrice,
            discountPrice,
            stock,
          });
        } catch (error) {
          const progress =
            savedCount > 0
              ? `${savedCount} menu sebelumnya berhasil disimpan. `
              : '';
          Alert.alert(
            savedCount > 0 ? 'Sebagian Menu Tersimpan' : 'Gagal Menyimpan Menu',
            `${progress}Menu "${draft.name.trim()}" gagal disimpan: ${getErrorMessage(error)}`,
          );
          return;
        }

        savedCount += 1;
        setDrafts((current) => current.filter((item) => item.id !== draft.id));

        if (draft.imageUri) {
          try {
            await productService.uploadPhoto(created.id, draft.imageUri);
          } catch (error) {
            console.error(`[bulk-create] Gagal mengunggah foto ${draft.name.trim()}`, error);
            photoFailures.push(draft.name.trim());
          }
        }
      }

      if (photoFailures.length > 0) {
        Alert.alert(
          'Menu Tersimpan',
          `${savedCount} menu berhasil disimpan. Foto gagal diunggah untuk: ${photoFailures.join(', ')}. Foto dapat ditambahkan nanti melalui Edit Menu.`,
          [{ text: 'Selesai', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Berhasil', `${savedCount} menu berhasil ditambahkan.`, [
          { text: 'Selesai', onPress: () => router.back() },
        ]);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Setup Menu Awal</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.helperText}>
            Masukkan menu warung sekaligus. Setelah tersimpan, stok dan foto menu dapat
            dikelola dari halaman Edit Menu.
          </Text>

          {drafts.map((draft, index) => (
            <View key={draft.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Menu {index + 1}</Text>
                {drafts.length > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      setDrafts((current) => current.filter((item) => item.id !== draft.id))
                    }
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel={`Hapus menu ${index + 1}`}
                  >
                    <Text style={styles.removeText}>Hapus</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.photoPicker}
                onPress={() => pickImage(draft.id)}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {draft.imageUri ? (
                  <Image source={{ uri: draft.imageUri }} style={styles.photo} />
                ) : (
                  <Text style={styles.photoPlaceholder}>Tambah foto menu (opsional)</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Nama Produk</Text>
              <TextInput
                style={styles.input}
                value={draft.name}
                onChangeText={(name) => updateDraft(draft.id, { name })}
                placeholder="Mis: Nasi ayam"
                placeholderTextColor="#9CA3AF"
                editable={!isSaving}
              />

              <Text style={styles.label}>Deskripsi (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                value={draft.description}
                onChangeText={(description) => updateDraft(draft.id, { description })}
                placeholder="Deskripsi menu"
                placeholderTextColor="#9CA3AF"
                multiline
                editable={!isSaving}
              />

              <View style={styles.priceRow}>
                <View style={styles.priceColumn}>
                  <Text style={styles.label}>Harga Asli</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.originalPrice}
                    onChangeText={(originalPrice) =>
                      updateDraft(draft.id, { originalPrice })
                    }
                    placeholder="Rp 0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    editable={!isSaving}
                  />
                </View>
                <View style={styles.priceColumn}>
                  <Text style={styles.label}>Harga Diskon</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.discountPrice}
                    onChangeText={(discountPrice) =>
                      updateDraft(draft.id, { discountPrice })
                    }
                    placeholder="Rp 0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    editable={!isSaving}
                  />
                </View>
              </View>

              <Text style={styles.label}>Stok Awal</Text>
              <TextInput
                style={styles.input}
                value={draft.stock}
                onChangeText={(stock) => updateDraft(draft.id, { stock })}
                placeholder="Jumlah porsi"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                editable={!isSaving}
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setDrafts((current) => [...current, createDraft(nextId.current++)])}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+ Tambah Menu Lain</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                Simpan {drafts.length} Menu
              </Text>
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
    backgroundColor: '#F4F6F7',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEEF0',
  },
  backButton: {
    width: 36,
    height: 32,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 30,
    lineHeight: 32,
    color: '#111827',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  helperText: {
    marginBottom: 16,
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    marginBottom: 14,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEEF0',
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  removeText: {
    color: '#C0392B',
    fontSize: 13,
    fontWeight: '600',
  },
  photoPicker: {
    height: 130,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    color: '#6B7280',
    fontSize: 13,
  },
  label: {
    marginBottom: 6,
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    minHeight: 44,
    marginBottom: 12,
    paddingHorizontal: 12,
    color: '#111827',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  descriptionInput: {
    minHeight: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priceColumn: {
    flex: 1,
  },
  addButton: {
    height: 44,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0E7465',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#0E7465',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0E7465',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
