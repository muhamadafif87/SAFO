/**
 * location-picker.tsx
 * ────────────────────
 * Layar penuh pemilihan lokasi pengiriman.
 * Muncul saat user mengetuk "Lokasi Anda" di header beranda.
 *
 * Struktur (sesuai wireframe):
 *  1. Header hijau — back button + search bar + icon peta
 *  2. Peta mini Mapbox + banner notifikasi + "Lokasi Saat Ini" floating
 *  3. Row "Antar Ke" — alamat aktif | tombol GPS
 *  4. Section "Alamat Saya" — daftar tersimpan (collapse setelah 2)
 *  5. Section "Saran Lokasi Terdekat" — dari Mapbox Geocoding 2km
 */

import { useLocationStore } from "@/stores/location.store";
import type { NearbyPlace, SavedAddress } from "@/types";
import { getNearbyPlaces, reverseGeocodeMapbox, searchLocations } from "@/utils/geocoding";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// ─── Token setup ──────────────────────────────────────────────────────────────
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
if (MAPBOX_TOKEN) Mapbox.setAccessToken(MAPBOX_TOKEN);

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY      = "#1a5c52";
const PRIMARY_DARK = "#123d37";
const PRIMARY_LIGHT = "#e8f4f1";
const WHITE        = "#ffffff";
const GRAY_50      = "#f9fafb";
const GRAY_100     = "#f3f4f6";
const GRAY_200     = "#e5e7eb";
const GRAY_300     = "#d1d5db";
const GRAY_400     = "#9ca3af";
const GRAY_500     = "#6b7280";
const GRAY_700     = "#374151";
const GRAY_900     = "#111827";
const AMBER        = "#f59e0b";
const AMBER_LIGHT  = "#fef3c7";
const DANGER       = "#ef4444";

const DEFAULT_COORD = { latitude: -7.575273, longitude: 110.8218226 };
const SHOWN_DEFAULT = 2; // jumlah alamat yang ditampilkan sebelum "Lihat Lainnya"

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconBack() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconSearch() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={8} stroke={GRAY_400} strokeWidth={2} />
      <Path d="M21 21l-4.35-4.35" stroke={GRAY_400} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IconMapPin({ color = PRIMARY, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
    </Svg>
  );
}

function IconBookmark({ color = GRAY_400, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5z" />
    </Svg>
  );
}

