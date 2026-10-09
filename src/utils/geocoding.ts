/**
 * geocoding.ts — Utilitas Mapbox Geocoding API
 * ──────────────────────────────────────────────
 * Menyediakan dua fungsi utama:
 *  - reverseGeocodeMapbox: koordinat → nama tempat / jalan / POI (lebih kaya
 *    dibanding expo-location.reverseGeocodeAsync yang hanya street/district)
 *  - getNearbyPlaces: koordinat → daftar POI/alamat dalam radius tertentu
 *
 * Token diambil dari env variable EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN yang sudah
 * ada di project (dipakai juga oleh @rnmapbox/maps).
 */

import type { NearbyPlace } from '@/types';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const GEOCODE_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// ─── Type internal response Mapbox ───────────────────────────────────────────

interface MapboxFeature {
  id: string;
  place_name: string;  // teks lengkap, mis. "Universitas Sebelas Maret, Surakarta..."
  text: string;        // nama pendek, mis. "Universitas Sebelas Maret"
  place_type: string[];
  center: [number, number]; // [longitude, latitude]
  geometry: { coordinates: [number, number] };
  properties?: { distance?: number };
  relevance?: number;
}

interface MapboxGeocodeResponse {
  features: MapboxFeature[];
}

// ─── Haversine (untuk kalkulasi jarak di sisi client) ────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Reverse Geocode ─────────────────────────────────────────────────────────

export interface GeocodeResult {
  /** Nama POI / jalan — ditampilkan di header lokasi */
  shortName: string;
  /** Teks lengkap — disimpan ke SavedAddress.addressDetail */
  fullAddress: string;
}

/**
 * Mengubah koordinat GPS menjadi nama tempat yang informatif.
 * Menggunakan Mapbox Geocoding API yang mengembalikan nama POI (gedung,
 * landmark, warung) — lebih kaya dari expo-location yang hanya mengembalikan
 * street/district.
 *
 * Urutan prioritas hasil:
 *  1. POI (mis. "Universitas Sebelas Maret")
 *  2. Address (mis. "Jl. Ir. Sutami No. 36A")
 *  3. Place / Neighborhood
 *  4. Fallback "Lokasi Anda"
 */
export async function reverseGeocodeMapbox(
  lat: number,
  lng: number,
): Promise<GeocodeResult> {
  if (!MAPBOX_TOKEN) {
    return { shortName: 'Lokasi Anda', fullAddress: 'Lokasi Anda' };
  }

  try {
    const url = new URL(`${GEOCODE_BASE}/${lng},${lat}.json`);
    url.searchParams.set('access_token', MAPBOX_TOKEN);
    url.searchParams.set('language', 'id');
    url.searchParams.set('types', 'poi,address,neighborhood,place');

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Mapbox HTTP ${res.status}: ${errText}`);
    }

    const data: MapboxGeocodeResponse = await res.json();
    const features = data.features ?? [];
    if (!features.length) return { shortName: 'Lokasi Anda', fullAddress: 'Lokasi Anda' };

    // Pilih feature pertama (Mapbox sudah mengurutkan berdasarkan relevansi)
    const best = features[0];
    return {
      shortName: best.text || best.place_name.split(',')[0].trim(),
      fullAddress: best.place_name,
    };
  } catch (err) {
    console.warn('[geocoding] reverseGeocodeMapbox error:', err);
    return { shortName: 'Lokasi Anda', fullAddress: 'Lokasi Anda' };
  }
}

// ─── Nearby Places ───────────────────────────────────────────────────────────

/**
 * Mengambil daftar POI/alamat terdekat dalam radius tertentu.
 * Dipakai untuk section "Saran Lokasi Terdekat" di location-picker.
 *
 * @param lat       Latitude pusat pencarian
 * @param lng       Longitude pusat pencarian
 * @param radiusKm  Radius pencarian dalam km (default: 2km sesuai keputusan desain)
 * @param limit     Jumlah hasil (default: 5)
 */
export async function getNearbyPlaces(
  lat: number,
  lng: number,
  radiusKm = 2,
  limit = 5,
): Promise<NearbyPlace[]> {
  if (!MAPBOX_TOKEN) return [];

  try {
    // Mapbox menggunakan "proximity" untuk bias hasil ke koordinat tertentu
    // dan "bbox" untuk batasi radius pencarian (approx: 1km ≈ 0.009 derajat)
    const delta = radiusKm * 0.009;
    const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(',');

    const url = new URL(`${GEOCODE_BASE}/${lng},${lat}.json`);
    url.searchParams.set('access_token', MAPBOX_TOKEN);
    url.searchParams.set('language', 'id');
    url.searchParams.set('types', 'poi,address');
    url.searchParams.set('proximity', `${lng},${lat}`);
    url.searchParams.set('bbox', bbox);
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Mapbox HTTP ${res.status}`);

    const data: MapboxGeocodeResponse = await res.json();

    return (data.features ?? []).map((f): NearbyPlace => {
      const [fLng, fLat] = f.center;
      return {
        id: f.id,
        name: f.text || f.place_name.split(',')[0].trim(),
        fullAddress: f.place_name,
        latitude: fLat,
        longitude: fLng,
        distanceKm: parseFloat(haversineKm(lat, lng, fLat, fLng).toFixed(2)),
        placeType: f.place_type[0] ?? 'place',
      };
    });
  } catch (err) {
    console.warn('[geocoding] getNearbyPlaces error:', err);
    return [];
  }
}

// ─── Search Locations ─────────────────────────────────────────────────────────

/**
 * Mencari lokasi berdasarkan teks (untuk search bar di location-picker).
 * Mengembalikan daftar hasil pencarian dari seluruh wilayah Indonesia,
 * dengan bias ke koordinat user saat ini.
 */
export async function searchLocations(
  query: string,
  userLat: number,
  userLng: number,
  limit = 5,
): Promise<NearbyPlace[]> {
  if (!MAPBOX_TOKEN || !query.trim()) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    const url = new URL(`${GEOCODE_BASE}/${encoded}.json`);
    url.searchParams.set('access_token', MAPBOX_TOKEN);
    url.searchParams.set('language', 'id');
    url.searchParams.set('country', 'ID');
    url.searchParams.set('proximity', `${userLng},${userLat}`);
    url.searchParams.set('types', 'poi,address,place,neighborhood');
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Mapbox HTTP ${res.status}`);

    const data: MapboxGeocodeResponse = await res.json();

    return (data.features ?? []).map((f): NearbyPlace => {
      const [fLng, fLat] = f.center;
      return {
        id: f.id,
        name: f.text || f.place_name.split(',')[0].trim(),
        fullAddress: f.place_name,
        latitude: fLat,
        longitude: fLng,
        distanceKm: parseFloat(haversineKm(userLat, userLng, fLat, fLng).toFixed(2)),
        placeType: f.place_type[0] ?? 'place',
      };
    });
  } catch (err) {
    console.warn('[geocoding] searchLocations error:', err);
    return [];
  }
}
