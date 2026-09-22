import { Button } from "@/components/ui/Button";
import {
    BorderRadius,
    Colors,
    FontSize,
    FontWeight,
    Spacing,
} from "@/constants/typography";
import { Order } from "@/types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function AdminTransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Order[]>([]);

  useEffect(() => {
    // Mock fetch all transactions
    setTransactions([
      {
        id: "o1",
        customerId: "c1",
        mitraId: "m1",
        pickupCode: "A3B7",
        totalAmount: 21000,
        platformFee: 1000,
        status: "completed",
        paymentMethod: "qris",
        createdAt: new Date().toISOString(),
        items: [], // not needed for list view
      },
    ]);
  }, []);

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.orderId}>#{item.id.substring(0, 8)}</Text>
        <Text style={styles.status}>{item.status.toUpperCase()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.amount}>
          Total: Rp {item.totalAmount.toLocaleString("id-ID")}
        </Text>
        <Text style={styles.fee}>
          Fee: Rp {item.platformFee.toLocaleString("id-ID")}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="< Kembali"
          variant="ghost"
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Semua Transaksi</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  listContainer: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Spacing[2],
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderId: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.neutral[900],
  },
  status: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.status.completed.text,
  },
  amount: {
    fontSize: FontSize.md,
    color: Colors.neutral[700],
  },
  fee: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
});
