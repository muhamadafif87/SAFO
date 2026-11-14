import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BorderRadius,
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from "@/constants/typography";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types";

const ORDER_FILTERS = [
  { key: "all", label: "Semua", width: 67 },
  { key: "waiting", label: "Menunggu", width: 104 },
  { key: "accepted", label: "Terima", width: 77 },
  { key: "cancelled", label: "Batalkan", width: 59 },
] as const;

type OrderFilter = (typeof ORDER_FILTERS)[number]["key"];

function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case "pending_payment":
      return "Menunggu Pembayaran";
    case "paid":
      return "Menunggu Diproses";
    case "processing":
      return "Sedang Diproses";
    case "ready":
    case "ready_for_pickup":
      return "Siap Diambil";
    case "completed":
      return "Selesai";
    case "cancelled":
      return "Dibatalkan";
    case "expired":
      return "Kedaluwarsa";
    default:
      return "Status tidak dikenal";
  }
}

function getStatusTextColor(status: OrderStatus) {
  switch (status) {
    case "pending_payment":
    case "paid":
      return "#e2b640";
    case "ready":
    case "ready_for_pickup":
      return "#00615f";
    case "processing":
      return "#00615f";
    case "completed":
      return Colors.neutral[500];
    case "cancelled":
    case "expired":
      return "#bd4743";
    default:
      return Colors.neutral[500];
  }
}

function getOrderDateParts(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return { time: "-", date: "-" };
  }

  return {
    time: `${new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(date)} WIB`,
    date: new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date),
  };
}

