/**
 * location.store.ts — Zustand store untuk manajemen lokasi aktif & alamat tersimpan
 * ──────────────────────────────────────────────────────────────────────────────────
 * Fitur:
 *  - Menyimpan lokasi aktif (koordinat + label alamat) ke SecureStore
 *    agar tidak perlu deteksi GPS ulang saat app di-restart
 *  - CRUD untuk saved addresses (sinkron ke backend /api/addresses)
 *  - Status loading terpisah untuk lokasi vs. daftar alamat
 */

import { addressService } from '@/services/address.service';
import type { ActiveLocation, NearbyPlace, SavedAddress } from '@/types';
import { storage } from '@/utils/storage';
import { create } from 'zustand';

// ─── Storage key ──────────────────────────────────────────────────────────────

const ACTIVE_LOCATION_KEY = 'safo_active_location';

// ─── Store interface ──────────────────────────────────────────────────────────

interface LocationState {
  // Lokasi aktif saat ini (digunakan untuk pencarian produk)
  activeLocation: ActiveLocation | null;
  isLocationReady: boolean;

  // Daftar alamat tersimpan milik user
  savedAddresses: SavedAddress[];
  isLoadingAddresses: boolean;
  addressError: string | null;

  // Saran lokasi terdekat (dari Mapbox, tidak disimpan ke DB)
  nearbyPlaces: NearbyPlace[];
  isLoadingNearby: boolean;
}

interface LocationActions {
  // ── Lokasi aktif ────────────────────────────────────────────────────────────
  /** Set lokasi aktif dan simpan ke SecureStore untuk persistensi */
  setActiveLocation: (location: ActiveLocation) => Promise<void>;
  /** Restore lokasi aktif dari SecureStore saat app dibuka */
  restoreLocation: () => Promise<void>;
  /** Hapus lokasi aktif (misalnya saat logout) */
  clearLocation: () => Promise<void>;

  // ── Saved Addresses ─────────────────────────────────────────────────────────
  /** Ambil semua alamat tersimpan dari backend */
  fetchAddresses: (lat?: number, lng?: number) => Promise<void>;
  /** Simpan alamat baru */
  addAddress: (data: Parameters<typeof addressService.create>[0]) => Promise<SavedAddress>;
  /** Update alamat */
  updateAddress: (id: string, data: Parameters<typeof addressService.update>[1]) => Promise<void>;
  /** Jadikan alamat ini sebagai primary, update state lokal secara optimistic */
  setPrimaryAddress: (id: string) => Promise<void>;
  /** Hapus alamat */
  removeAddress: (id: string) => Promise<void>;
  /** Pilih alamat tersimpan sebagai lokasi aktif */
  selectSavedAddress: (address: SavedAddress) => Promise<void>;

  // ── Nearby Places ────────────────────────────────────────────────────────────
  setNearbyPlaces: (places: NearbyPlace[]) => void;
  setLoadingNearby: (loading: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLocationStore = create<LocationState & LocationActions>((set, get) => ({
  // ── State default ────────────────────────────────────────────────────────────
  activeLocation: null,
  isLocationReady: false,
  savedAddresses: [],
  isLoadingAddresses: false,
  addressError: null,
  nearbyPlaces: [],
  isLoadingNearby: false,

  // ── Lokasi Aktif ─────────────────────────────────────────────────────────────

  setActiveLocation: async (location) => {
    set({ activeLocation: location, isLocationReady: true });
    // Persist ke SecureStore (overwrite existing)
    try {
      await storage.setItemAsync(ACTIVE_LOCATION_KEY, JSON.stringify(location));
    } catch (e) {
      console.warn('[locationStore] gagal menyimpan lokasi ke storage:', e);
    }
  },

  restoreLocation: async () => {
    try {
      const raw = await storage.getItemAsync(ACTIVE_LOCATION_KEY);
      if (raw) {
        const location: ActiveLocation = JSON.parse(raw);
        set({ activeLocation: location, isLocationReady: true });
      }
    } catch (e) {
      console.warn('[locationStore] gagal restore lokasi:', e);
    }
  },

  clearLocation: async () => {
    try {
      await storage.deleteItemAsync(ACTIVE_LOCATION_KEY);
    } catch {}
    set({ activeLocation: null, isLocationReady: false });
  },

  // ── Saved Addresses ───────────────────────────────────────────────────────────

  fetchAddresses: async (lat, lng) => {
    set({ isLoadingAddresses: true, addressError: null });
    try {
      const addresses = await addressService.getAll(lat, lng);
      set({ savedAddresses: addresses, isLoadingAddresses: false });
    } catch (err: any) {
      set({
        isLoadingAddresses: false,
        addressError: err?.message ?? 'Gagal memuat alamat',
      });
    }
  },

  addAddress: async (data) => {
    const newAddress = await addressService.create(data);
    set((state) => {
      const updated = data.isPrimary
        ? state.savedAddresses.map((a) => ({ ...a, isPrimary: false }))
        : [...state.savedAddresses];
      return { savedAddresses: [newAddress, ...updated] };
    });
    return newAddress;
  },

  updateAddress: async (id, data) => {
    const updated = await addressService.update(id, data);
    set((state) => ({
      savedAddresses: state.savedAddresses.map((a) =>
        a.id === id ? { ...a, ...updated } : a,
      ),
    }));
  },

  setPrimaryAddress: async (id) => {
    // Optimistic update — tampilkan perubahan langsung tanpa menunggu server
    set((state) => ({
      savedAddresses: state.savedAddresses.map((a) => ({
        ...a,
        isPrimary: a.id === id,
      })),
    }));
    try {
      await addressService.setPrimary(id);
    } catch (err) {
      // Rollback jika server gagal
      console.warn('[locationStore] setPrimary server error, rollback:', err);
      await get().fetchAddresses();
    }
  },

  removeAddress: async (id) => {
    // Optimistic remove
    const prev = get().savedAddresses;
    set((state) => ({
      savedAddresses: state.savedAddresses.filter((a) => a.id !== id),
    }));
    try {
      await addressService.remove(id);
    } catch (err) {
      // Rollback
      console.warn('[locationStore] remove server error, rollback:', err);
      set({ savedAddresses: prev });
    }
  },

  selectSavedAddress: async (address) => {
    const location: ActiveLocation = {
      lat: address.latitude,
      lng: address.longitude,
      address: address.label,
      fullAddress: address.addressDetail,
    };
    await get().setActiveLocation(location);
  },

  // ── Nearby Places ─────────────────────────────────────────────────────────────

  setNearbyPlaces: (places) => set({ nearbyPlaces: places }),
  setLoadingNearby: (loading) => set({ isLoadingNearby: loading }),
}));
