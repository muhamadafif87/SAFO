import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1a5c52';
const PRIMARY_LIGHT = '#e8f4f1';
const PRIMARY_DARK = '#123d37';
const WHITE = '#ffffff';
const GRAY_50 = '#f9fafb';
const GRAY_100 = '#f3f4f6';
const GRAY_200 = '#e5e7eb';
const GRAY_400 = '#9ca3af';
const GRAY_500 = '#6b7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';
const BG = '#f0f4f8';

interface NearbyLocation {
  id: string;
  name: string;
  address: string;
  distance: string;
}

// Mock nearby locations shown on map
const NEARBY_LOCATIONS: NearbyLocation[] = [
  { id: '1', name: 'Lokasi 1', address: 'Detail_lokasi_saat_ini_Lokasi_saat_ini', distance: '10 km' },
  { id: '2', name: 'Lokasi 1', address: 'Detail_lokasi_saat_ini_Lokasi_saat_ini', distance: '10 km' },
  { id: '3', name: 'Lokasi 1', address: 'Detail_lokasi_saat_ini_Lokasi_saat_ini', distance: '10 km' },
];

export default function PinpointLocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const locationName = params.locationName as string || 'Lokasi Baru';
  
  const [selectedLocation, setSelectedLocation] = useState<NearbyLocation | null>(
    NEARBY_LOCATIONS[0]
  );

  const handleConfirm = () => {
    if (selectedLocation) {
      // Save location and return to home
      router.back();
    }
  };

  const handleLocationSelect = (location: NearbyLocation) => {
    setSelectedLocation(location);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <TextInput 
          style={styles.headerTitle}
          defaultValue={locationName}
          placeholder="Nama lokasi"
          placeholderTextColor={GRAY_400}
        />
        <View style={{ width: 24 }} />
      </View>

      {/* Map Mock */}
      <View style={styles.mapContainer}>
        <Svg width="100%" height="100%" viewBox="0 0 400 300">
          {/* Background */}
          <rect width="400" height="300" fill="#e0e7ff" />
          
          {/* Mock map elements */}
          <path d="M 50 150 Q 200 50, 350 150" stroke="#60a5fa" strokeWidth="8" fill="none" />
          
          {/* Nearby location pins */}
          {NEARBY_LOCATIONS.map((loc, idx) => (
            <g key={loc.id}>
              <Circle cx={80 + idx * 120} cy={150 + (idx % 2 ? 40 : -40)} r="12" fill={selectedLocation?.id === loc.id ? PRIMARY : GRAY_200} />
            </g>
          ))}
          
          {/* Center marker */}
          <g>
            <Circle cx="200" cy="150" r="16" fill={PRIMARY} />
            <Circle cx="200" cy="150" r="12" fill={WHITE} />
            <Circle cx="200" cy="150" r="8" fill={PRIMARY} />
          </g>
        </Svg>
      </View>

      {/* Info Section */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Svg width="18" height="18" fill={PRIMARY} viewBox="0 0 16 16">
                <Path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
              </Svg>
            </View>
            <View>
              <Text style={styles.infoLabel}>Lokasi yang Dipilih</Text>
              <Text style={styles.infoValue}>{selectedLocation?.name}</Text>
              <Text style={styles.infoDetail}>{selectedLocation?.address}</Text>
            </View>
          </View>
        </View>

        {/* Nearby locations list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lokasi yang Disarankan</Text>
          <View style={styles.locationList}>
            {NEARBY_LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.locationOption,
                  selectedLocation?.id === loc.id && styles.locationOptionSelected,
                ]}
                onPress={() => handleLocationSelect(loc)}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <Svg width="16" height="16" fill={PRIMARY} viewBox="0 0 16 16">
                    <Path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
                  </Svg>
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionName}>{loc.name}</Text>
                  <Text style={styles.optionAddress} numberOfLines={1}>
                    {loc.address}
                  </Text>
                  <Text style={styles.optionDistance}>{loc.distance}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>Konfirmasi Lokasi Peta</Text>
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
    gap: 10,
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingBottom: 4,
  },
  mapContainer: {
    height: 200,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoBox: {
    backgroundColor: GRAY_50,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: GRAY_200,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: GRAY_500,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: GRAY_900,
    marginBottom: 2,
  },
  infoDetail: {
    fontSize: 12,
    color: GRAY_500,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GRAY_900,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  locationList: {
    gap: 8,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GRAY_50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: GRAY_200,
  },
  locationOptionSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  optionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 13,
    fontWeight: '700',
    color: GRAY_900,
    marginBottom: 2,
  },
  optionAddress: {
    fontSize: 11,
    color: GRAY_500,
    marginBottom: 2,
  },
  optionDistance: {
    fontSize: 10,
    color: GRAY_400,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    backgroundColor: WHITE,
  },
  confirmBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
});