export default function MitraOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setErrorMessage(null);
    try {
      setOrders(await orderService.getMitraOrders());
    } catch (error) {
      console.error("Gagal memuat pesanan mitra:", error);
      setErrorMessage("Gagal memuat pesanan. Coba lagi.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case "waiting":
        return orders.filter((order) => order.status === "paid");
      case "accepted":
        return orders.filter(
          (order) =>
            order.status === "processing" ||
            order.status === "ready" ||
            order.status === "ready_for_pickup" ||
            order.status === "completed",
        );
      case "cancelled":
        return orders.filter((order) => order.status === "cancelled");
      default:
        return orders;
    }
  }, [activeFilter, orders]);

  const updateOrderStatus = async (order: Order, status: OrderStatus) => {
    setUpdatingOrderId(order.id);
    try {
      const updatedOrder = await orderService.updateStatus(order.id, status);
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id ? updatedOrder : currentOrder,
        ),
      );
    } catch (error) {
      console.error("Gagal memperbarui status pesanan:", error);
      Alert.alert("Gagal", "Status pesanan tidak dapat diperbarui.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const confirmOrderAction = (order: Order, action: "accept" | "cancel") => {
    const isCancelling = action === "cancel";
    Alert.alert(
      isCancelling ? "Batalkan pesanan?" : "Terima pesanan?",
      isCancelling
        ? "Pesanan ini akan dibatalkan."
        : "Pesanan akan ditandai sedang diproses.",
      [
        { text: "Kembali", style: "cancel" },
        {
          text: isCancelling ? "Batalkan" : "Terima",
          style: isCancelling ? "destructive" : "default",
          onPress: () =>
            void updateOrderStatus(
              order,
              isCancelling ? "cancelled" : "processing",
            ),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Order }) => {
    const lineItems = item.orderItems ?? item.items ?? [];
    const firstItem = lineItems[0];
    const dateParts = getOrderDateParts(item.createdAt);
    const isUpdating = updatingOrderId === item.id;
    const productImage = firstItem?.product?.photoUrl
      ? { uri: firstItem.product.photoUrl }
      : require("../../../../assets/images/figma/mitra-order-food.png");

    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/(mitra)/orders/${item.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Detail pesanan ${item.id}`}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.orderId}>
              #{item.id.substring(0, 8).toUpperCase()}
            </Text>
            <Text
              style={[
                styles.statusText,
                { color: getStatusTextColor(item.status) },
              ]}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.productRow}>
            <Image
              source={productImage}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.productDetails}>
              <Text numberOfLines={1} style={styles.productName}>
                {firstItem?.product?.name ?? "Produk"}
                {lineItems.length > 1
                  ? ` + ${lineItems.length - 1} item lain`
                  : ""}
              </Text>
              <Text numberOfLines={1} style={styles.productQuantity}>
                {firstItem?.qty ?? 1} x Rp{" "}
                {Number(firstItem?.priceAtPurchase ?? 0).toLocaleString(
                  "id-ID",
                )}
              </Text>
            </View>
            <Text style={styles.totalAmount}>
              Rp {Number(item.totalAmount).toLocaleString("id-ID")}
            </Text>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.customerDetails}>
              <View style={styles.contactLine}>
                <Image
                  source={require("../../../../assets/images/figma/mitra-order-customer.png")}
                  style={styles.customerIcon}
                  resizeMode="contain"
                />
                <Text numberOfLines={1} style={styles.contactText}>
                  {item.customer?.name ?? "Pelanggan"}
                </Text>
              </View>
              <View style={styles.contactLine}>
                <Image
                  source={require("../../../../assets/images/figma/mitra-order-phone.png")}
                  style={styles.phoneIcon}
                  resizeMode="contain"
                />
                <Text numberOfLines={1} style={styles.contactText}>
                  {item.customer?.phone || "Nomor belum tersedia"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.chatPelangganBtn}
                onPress={() => router.push(`/(mitra)/chat/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel="Chat pelanggan"
              >
                <Text style={styles.chatPelangganText}>💬 Chat Pelanggan</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateDetails}>
              <Text style={styles.dateText}>{dateParts.time}</Text>
              <Text style={styles.dateText}>{dateParts.date}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {item.status === "paid" && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cancelButton,
                isUpdating && styles.disabledButton,
              ]}
              onPress={() => confirmOrderAction(item, "cancel")}
              disabled={updatingOrderId !== null}
              accessibilityRole="button"
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.neutral[0]} />
              ) : (
                <Text style={styles.actionText}>Batalkan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.acceptButton,
                isUpdating && styles.disabledButton,
              ]}
              onPress={() => confirmOrderAction(item, "accept")}
              disabled={updatingOrderId !== null}
              accessibilityRole="button"
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.neutral[0]} />
              ) : (
                <Text style={styles.actionText}>Terima Pesanan</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.navigate("/(mitra)")}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke beranda mitra"
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pesanan Masuk</Text>
      </View>

      <View style={styles.filters}>
        {ORDER_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                { width: filter.width },
                isActive && styles.activeFilterButton,
              ]}
              onPress={() => setActiveFilter(filter.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.filterText,
                  isActive && styles.activeFilterText,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContainer,
          filteredOrders.length === 0 && styles.emptyListContainer,
        ]}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void fetchOrders();
            }}
            tintColor="#00615f"
            colors={["#00615f"]}
          />
        }
        ListHeaderComponent={
          errorMessage && filteredOrders.length > 0 ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              size="small"
              color="#00615f"
              style={styles.loadingIndicator}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {errorMessage ?? "Belum ada pesanan."}
              </Text>
              {errorMessage && (
                <TouchableOpacity
                  onPress={() => {
                    setIsLoading(true);
                    void fetchOrders();
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryText}>Coba lagi</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  header: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 4,
  },
  backButton: {
    width: 32,
    height: 36,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backArrow: {
    color: "#00615f",
    fontSize: 30,
    lineHeight: 34,
    marginTop: -4,
  },
  headerTitle: {
    color: "#111111",
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semiBold,
  },
  filters: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    marginTop: 8,
    marginBottom: 10,
  },
  filterButton: {
    height: 34,
    borderRadius: 13,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilterButton: {
    backgroundColor: "#cee7e5",
  },
  filterText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: FontWeight.medium,
  },
  activeFilterText: {
    color: "#00615f",
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 2,
    paddingBottom: Spacing[4],
  },
  emptyListContainer: {
    justifyContent: "center",
  },
  cardSeparator: {
    height: 12,
  },
  card: {
    padding: 11,
    backgroundColor: Colors.neutral[0],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    minHeight: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderId: {
    color: "#111111",
    fontSize: 9,
    fontWeight: FontWeight.medium,
  },
  statusText: {
    fontSize: 9,
    fontWeight: FontWeight.semiBold,
  },
  divider: {
    height: 1,
    marginTop: 5,
    marginBottom: 5,
    backgroundColor: "#e5e5e5",
  },
  productRow: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
  },
  productImage: {
    width: 46,
    height: 47,
    borderRadius: 4,
    backgroundColor: Colors.neutral[100],
  },
  productDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
    marginRight: 4,
  },
  productName: {
    color: "#111111",
    fontSize: 13,
    fontWeight: FontWeight.semiBold,
  },
  productQuantity: {
    marginTop: 2,
    color: "#111111",
    fontSize: 10,
  },
  totalAmount: {
    color: "#111111",
    fontSize: 12,
    fontWeight: FontWeight.semiBold,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  customerDetails: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  contactLine: {
    height: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  customerIcon: {
    width: 11,
    height: 13,
    marginRight: 6,
  },
  phoneIcon: {
    width: 14,
    height: 13,
    marginRight: 6,
  },
  contactText: {
    flexShrink: 1,
    color: "#111111",
    fontSize: 9,
  },
  dateDetails: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  dateText: {
    color: "#111111",
    fontSize: 9,
    lineHeight: 13,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    height: 29,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
  },
  cancelButton: {
    backgroundColor: "#bd4743",
  },
  acceptButton: {
    backgroundColor: "#00615f",
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionText: {
    color: Colors.neutral[0],
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
  },
  loadingIndicator: {
    padding: Spacing[8],
  },
  emptyContainer: {
    alignItems: "center",
    padding: Spacing[8],
  },
  emptyText: {
    color: Colors.neutral[500],
    fontSize: FontSize.md,
    textAlign: "center",
  },
  errorText: {
    marginBottom: 10,
    color: "#bd4743",
    fontSize: FontSize.sm,
  },
  retryText: {
    marginTop: Spacing[2],
    color: "#00615f",
    fontWeight: FontWeight.semiBold,
  },
  chatPelangganBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#CEE7E5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  chatPelangganText: {
    color: "#00615F",
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
});
