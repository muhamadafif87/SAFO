import { Colors, FontSize, FontWeight, Spacing } from "@/constants/typography";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type OrdersTab = "all" | "history";

const HISTORY_STATUSES: OrderStatus[] = ["completed", "cancelled", "expired"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Menunggu Pembayaran",
  paid: "Menunggu Diproses",
  ready: "Siap Diambil",
  ready_for_pickup: "Siap Diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function CustomerOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<OrdersTab>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await orderService.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Gagal memuat pesanan", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const visibleOrders = orders.filter((order) => {
    const isHistory = HISTORY_STATUSES.includes(order.status);
    return activeTab === "history" ? isHistory : !isHistory;
  });

  const openOrder = (id: string) => router.push(`/(customer)/orders/${id}`);

  const renderItem = ({ item }: { item: Order }) => {
    const items = item.items || item.orderItems || [];
    const firstItem = items[0];
    const product = firstItem?.product;
    const quantity = items.reduce(
      (total, orderItem) => total + (orderItem.qty ?? orderItem.quantity ?? 1),
      0,
    );
    const isHistory = HISTORY_STATUSES.includes(item.status);

    return (
      <View style={styles.orderCard}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Buka detail pesanan ${item.mitra?.businessName || "warung"}`}
          activeOpacity={0.82}
          onPress={() => openOrder(item.id)}
        >
          <View style={styles.cardTopline}>
            <Text numberOfLines={1} style={styles.mitraName}>
              {item.mitra?.businessName || "Warung SAFO"}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.statusText, statusStyles[item.status]]}
            >
              {STATUS_LABEL[item.status]}
            </Text>
          </View>

          <View style={styles.productRow}>
            {product?.photoUrl ? (
              <Image
                source={{ uri: product.photoUrl }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.productImage, styles.imagePlaceholder]}>
                <Text style={styles.placeholderIcon}>🍱</Text>
              </View>
            )}
            <View style={styles.productInfo}>
              <Text numberOfLines={2} style={styles.productName}>
                {product?.name || "Paket makanan surplus"}
              </Text>
              <Text style={styles.productMeta}>
                {items.length > 1 ? `+${items.length - 1} produk · ` : ""}
                {quantity} x
                {firstItem
                  ? ` Rp ${Number(firstItem.priceAtPurchase).toLocaleString("id-ID")}`
                  : ""}
              </Text>
            </View>
            <Text style={styles.totalAmount}>
              Rp {Number(item.totalAmount).toLocaleString("id-ID")}
            </Text>
          </View>

          <View style={styles.metadata}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Waktu Pesanan</Text>
              <Text style={styles.metadataValue}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>No. Pesanan</Text>
              <Text numberOfLines={1} style={styles.metadataValue}>
                #{item.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          {isHistory && firstItem?.productId ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => router.push(`/(customer)/products/${firstItem.productId}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Pesan Lagi</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={() => openOrder(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {isHistory ? "Detail Pesanan" : "Lihat Pesanan"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pesanan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        {([
          ["all", "Semua"],
          ["history", "Riwayat"],
        ] as const).map(([tab, label]) => (
          <TouchableOpacity
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary[700]} style={styles.loader} />
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            visibleOrders.length === 0 && styles.emptyList,
          ]}
          refreshing={refreshing}
          onRefresh={() => fetchOrders(true)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{activeTab === "all" ? "🛍️" : "📋"}</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === "all" ? "Belum ada pesanan aktif" : "Riwayat masih kosong"}
              </Text>
              <Text style={styles.emptyDescription}>
                Pesananmu akan muncul di sini setelah checkout.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const statusStyles = StyleSheet.create({
  pending_payment: { color: "#b7791f" },
  paid: { color: "#b7791f" },
  ready: { color: "#087f72" },
  ready_for_pickup: { color: "#087f72" },
  completed: { color: "#087f72" },
  cancelled: { color: "#d14343" },
  expired: { color: "#777777" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
  },
  backButton: { width: 32, height: 40, justifyContent: "center" },
  backIcon: { color: "#087f72", fontSize: 34, lineHeight: 38 },
  title: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: "#171717",
    marginLeft: Spacing[2],
  },
  headerSpacer: { width: 32 },
  tabs: {
    flexDirection: "row",
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[4],
  },
  tab: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f1f2f2",
  },
  activeTab: { backgroundColor: "#cce9e5" },
  tabText: { color: "#626767", fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  activeTabText: { color: "#087f72", fontWeight: FontWeight.bold },
  list: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  orderCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e7e7",
    borderWidth: 1,
    borderRadius: 9,
    marginBottom: Spacing[3],
    padding: Spacing[2],
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTopline: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eff0f0",
    marginBottom: Spacing[2],
    paddingBottom: Spacing[1],
  },
  mitraName: {
    flex: 1,
    color: "#252828",
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginRight: Spacing[2],
  },
  statusText: { fontSize: 10, fontWeight: FontWeight.medium, maxWidth: "48%" },
  productRow: { flexDirection: "row", alignItems: "center", minHeight: 58, gap: Spacing[2] },
  productImage: { width: 48, height: 48, borderRadius: 6, backgroundColor: "#f2f3f1" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  placeholderIcon: { fontSize: 25 },
  productInfo: { flex: 1, justifyContent: "center" },
  productName: { color: "#171a1a", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  productMeta: { color: "#555b5a", fontSize: 10, marginTop: 2 },
  totalAmount: {
    color: "#171a1a",
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textAlign: "right",
    maxWidth: 92,
  },
  metadata: { borderTopWidth: 1, borderTopColor: "#eff0f0", marginTop: Spacing[2], paddingTop: 5 },
  metadataRow: {
    minHeight: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing[2],
  },
  metadataLabel: { color: "#454b4a", fontSize: 10 },
  metadataValue: { color: "#454b4a", fontSize: 10, textAlign: "right", flexShrink: 1 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing[2], marginTop: Spacing[2] },
  primaryButton: {
    minHeight: 34,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#087f72",
    borderRadius: 5,
    paddingHorizontal: Spacing[3],
  },
  primaryButtonText: { color: "#ffffff", fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  secondaryButton: {
    minHeight: 34,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#087f72",
    borderRadius: 5,
    paddingHorizontal: Spacing[2],
  },
  secondaryButtonText: { color: "#087f72", fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  loader: { marginTop: Spacing[10] },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  emptyState: { alignItems: "center", paddingHorizontal: Spacing[5], paddingBottom: Spacing[10] },
  emptyIcon: { fontSize: 38, marginBottom: Spacing[3] },
  emptyTitle: { color: "#252828", fontSize: FontSize.md, fontWeight: FontWeight.bold },
  emptyDescription: {
    color: Colors.neutral[500],
    fontSize: FontSize.sm,
    lineHeight: 19,
    textAlign: "center",
    marginTop: Spacing[1],
  },
});
