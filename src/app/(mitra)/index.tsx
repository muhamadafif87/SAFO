import { MitraStockDashboard } from "../index";
import { productService } from "@/services/product.service";
import { useAuthStore } from "@/stores/auth.store";
import type { Product } from "@/types";
import { useCallback, useEffect, useState } from "react";

export default function MitraHome() {
  const mitra = useAuthStore((state) => state.mitra);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await productService.getMitraProducts();
      setProducts(data);
    } catch (error) {
      setLoadError("Gagal memuat stok produk. Coba tarik layar untuk memuat ulang.");
      console.warn("[MitraHome] Gagal mengambil stok produk:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void fetchProducts();
  };

  return (
    <MitraStockDashboard
      businessName={mitra?.businessName || "Warung Anda"}
      products={products}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      loadError={loadError}
      onRefresh={handleRefresh}
      showBottomNavigation={false}
    />
  );
}
