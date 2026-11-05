import { Colors } from '@/constants/typography';
import { mitraService } from '@/services/mitra.service';
import { useAuthStore } from '@/stores/auth.store';
import { showAlert } from '@/utils/alert';
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
const PAGE_BG = '#F8FAFB';
const INPUT_BG = '#EBEFF0';

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

export default function MitraEditProfileScreen() {
  const router = useRouter();
  const { user, mitra, updateMitra } = useAuthStore();

  const [businessName, setBusinessName] = useState(mitra?.businessName || '');
  const [category, setCategory] = useState(mitra?.category || '');
  const [address, setAddress] = useState(mitra?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(mitra?.photoUrl || null);
  const [isSaving, setIsSaving] = useState(false);

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUrl(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Gagal', 'Tidak dapat memilih foto warung.');
    }
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert('Perhatian', 'Nama warung tidak boleh kosong.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Perhatian', 'Alamat warung tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await mitraService.updateProfile({
        businessName: businessName.trim(),
        category: category.trim(),
        address: address.trim(),
        phone: phone.trim(),
        photoUrl: photoUrl || undefined,
      });

      // Update state di auth store agar langsung tercermin di seluruh aplikasi
      if (updated) {
        updateMitra(updated);
      }

      Alert.alert('Sukses', 'Profil warung berhasil diperbarui!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Gagal menyimpan profil warung.';
      Alert.alert('Gagal', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <BackIcon color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Warung</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Foto Warung ── */}
          <View style={styles.photoContainer}>
            <TouchableOpacity
              style={styles.photoBox}
              activeOpacity={0.8}
              onPress={pickPhoto}
            >
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.photo} />
              ) : (
                <PhotoAddIcon color="#B0B7BC" size={40} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.7}>
              <Text style={styles.changePhotoText}>Ubah Foto Warung</Text>
            </TouchableOpacity>
          </View>

          {/* ── Card 1: Informasi Usaha ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informasi Usaha</Text>

            <Text style={styles.fieldLabel}>Nama Warung</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Contoh: Warung Kumlot"
              placeholderTextColor={TEXT_MUTED}
            />

            <Text style={styles.fieldLabel}>Kategori</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Contoh: Bakery, Resto, Angkringan"
              placeholderTextColor={TEXT_MUTED}
            />

            <Text style={styles.fieldLabel}>Nomor Telepon / WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Contoh: 081288243274"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="phone-pad"
            />
          </View>

          {/* ── Card 2: Lokasi & Alamat ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lokasi Warung</Text>

            <Text style={styles.fieldLabel}>Alamat Lengkap</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Jl. Kartika No 11, Jebres, Surakarta"
              placeholderTextColor={TEXT_MUTED}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ── Tombol Simpan ── */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            activeOpacity={0.8}
            disabled={isSaving}
            onPress={handleSave}
          >
            {isSaving ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <Text style={styles.saveText}>Simpan Perubahan</Text>
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

  /* Photo Container */
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  photoBox: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#DDE2E5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
  },

  /* Card */
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
  textarea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },

  /* Save Button */
  saveButton: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
});

