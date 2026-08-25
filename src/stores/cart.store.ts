/**
 * SAFO — Cart Store (Zustand)
 * Cart hanya boleh berisi produk dari 1 mitra pada satu waktu.
 * Jika customer mencoba tambah produk dari mitra berbeda, perlu konfirmasi reset cart.
 */

import { create } from 'zustand';
import type { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  mitraId: string | null;
  mitraName: string | null;
}

interface CartActions {
  /** Tambah produk ke cart. Return false jika mitra berbeda (perlu konfirmasi). */
  addItem: (product: Product, qty: number) => 'added' | 'updated' | 'mitra_conflict';
  /** Force-add setelah user konfirmasi ganti mitra (clear old cart). */
  forceAddItem: (product: Product, qty: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQty: (productId: string) => number;
}

const PLATFORM_FEE_PER_ORDER = 1000; // Rp 1.000 — sesuai SRS §14

export const useCartStore = create<CartState & CartActions>((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────
  items: [],
  mitraId: null,
  mitraName: null,

  // ── Actions ───────────────────────────────────────────────────────────

  addItem: (product, qty) => {
    const { mitraId, items } = get();

    // Cek konflik mitra
    if (mitraId && mitraId !== product.mitraId) {
      return 'mitra_conflict';
    }

    const existing = items.find((i) => i.product.id === product.id);

    if (existing) {
      // Update qty (capped at stock)
      set({
        items: items.map((i) =>
          i.product.id === product.id
            ? { ...i, qty: Math.min(product.stock, i.qty + qty) }
            : i
        ),
      });
      return 'updated';
    }

    // Tambah item baru
    set({
      items: [...items, { product, qty: Math.min(product.stock, qty) }],
      mitraId: product.mitraId,
      mitraName: product.mitra?.businessName ?? null,
    });
    return 'added';
  },

  forceAddItem: (product, qty) => {
    set({
      items: [{ product, qty: Math.min(product.stock, qty) }],
      mitraId: product.mitraId,
      mitraName: product.mitra?.businessName ?? null,
    });
  },

  removeItem: (productId) => {
    const items = get().items.filter((i) => i.product.id !== productId);
    set({
      items,
      mitraId: items.length === 0 ? null : get().mitraId,
      mitraName: items.length === 0 ? null : get().mitraName,
    });
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.product.id === productId
          ? { ...i, qty: Math.min(i.product.stock, qty) }
          : i
      ),
    });
  },

  clearCart: () => set({ items: [], mitraId: null, mitraName: null }),

  getTotalItems: () =>
    get().items.reduce((sum, i) => sum + i.qty, 0),

  getTotalPrice: () => {
    const subtotal = get().items.reduce(
      (sum, i) => sum + Number(i.product.discountPrice) * i.qty,
      0
    );
    return subtotal + PLATFORM_FEE_PER_ORDER;
  },

  getItemQty: (productId) =>
    get().items.find((i) => i.product.id === productId)?.qty ?? 0,
}));

export const PLATFORM_FEE = PLATFORM_FEE_PER_ORDER;
