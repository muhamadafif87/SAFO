import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
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

// Mock saved locations
const SAVED_LOCATIONS = [
  {
    id: '1',
    name: 'Rumah',
    address: 'Jl. Kartika, Jebres, Surakarta',
    distance: '0.5 km',
  },
  {
    id: '2',
    name: 'Kantor',
    address: 'Jl. Slamet Riyadi, Laweyan, Surakarta',
    distance: '2.3 km',
  },
];

// Suggested nearby locations
const NEARBY_SUGGESTIONS = [
  { id: 's1', name: 'Lokasi 1', address: 'Detail_lokasi_saat_ini', distance: '10 km' },
  { id: 's2', name: 'Lokasi 2', address: 'Detail_lokasi_saat_ini', distance: '10 km' },
  { id: 's3', name: 'Lokasi 3', address: 'Detail_lokasi_saat_ini', distance: '10 km' },
];

interface LocationItem {
  id: string;
  name: string;
  address: string;
  distance: string;
}

export default function LocationScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLocationSelect = (location: LocationItem) => {
    // Return to home with selected location
    router.back();
  };

  const handleAddNewLocation = () => {
    router.push('/(customer)/location/add');
  };

  const handleSearchLocation = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/(customer)/location/search',
        params: { query: searchQuery },
      });
    }
  };

  const renderLocationItem = (item: LocationItem, isSaved: boolean = false) => (
    <TouchableOpacity
      key={item.id}
      style={styles.locationItem}
      onPress={() => handleLocationSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.locationIcon}>
        <Svg width="18" height="18" fill={PRIMARY} viewBox="0 0 16 16">
          <Path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
        </Svg>
      </View>
      <View style={styles.locationContent}>
        <Text style={styles.locationName}>{item.name}</Text>
        <Text style={styles.locationAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <Text style={styles.locationDistance}>{item.distance}</Text>
      </View>
      {isSaved && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            Alert.alert('Edit', 'Edit location feature coming soon');
          }}
        >
          <Text style={styles.editIcon}>✎</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pilih Lokasi</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Input */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Cari lokasi"
              placeholderTextColor={GRAY_400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearchLocation}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Saved Locations */}
        {SAVED_LOCATIONS.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Alamat Saya</Text>
              <TouchableOpacity onPress={handleAddNewLocation} activeOpacity={0.7}>
                <Text style={styles.addNewBtn}>+ Tambah Alamat Baru</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.locationList}>
              {SAVED_LOCATIONS.map((loc) => renderLocationItem(loc, true))}
            </View>
          </View>
        )}

        {/* Nearby Suggestions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saran Lokasi Terdekat</Text>
          <View style={styles.locationList}>
            {NEARBY_SUGGESTIONS.map((loc) => renderLocationItem(loc, false))}
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: PRIMARY_DARK,
  },
  backIcon: {
    fontSize: 20,
    color: WHITE,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHITE,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchSection: {
    paddingVertical: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GRAY_100,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: GRAY_900,
  },
  clearIcon: {
    fontSize: 14,
    color: GRAY_500,
    fontWeight: '700',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GRAY_900,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addNewBtn: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
  },
  locationList: {
    gap: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GRAY_50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: GRAY_200,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationContent: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '700',
    color: GRAY_900,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 12,
    color: GRAY_500,
    marginBottom: 2,
  },
  locationDistance: {
    fontSize: 11,
    color: GRAY_400,
  },
  editBtn: {
    padding: 8,
  },
  editIcon: {
    fontSize: 16,
    color: GRAY_500,
  },
});
