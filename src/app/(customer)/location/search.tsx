import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
const BG_LIGHT = '#f0f4f8';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  distance: string;
}

// Mock search results
const SEARCH_RESULTS: SearchResult[] = [
  { id: '1', name: 'Lokasi 1', address: 'Detail_lokasi_saat_ini_Lokasi_saat_ini', distance: '10 km' },
  { id: '2', name: 'Lokasi 1', address: 'Detail_lokasi_saat_ini_Lokasi_saat_ini', distance: '10 km' },
  { id: '3', name: 'Lokasi 1', address: 'Detail_lokasi_saat_ini_Lokasi_saat_ini', distance: '10 km' },
];

export default function SearchLocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialQuery = params.query as string || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>(SEARCH_RESULTS);

  const handleLocationSelect = (location: SearchResult) => {
    // Navigate to pinpoint screen with selected location
    router.push({
      pathname: '/(customer)/location/pinpoint',
      params: { locationId: location.id, locationName: location.name },
    });
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    // In real app, would trigger search API
  };

  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleLocationSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultIcon}>
        <Svg width="18" height="18" fill={PRIMARY} viewBox="0 0 16 16">
          <Path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
        </Svg>
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <Text style={styles.resultDistance}>{item.distance}</Text>
      </View>
      <Text style={styles.resultArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari lokasi"
            placeholderTextColor={GRAY_400}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderResultItem}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Tidak ada hasil</Text>
            <Text style={styles.emptySubtext}>Coba kata kunci lain</Text>
          </View>
        }
      />
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: GRAY_900,
  },
  clearIcon: {
    fontSize: 12,
    color: GRAY_500,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: GRAY_50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GRAY_200,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: GRAY_900,
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 12,
    color: GRAY_500,
    marginBottom: 2,
  },
  resultDistance: {
    fontSize: 11,
    color: GRAY_400,
  },
  resultArrow: {
    fontSize: 16,
    color: GRAY_400,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GRAY_700,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: GRAY_500,
  },
});
