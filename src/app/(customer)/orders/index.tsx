import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

type OrdersTab = "all" | "history";

const HISTORY_STATUSES: OrderStatus[] = ["completed", "cancelled", "expired"];

const PRIMARY = "#00615F";
const PRIMARY_LIGHT = "#CEE7E5";
const INACTIVE_TAB_BG = "#F1F1F1";
const WHITE = "#FFFFFF";
const TEXT_BLACK = "#000000";
const DIVIDER = "#EAEAEA";
const STATUS_WARNING = "#E2B640";
const STATUS_DANGER = "#EF4444";
const GRAY_400 = "#9CA3AF";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Menunggu Pembayaran",
  paid: "Menunggu Diproses",
  processing: "Sedang Diproses",
  accepted: "Diterima",
  ready: "Siap Diambil",
  ready_for_pickup: "Siap Diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = date.getDate();
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours} : ${minutes}`;
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
      (total, orderItem) =>
        total + (orderItem.qty ?? (orderItem as any).quantity ?? 1),
      0,
    );
    const isHistory = HISTORY_STATUSES.includes(item.status);

    return (
      <View style={styles.orderCard}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Buka detail pesanan ${item.mitra?.businessName || "warung"}`}
          activeOpacity={0.85}
          onPress={() => openOrder(item.id)}
        >
          {/* Card Topline: Mitra Name & Status */}
          <View style={styles.cardTopline}>
            <Text numberOfLines={1} style={styles.mitraName}>
              {item.mitra?.businessName || "Geprek Kumlot"}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.statusText, statusStyles[item.status]]}
            >
              {STATUS_LABEL[item.status]}
            </Text>
          </View>

          {/* Divider under Topline */}
          <View style={styles.cardDivider} />

          {/* Product Row */}
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
              <Text numberOfLines={1} style={styles.productName}>
                {product?.name || "Paket Makanan"}
              </Text>
              <Text style={styles.productMeta}>
                {items.length > 1 ? `+${items.length - 1} produk · ` : ""}
                {quantity} X Rp{" "}
                {Number(
                  firstItem?.priceAtPurchase ?? item.totalAmount / (quantity || 1),
                ).toLocaleString("id-ID")}
              </Text>
            </View>

            <Text style={styles.totalAmount}>
              Rp {Number(item.totalAmount).toLocaleString("id-ID")}
            </Text>
          </View>

          {/* Metadata Rows */}
          <View style={styles.metadata}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Waktu Pemesanan</Text>
              <Text style={styles.metadataValue}>
                {formatDate(item.createdAt)}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Waktu Pembayaran</Text>
              <Text style={styles.metadataValue}>
                {formatDate(item.createdAt)}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>No. Pesanan</Text>
              <Text numberOfLines={1} style={styles.metadataValue}>
                #WBW-{item.id.slice(0, 6).toUpperCase()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Button */}
        <View style={styles.actions}>
          {isHistory && firstItem?.productId ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() =>
                router.push(`/(customer)/products/${firstItem.productId}`)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Pesan Lagi</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={() => {
              if (isHistory) {
                openOrder(item.id);
              } else {
                router.push(`/(customer)/chat/${item.id}`);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {isHistory ? "Detail Pesanan" : "Hubungi Warung"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19L8 12L15 5"
              stroke={PRIMARY}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>Pesanan</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs (Semua / Riwayat) */}
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
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={PRIMARY}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            visibleOrders.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => fetchOrders(true)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>
                {activeTab === "all" ? "🛍️" : "📋"}
              </Text>
              <Text style={styles.emptyTitle}>
                {activeTab === "all"
                  ? "Belum ada pesanan aktif"
                  : "Riwayat masih kosong"}
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
  pending_payment: { color: Colors.warning },
  paid: { color: Colors.warning },
  accepted: { color: Colors.primary[600] },
  ready: { color: Colors.primary[600] },
  ready_for_pickup: { color: Colors.primary[600] },
  completed: { color: Colors.primary[600] },
  cancelled: { color: Colors.error },
  expired: { color: Colors.neutral[500] },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 4,
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_BLACK,
    marginLeft: 12,
    letterSpacing: -0.4,
  },
  headerSpacer: {
    width: 28,
  },
  tabs: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: INACTIVE_TAB_BG,
  },
  activeTab: {
    backgroundColor: PRIMARY_LIGHT,
  },
  tabText: {
    color: TEXT_BLACK,
    fontSize: 13,
    fontWeight: "500",
  },
  activeTabText: {
    color: PRIMARY,
    fontWeight: "500",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: WHITE,
    borderColor: "#EAEAEA",
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  mitraName: {
    flex: 1,
    color: TEXT_BLACK,
    fontSize: 11,
    fontWeight: "500",
    marginRight: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
    maxWidth: "50%",
  },
  cardDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginBottom: 10,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  productImage: {
    width: 46,
    height: 47,
    borderRadius: 4,
    backgroundColor: "#F3F3F3",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: 22,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    color: TEXT_BLACK,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  productMeta: {
    color: TEXT_BLACK,
    fontSize: 10,
    fontWeight: "400",
  },
  totalAmount: {
    color: TEXT_BLACK,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  metadata: {
    marginTop: 4,
    gap: 3,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metadataLabel: {
    color: TEXT_BLACK,
    fontSize: 9,
    fontWeight: "400",
  },
  metadataValue: {
    color: TEXT_BLACK,
    fontSize: 9,
    fontWeight: "400",
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  primaryButton: {
    flex: 1,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderRadius: 5,
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 5,
    backgroundColor: WHITE,
  },
  secondaryButtonText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "600",
  },
  loader: {
    marginTop: 40,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 12,
  },
  emptyTitle: {
    color: TEXT_BLACK,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyDescription: {
    color: GRAY_400,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },
});
