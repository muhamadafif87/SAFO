import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1a5c52';
const PRIMARY_LIGHT = '#e8f4f1';
const PRIMARY_DARK = '#123d37';
const WHITE = '#ffffff';
const GRAY_50 = '#f9fafb';
const GRAY_100 = '#f3f4f6';
const GRAY_200 = '#e5e7eb';
const GRAY_300 = '#d1d5db';
const GRAY_400 = '#9ca3af';
const GRAY_500 = '#6b7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';
const DANGER = '#ef4444';

export default function AddLocationScreen() {
  const router = useRouter();
  
  const [addressLabel, setAddressLabel] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [details, setDetails] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleSave = () => {
    if (!addressLabel.trim() || !fullAddress.trim() || !fullName.trim() || !phone.trim()) {
      Alert.alert('Validasi', 'Semua field harus diisi');
      return;
    }

    // Save logic would go here
    Alert.alert('Berhasil', 'Alamat baru berhasil ditambahkan');
    router.back();
  };

  const renderFormField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    multiline: boolean = false,
    keyboardType: any = 'default'
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        placeholder={placeholder}
        placeholderTextColor={GRAY_400}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        returnKeyType="next"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah Alamat Baru</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Address Label */}
        {renderFormField(
          'Label Alamat',
          addressLabel,
          setAddressLabel,
          'Rumah, Kantor, dll',
          false
        )}

        {/* Full Address */}
        {renderFormField(
          'Alamat Lengkap',
          fullAddress,
          setFullAddress,
          'Jl. Contoh No. 123',
          true
        )}

        {/* Address Details */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Rincian Alamat (Opsional)</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMultiline]}
            placeholder="Cth: Blok, No. Rumah, Patokan"
            placeholderTextColor={GRAY_400}
            value={details}
            onChangeText={setDetails}
            multiline
            returnKeyType="next"
          />
          <Text style={styles.fieldHint}>Masukkan deskripsi lokasi untuk memudahkan driver</Text>
        </View>

        {/* Full Name */}
        {renderFormField(
          'Nama Lengkap',
          fullName,
          setFullName,
          'Nama penerima',
          false
        )}

        {/* Phone */}
        {renderFormField(
          'No. Handphone',
          phone,
          setPhone,
          '(+62) Nomor telepon',
          false,
          'phone-pad'
        )}

        {/* Set as Default */}
        <View style={styles.defaultWrapper}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsDefault(!isDefault)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
              {isDefault && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>Jadikan alamat utama</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.cancelBtnText}>Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Simpan Alamat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: PRIMARY_DARK,
  },
  backIcon: {
    fontSize: 20,
    color: WHITE,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: WHITE,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: GRAY_900,
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: GRAY_900,
    backgroundColor: GRAY_100,
  },
  fieldInputMultiline: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  fieldHint: {
    fontSize: 11,
    color: GRAY_500,
    marginTop: 6,
    fontStyle: 'italic',
  },
  defaultWrapper: {
    marginBottom: 24,
    paddingVertical: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: GRAY_300,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  checkboxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  checkmark: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: GRAY_700,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    backgroundColor: WHITE,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: GRAY_300,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAY_700,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
});
