import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth.store";
import { SafoTabBar } from '@/components/safo-tab-bar';

// ─── Mitra Tabs Layout ────────────────────────────────────────────────────────
// Bottom navigation mengikuti wireframe: Beranda / Pesanan / Profil.
// Daftar produk pindah ke Beranda, jadi tab "Produk" tidak ada lagi.

export default function MitraLayout() {
  return (
    <Tabs
      tabBar={(props) => <SafoTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: "Produk",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
        }}
      />

      {/* Hidden screens — dibuka lewat router.push, tidak muncul di tab bar */}
      <Tabs.Screen
        name="orders/[id]"
        options={{
          href: null,
          title: 'Detail Pesanan',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="products/create"
        options={{
          href: null,
          title: 'Tambah Produk',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="products/[id]/edit"
        options={{
          href: null,
          title: 'Edit Menu',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
          title: 'Edit Warung',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="vip"
        options={{
          href: null,
          title: 'VIP',
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

function MitraBottomNavigation({ activeRoute }: { activeRoute: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const businessName = useAuthStore((state) => state.mitra?.businessName);

  const isHomeActive = activeRoute === "index";
  const isOrdersActive = activeRoute === "orders";

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.tabBarContent}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => router.navigate("/(mitra)")}
          accessibilityRole="button"
          accessibilityState={{ selected: isHomeActive }}
        >
          {isHomeActive ? (
            <View style={styles.activeTab}>
              <Image
                source={require("../../../assets/images/figma/seller-home.png")}
                style={[styles.tabIcon, styles.activeTabIcon]}
                resizeMode="contain"
              />
              <Text style={styles.activeTabText}>Beranda</Text>
            </View>
          ) : (
            <>
              <Image
                source={require("../../../assets/images/figma/seller-home.png")}
                style={styles.tabIcon}
                resizeMode="contain"
              />
              <Text style={styles.tabText}>Beranda</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => router.navigate("/(mitra)/orders")}
          accessibilityRole="button"
          accessibilityState={{ selected: isOrdersActive }}
        >
          {isOrdersActive ? (
            <View style={styles.activeTab}>
              <Image
                source={require("../../../assets/images/figma/seller-orders.png")}
                style={[styles.ordersIcon, styles.activeTabIcon]}
                resizeMode="contain"
              />
              <Text style={styles.activeTabText}>Pesanan</Text>
            </View>
          ) : (
            <>
              <Image
                source={require("../../../assets/images/figma/seller-orders.png")}
                style={styles.ordersIcon}
                resizeMode="contain"
              />
              <Text style={styles.tabText}>Pesanan</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() =>
            Alert.alert(
              "Profil Mitra",
              businessName || "Informasi profil belum tersedia.",
            )
          }
          accessibilityRole="button"
          accessibilityState={{ selected: activeRoute === "profile" }}
        >
          <Image
            source={require("../../../assets/images/figma/seller-profile.png")}
            style={styles.profileIcon}
            resizeMode="contain"
          />
          <Text style={styles.tabText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarContent: {
    width: "85%",
    maxWidth: 342,
    flexDirection: "row",
    alignSelf: "center",
  },
  tabButton: {
    flex: 1,
    height: 47,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    width: 68,
    height: 47,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d5f6f3",
    borderRadius: 10,
  },
  tabIcon: {
    width: 23,
    height: 23,
    tintColor: "#111111",
  },
  ordersIcon: {
    width: 23,
    height: 26,
    tintColor: "#111111",
  },
  profileIcon: {
    width: 23,
    height: 23,
    tintColor: "#111111",
  },
  activeTabIcon: {
    tintColor: "#00615f",
  },
  activeTabText: {
    color: "#00615f",
    fontSize: 11,
  },
  tabText: {
    color: "#111111",
    fontSize: 11,
  },
});