function IconEdit({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke={GRAY_400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={GRAY_400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconTarget({ color = PRIMARY, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={6} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={2} fill={color} />
    </Svg>
  );
}

function IconMap({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13V7m0 13l6-3m-6-10l6-3m0 0l5.447 2.724A1 1 0 0121 7.618v10.764a1 1 0 01-1.447.894L15 17m0-13v13"
        stroke={WHITE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={PRIMARY} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function IconChevronDown({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={PRIMARY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconChevronUp({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 15l-6-6-6 6" stroke={PRIMARY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconTrash({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={DANGER} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconClose({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={GRAY_500} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function IconBell({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={PRIMARY}>
      <Path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </Svg>
  );
}

// ─── Komponen: SavedAddressCard ────────────────────────────────────────────────

interface SavedAddressCardProps {
  item: SavedAddress;
  userLat?: number;
  userLng?: number;
  onSelect: (item: SavedAddress) => void;
  onEdit: (item: SavedAddress) => void;
}

function SavedAddressCard({ item, onSelect, onEdit }: SavedAddressCardProps) {
  return (
    <TouchableOpacity
      style={cardStyles.wrap}
      onPress={() => onSelect(item)}
      activeOpacity={0.75}
    >
      <View style={cardStyles.left}>
        <View style={cardStyles.bookmarkWrap}>
          <IconBookmark color={item.isPrimary ? PRIMARY : GRAY_400} size={16} />
        </View>
        <View style={cardStyles.info}>
          {item.distanceKm !== undefined && (
            <Text style={cardStyles.distance}>{item.distanceKm.toFixed(1)}km</Text>
          )}
          <Text style={cardStyles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={cardStyles.detail} numberOfLines={1}>
            {item.addressDetail}
          </Text>
          <Text style={cardStyles.meta} numberOfLines={1}>
            {item.recipientName}
            {item.recipientPhone ? `  |  ${item.recipientPhone}` : ""}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => onEdit(item)} style={cardStyles.editBtn} hitSlop={8}>
        <IconEdit size={17} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
    backgroundColor: WHITE,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bookmarkWrap: {
    marginTop: 2,
    width: 24,
    alignItems: "center",
  },
  info: { flex: 1, gap: 2 },
  distance: { fontSize: 11, color: GRAY_400, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "700", color: GRAY_900 },
  detail: { fontSize: 12, color: GRAY_500, lineHeight: 17 },
  meta: { fontSize: 11, color: GRAY_400, marginTop: 1 },
  editBtn: { padding: 6 },
});

// ─── Komponen: NearbyPlaceCard ─────────────────────────────────────────────────

interface NearbyPlaceCardProps {
  item: NearbyPlace;
  onSelect: (item: NearbyPlace) => void;
}

function NearbyPlaceCard({ item, onSelect }: NearbyPlaceCardProps) {
  return (
    <TouchableOpacity
      style={nearbyStyles.wrap}
      onPress={() => onSelect(item)}
      activeOpacity={0.75}
    >
      <View style={nearbyStyles.iconWrap}>
        <IconMapPin color={GRAY_400} size={18} />
      </View>
      <View style={nearbyStyles.info}>
        <Text style={nearbyStyles.distance}>{item.distanceKm}km</Text>
        <Text style={nearbyStyles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={nearbyStyles.address} numberOfLines={1}>{item.fullAddress}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Label presets ────────────────────────────────────────────────────────────
const LABEL_PRESETS = ["Rumah", "Kampus", "Kantor", "Kost"];

const nearbyStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
    backgroundColor: WHITE,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GRAY_100,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  distance: { fontSize: 11, color: GRAY_400, fontWeight: "600" },
  name: { fontSize: 14, fontWeight: "700", color: GRAY_900 },
  address: { fontSize: 12, color: GRAY_500 },
});

// ─── Komponen: AddressFormSheet ───────────────────────────────────────────────

interface AddressFormSheetProps {
  visible: boolean;
  /** null = mode tambah baru, objek = mode edit */
  editTarget: SavedAddress | null;
  /** Koordinat pin saat ini di peta, digunakan saat mode tambah */
  pinLat: number;
  pinLng: number;
  pinAddress: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

function AddressFormSheet({
  visible,
  editTarget,
  pinLat,
  pinLng,
  pinAddress,
  onClose,
  onSaved,
  onDeleted,
}: AddressFormSheetProps) {
  const { addAddress, updateAddress, removeAddress } = useLocationStore();
  const isEdit = editTarget !== null;

  const [label, setLabel] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset form setiap kali sheet dibuka
  useEffect(() => {
    if (!visible) return;
    if (isEdit && editTarget) {
      // Pre-fill dari data yang diedit
      const preset = LABEL_PRESETS.includes(editTarget.label) ? editTarget.label : "Lainnya";
      setLabel(preset);
      setCustomLabel(preset === "Lainnya" ? editTarget.label : "");
      setAddressDetail(editTarget.addressDetail);
      setRecipientName(editTarget.recipientName);
      setRecipientPhone(editTarget.recipientPhone);
      setIsPrimary(editTarget.isPrimary);
    } else {
      // Mode tambah — pakai pin peta
      setLabel("");
      setCustomLabel("");
      setAddressDetail(pinAddress);
      setRecipientName("");
      setRecipientPhone("");
      setIsPrimary(false);
    }
  }, [visible]);

  const resolvedLabel = label === "Lainnya" ? customLabel.trim() : label;

  const handleSave = async () => {
    if (!resolvedLabel) {
      Alert.alert("Label wajib diisi", "Pilih atau ketik label untuk alamat ini.");
      return;
    }
    if (!addressDetail.trim()) {
      Alert.alert("Detail alamat wajib", "Isi detail alamat lengkap.");
      return;
    }
    if (!recipientName.trim()) {
      Alert.alert("Nama penerima wajib", "Isi nama penerima untuk alamat ini.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editTarget) {
        await updateAddress(editTarget.id, {
          label: resolvedLabel,
          addressDetail: addressDetail.trim(),
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          isPrimary,
        });
      } else {
        await addAddress({
          label: resolvedLabel,
          addressDetail: addressDetail.trim(),
          latitude: pinLat,
          longitude: pinLng,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          isPrimary,
        });
      }
      onSaved();
    } catch (err: any) {
      Alert.alert("Gagal menyimpan", err?.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editTarget) return;
    Alert.alert(
      "Hapus Alamat",
      `Alamat "${editTarget.label}" akan dihapus permanen.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await removeAddress(editTarget.id);
              onDeleted?.();
            } catch (err: any) {
              Alert.alert("Gagal menghapus", err?.message ?? "Terjadi kesalahan.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity style={fs.backdrop} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={fs.sheetWrap}
      >
        <View style={fs.sheet}>
          {/* Handle bar */}
          <View style={fs.handle} />

          {/* Header */}
          <View style={fs.sheetHeader}>
            <Text style={fs.sheetTitle}>
              {isEdit ? "Edit Alamat" : "Tambah Alamat Baru"}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={fs.closeBtn}>
              <IconClose size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Label preset chips */}
            <View style={fs.fieldWrap}>
              <Text style={fs.fieldLabel}>Label Alamat <Text style={fs.required}>*</Text></Text>
              <View style={fs.chipsRow}>
                {[...LABEL_PRESETS, "Lainnya"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[fs.chip, label === p && fs.chipActive]}
                    onPress={() => setLabel(p)}
                    activeOpacity={0.75}
                  >
                    <Text style={[fs.chipText, label === p && fs.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {label === "Lainnya" && (
                <TextInput
                  style={[fs.input, { marginTop: 8 }]}
                  placeholder="Ketik label kustom..."
                  placeholderTextColor={GRAY_400}
                  value={customLabel}
                  onChangeText={setCustomLabel}
                  maxLength={30}
                />
              )}
            </View>

            {/* Detail Alamat */}
            <View style={fs.fieldWrap}>
              <Text style={fs.fieldLabel}>Detail Alamat <Text style={fs.required}>*</Text></Text>
              <TextInput
                style={[fs.input, fs.inputMulti]}
                placeholder="Jl. Nama Jalan No. XX, Kelurahan, Kecamatan..."
                placeholderTextColor={GRAY_400}
                value={addressDetail}
                onChangeText={setAddressDetail}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {!isEdit && (
                <Text style={fs.hint}>📍 Diisi otomatis dari pin peta. Bisa diedit manual.</Text>
              )}
            </View>

            {/* Nama Penerima */}
            <View style={fs.fieldWrap}>
              <Text style={fs.fieldLabel}>Nama Penerima <Text style={fs.required}>*</Text></Text>
              <TextInput
                style={fs.input}
                placeholder="Nama lengkap penerima"
                placeholderTextColor={GRAY_400}
                value={recipientName}
                onChangeText={setRecipientName}
              />
            </View>

            {/* No. HP */}
            <View style={fs.fieldWrap}>
              <Text style={fs.fieldLabel}>No. HP</Text>
              <TextInput
                style={fs.input}
                placeholder="+62..."
                placeholderTextColor={GRAY_400}
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Toggle Utama */}
            <View style={fs.toggleRow}>
              <View style={fs.toggleText}>
                <Text style={fs.toggleLabel}>Jadikan Alamat Utama</Text>
                <Text style={fs.toggleSub}>Tampil pertama di daftar alamat</Text>
              </View>
              <Switch
                value={isPrimary}
                onValueChange={setIsPrimary}
                trackColor={{ false: GRAY_200, true: PRIMARY }}
                thumbColor={WHITE}
              />
            </View>

            {/* Tombol Save */}
            <TouchableOpacity
              style={[fs.saveBtn, saving && fs.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <Text style={fs.saveBtnText}>
                  {isEdit ? "Simpan Perubahan" : "Simpan Alamat Baru"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Tombol Hapus (edit mode only) */}
            {isEdit && (
              <TouchableOpacity
                style={[fs.deleteBtn, deleting && fs.saveBtnDisabled]}
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator color={DANGER} size="small" />
                ) : (
                  <>
                    <IconTrash size={16} />
                    <Text style={fs.deleteBtnText}>Hapus Alamat</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    maxHeight: "88%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: GRAY_200,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: GRAY_900 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GRAY_100,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldWrap: { paddingHorizontal: 20, paddingTop: 18 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: GRAY_700, marginBottom: 8 },
  required: { color: DANGER },
  hint: { fontSize: 11, color: GRAY_400, marginTop: 6 },
  input: {
    backgroundColor: GRAY_50,
    borderWidth: 1.5,
    borderColor: GRAY_200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: GRAY_900,
  },
  inputMulti: { minHeight: 80, paddingTop: 12 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GRAY_200,
    backgroundColor: WHITE,
  },
  chipActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  chipText: { fontSize: 13, fontWeight: "600", color: GRAY_500 },
  chipTextActive: { color: PRIMARY },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: GRAY_100,
    marginTop: 16,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: GRAY_900 },
  toggleSub: { fontSize: 12, color: GRAY_400, marginTop: 2 },
  saveBtn: {
    marginHorizontal: 20,
    marginTop: 4,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#123d37",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: WHITE, fontSize: 15, fontWeight: "700" },
  deleteBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: DANGER,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteBtnText: { color: DANGER, fontSize: 14, fontWeight: "700" },
});

// ─── Komponen: SearchResultCard ────────────────────────────────────────────────

function SearchResultCard({ item, onSelect }: NearbyPlaceCardProps) {
  return (
    <TouchableOpacity
      style={[nearbyStyles.wrap, { borderBottomColor: GRAY_200 }]}
      onPress={() => onSelect(item)}
      activeOpacity={0.75}
    >
      <View style={[nearbyStyles.iconWrap, { backgroundColor: PRIMARY_LIGHT }]}>
        <IconMapPin color={PRIMARY} size={18} />
      </View>
      <View style={nearbyStyles.info}>
        <Text style={nearbyStyles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={nearbyStyles.address} numberOfLines={1}>{item.fullAddress}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LocationPickerScreen() {
  const router = useRouter();
  const {
    activeLocation,
    setActiveLocation,
    savedAddresses,
    isLoadingAddresses,
    fetchAddresses,
    selectSavedAddress,
    nearbyPlaces,
    setNearbyPlaces,
    setLoadingNearby,
    isLoadingNearby,
  } = useLocationStore();

  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── State ─────────────────────────────────────────────────────────────────

  const [mapCoord, setMapCoord] = useState({
    latitude: activeLocation?.lat ?? DEFAULT_COORD.latitude,
    longitude: activeLocation?.lng ?? DEFAULT_COORD.longitude,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [mapAddress, setMapAddress] = useState(activeLocation?.address ?? "");
  const [resolvingMapAddress, setResolvingMapAddress] = useState(false);
  const [detectingGPS, setDetectingGPS] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NearbyPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAllAddresses, setShowAllAddresses] = useState(false);

  // Form state
  const [formVisible, setFormVisible] = useState(false);
  const [formTarget, setFormTarget] = useState<SavedAddress | null>(null);

  // Pin bounce animation
  const pinBounce = useRef(new Animated.Value(0)).current;

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    // Load saved addresses + nearby places saat layar pertama kali dibuka
    const lat = activeLocation?.lat ?? DEFAULT_COORD.latitude;
    const lng = activeLocation?.lng ?? DEFAULT_COORD.longitude;

    fetchAddresses(lat, lng);
    loadNearbyPlaces(lat, lng);
  }, []);

  useEffect(() => {
    // Animasi bounce saat user mulai/berhenti panning
    Animated.spring(pinBounce, {
      toValue: isPanning ? -10 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 6,
    }).start();
  }, [isPanning]);

  // ── Geocoding helpers ──────────────────────────────────────────────────────

  const resolveMapAddress = useCallback((lat: number, lng: number) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    setResolvingMapAddress(true);
    geocodeTimer.current = setTimeout(async () => {
      const { shortName } = await reverseGeocodeMapbox(lat, lng);
      setMapAddress(shortName);
      setResolvingMapAddress(false);
    }, 500);
  }, []);

  const loadNearbyPlaces = async (lat: number, lng: number) => {
    setLoadingNearby(true);
    const places = await getNearbyPlaces(lat, lng, 2, 5);
    setNearbyPlaces(places);
    setLoadingNearby(false);
  };

  // ── Search ─────────────────────────────────────────────────────────────────

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      const lat = activeLocation?.lat ?? DEFAULT_COORD.latitude;
      const lng = activeLocation?.lng ?? DEFAULT_COORD.longitude;
      const results = await searchLocations(text, lat, lng, 6);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
  };

  // ── Map handlers ───────────────────────────────────────────────────────────

  const handleRegionDidChange = (feature: any) => {
    setIsPanning(false);
    const [longitude, latitude] = feature.geometry.coordinates;
    setMapCoord({ latitude, longitude });
    resolveMapAddress(latitude, longitude);
  };

  // ── GPS detection ──────────────────────────────────────────────────────────

  const handleUseCurrentGPS = async () => {
    setDetectingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Ditolak",
          "Aktifkan izin lokasi di pengaturan perangkat untuk fitur ini.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setMapCoord({ latitude, longitude });
      cameraRef.current?.setCamera({
        centerCoordinate: [longitude, latitude],
        zoomLevel: 15,
        animationDuration: 600,
      });
      resolveMapAddress(latitude, longitude);
      await loadNearbyPlaces(latitude, longitude);
    } catch {
      Alert.alert("Gagal", "Tidak dapat mendeteksi lokasi saat ini.");
    } finally {
      setDetectingGPS(false);
    }
  };

  // ── Confirm pin location ───────────────────────────────────────────────────

  const handleConfirmPin = async () => {
    if (resolvingMapAddress) return;
    const { latitude, longitude } = mapCoord;
    const { shortName, fullAddress } = await reverseGeocodeMapbox(latitude, longitude);
    await setActiveLocation({
      lat: latitude,
      lng: longitude,
      address: shortName,
      fullAddress,
    });
    router.back();
  };

  // ── Select saved address ───────────────────────────────────────────────────

  const handleSelectSaved = async (addr: SavedAddress) => {
    await selectSavedAddress(addr);
    router.back();
  };

  // ── Select nearby place ────────────────────────────────────────────────────

  const handleSelectNearby = async (place: NearbyPlace) => {
    await setActiveLocation({
      lat: place.latitude,
      lng: place.longitude,
      address: place.name,
      fullAddress: place.fullAddress,
    });
    router.back();
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const currentAddressLabel =
    activeLocation?.address ?? "Belum ada lokasi dipilih";
  const currentFullAddress = activeLocation?.fullAddress ?? "";
  const visibleAddresses = showAllAddresses
    ? savedAddresses
    : savedAddresses.slice(0, SHOWN_DEFAULT);
  const hiddenCount = savedAddresses.length - SHOWN_DEFAULT;

  const isSearchMode = searchQuery.trim().length > 0;

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      {/* ── 1. Header Hijau ────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <IconBack />
        </TouchableOpacity>

        <View style={s.searchBar}>
          <IconSearch />
          <TextInput
            style={s.searchInput}
            placeholder="Cari lokasi"
            placeholderTextColor={GRAY_400}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
              <Text style={s.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={s.mapIconBtn} activeOpacity={0.8} onPress={handleConfirmPin}>
          <IconMap size={20} />
        </TouchableOpacity>
      </View>

      {/* ── Search overlay ──────────────────────────────────────────────── */}
      {isSearchMode && (
        <View style={s.searchOverlay}>
          {isSearching ? (
            <View style={s.searchLoading}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={s.searchLoadingText}>Mencari lokasi...</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={s.searchLoading}>
              <Text style={s.searchLoadingText}>Lokasi tidak ditemukan</Text>
            </View>
          ) : (
            searchResults.map((r) => (
              <SearchResultCard key={r.id} item={r} onSelect={handleSelectNearby} />
            ))
          )}
        </View>
      )}

      {!isSearchMode && (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} stickyHeaderIndices={[]}>

          {/* ── 2. Peta Mini ─────────────────────────────────────────────── */}
          <View style={s.mapWrap}>
            {/* Banner notifikasi di atas peta */}
            <View style={s.notifBanner} pointerEvents="none">
              <View style={s.notifIcon}>
                <IconBell size={18} />
              </View>
              <Text style={s.notifText}>
                Mohon periksa pin lokasimu, kami akan mengirimkan pesananmu sesuai pin lokasi
              </Text>
            </View>

            <Mapbox.MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              scrollEnabled
              zoomEnabled
              rotateEnabled={false}
              onRegionWillChange={() => setIsPanning(true)}
              onRegionDidChange={handleRegionDidChange}
              logoEnabled={false}
              attributionEnabled={false}
            >
              <Mapbox.Camera
                ref={cameraRef}
                centerCoordinate={[mapCoord.longitude, mapCoord.latitude]}
                zoomLevel={15}
                animationDuration={300}
              />
            </Mapbox.MapView>

            {/* Pin tetap di tengah */}
            <View pointerEvents="none" style={s.centerPinWrap}>
              <Animated.View style={{ transform: [{ translateY: pinBounce }] }}>
                <IconMapPin color={PRIMARY} size={38} />
              </Animated.View>
              <View style={[s.pinShadow, isPanning && s.pinShadowSmall]} />
            </View>

            {/* Tombol GPS floating */}
            <TouchableOpacity
              style={s.gpsBtn}
              onPress={handleUseCurrentGPS}
              disabled={detectingGPS}
              activeOpacity={0.85}
            >
              {detectingGPS ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <IconTarget color={PRIMARY} size={20} />
              )}
            </TouchableOpacity>
          </View>

          {/* ── 3. Row "Antar Ke" ──────────────────────────────────────────── */}
          <View style={s.deliveryRow}>
            <View style={s.deliveryLeft}>
              <IconMapPin color={PRIMARY} size={20} />
              <View style={s.deliveryTextWrap}>
                <Text style={s.deliveryLabel}>Antar Ke:</Text>
                <Text style={s.deliveryAddress} numberOfLines={1}>
                  {resolvingMapAddress ? "Mencari alamat..." : (mapAddress || currentAddressLabel)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.gpsRowBtn}
              onPress={handleUseCurrentGPS}
              activeOpacity={0.8}
              disabled={detectingGPS}
            >
              <IconTarget color={PRIMARY} size={14} />
              <Text style={s.gpsRowText}>
                {detectingGPS ? "Mendeteksi..." : "Lokasi Saat Ini"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 4. Konfirmasi Pin ─────────────────────────────────────────── */}
          <TouchableOpacity
            style={[s.confirmBtn, resolvingMapAddress && s.confirmBtnDisabled]}
            onPress={handleConfirmPin}
            disabled={resolvingMapAddress}
            activeOpacity={0.85}
          >
            <Text style={s.confirmBtnText}>
              {resolvingMapAddress ? "Memuat alamat..." : "Gunakan Lokasi Pin Ini"}
            </Text>
          </TouchableOpacity>

          {/* ── 5. Section: Alamat Saya ──────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Alamat Saya</Text>
              <TouchableOpacity
                style={s.addNewBtn}
                onPress={() => {
                  setFormTarget(null);
                  setFormVisible(true);
                }}
                activeOpacity={0.8}
              >
                <IconPlus size={13} />
                <Text style={s.addNewText}>Tambahkan Alamat Baru</Text>
              </TouchableOpacity>
            </View>

            <View style={s.sectionCard}>
              {isLoadingAddresses ? (
                <View style={s.sectionLoading}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={s.sectionLoadingText}>Memuat alamat...</Text>
                </View>
              ) : savedAddresses.length === 0 ? (
                <View style={s.sectionEmpty}>
                  <Text style={s.sectionEmptyText}>Belum ada alamat tersimpan</Text>
                </View>
              ) : (
                <>
                  {visibleAddresses.map((addr) => (
                    <SavedAddressCard
                      key={addr.id}
                      item={addr}
                      onSelect={handleSelectSaved}
                      onEdit={() => {
                        setFormTarget(addr);
                        setFormVisible(true);
                      }}
                    />
                  ))}
                  {savedAddresses.length > SHOWN_DEFAULT && (
                    <TouchableOpacity
                      style={s.showMoreBtn}
                      onPress={() => setShowAllAddresses(!showAllAddresses)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.showMoreText}>
                        {showAllAddresses
                          ? "Tampilkan Lebih Sedikit"
                          : `Lihat Lainnya (${hiddenCount})`}
                      </Text>
                      {showAllAddresses ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>

          {/* ── 6. Section: Saran Lokasi Terdekat ────────────────────────── */}
          <View style={[s.section, { marginBottom: 32 }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Saran Lokasi Terdekat</Text>
            </View>

            <View style={s.sectionCard}>
              {isLoadingNearby ? (
                <View style={s.sectionLoading}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={s.sectionLoadingText}>Mencari lokasi terdekat...</Text>
                </View>
              ) : nearbyPlaces.length === 0 ? (
                <View style={s.sectionEmpty}>
                  <Text style={s.sectionEmptyText}>Tidak ada saran lokasi saat ini</Text>
                </View>
              ) : (
                nearbyPlaces.map((place) => (
                  <NearbyPlaceCard key={place.id} item={place} onSelect={handleSelectNearby} />
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Form Sheet ─────────────────────────────────────────────────── */}
      <AddressFormSheet
        visible={formVisible}
        editTarget={formTarget}
        pinLat={mapCoord.latitude}
        pinLng={mapCoord.longitude}
        pinAddress={mapAddress}
        onClose={() => setFormVisible(false)}
        onSaved={() => {
          setFormVisible(false);
          // Refetch dipanggil via onSaved
          fetchAddresses(mapCoord.latitude, mapCoord.longitude);
        }}
        onDeleted={() => {
          setFormVisible(false);
          fetchAddresses(mapCoord.latitude, mapCoord.longitude);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GRAY_50 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: GRAY_900,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 12,
    color: GRAY_400,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  mapIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Search overlay
  searchOverlay: {
    flex: 1,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: GRAY_100,
  },
  searchLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 20,
  },
  searchLoadingText: { fontSize: 14, color: GRAY_500 },

  // Scroll
  scroll: { flex: 1 },

  // Map
  mapWrap: {
    height: 210,
    backgroundColor: GRAY_200,
    position: "relative",
  },
  notifBanner: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  notifIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifText: {
    flex: 1,
    fontSize: 12,
    color: GRAY_700,
    lineHeight: 17,
  },
  centerPinWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -19,
    marginTop: -44,
    alignItems: "center",
    zIndex: 5,
    pointerEvents: "none",
  } as any,
  pinShadow: {
    width: 10,
    height: 5,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.3)",
    marginTop: 2,
  },
  pinShadowSmall: {
    width: 6,
    height: 3,
    opacity: 0.5,
  },
  gpsBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
    }),
  },

  // Delivery row
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_100,
    gap: 10,
  },
  deliveryLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deliveryTextWrap: { flex: 1 },
  deliveryLabel: { fontSize: 11, color: GRAY_400, fontWeight: "600" },
  deliveryAddress: {
    fontSize: 14,
    fontWeight: "700",
    color: GRAY_900,
    marginTop: 2,
  },
  gpsRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  gpsRowText: { fontSize: 12, color: PRIMARY, fontWeight: "700" },

  // Confirm button
  confirmBtn: {
    margin: 14,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: PRIMARY_DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: WHITE, fontSize: 15, fontWeight: "700" },

  // Sections
  section: { marginTop: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: GRAY_900 },
  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addNewText: { fontSize: 12, color: PRIMARY, fontWeight: "700" },
  sectionCard: {
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: GRAY_200,
    overflow: "hidden",
  },
  sectionLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 20,
  },
  sectionLoadingText: { fontSize: 13, color: GRAY_400 },
  sectionEmpty: { padding: 20, alignItems: "center" },
  sectionEmptyText: { fontSize: 13, color: GRAY_400 },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: GRAY_100,
    backgroundColor: GRAY_50,
  },
  showMoreText: { fontSize: 13, color: PRIMARY, fontWeight: "700" },
});
