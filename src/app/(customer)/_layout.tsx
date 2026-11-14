import { SafoTabBar } from "@/components/safo-tab-bar";
import { Tabs } from "expo-router";

// ─── Customer Tabs Layout ─────────────────────────────────────────────────────
// Bottom navigation (Beranda / Pesanan / Profil) dipakai bersama lewat
// SafoTabBar — lihat src/components/safo-tab-bar.tsx

export default function CustomerLayout() {
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
          title: "Beranda",
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: "Pesanan",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
        }}
      />

      {/* Hidden screens — accessible via router.push but not shown in tab bar */}
      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
          title: "Checkout",
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          href: null,
          title: "Produk",
        }}
      />
      <Tabs.Screen
        name="location-picker"
        options={{
          href: null,
          title: "Pilih Lokasi",
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="vip"
        options={{
          href: null,
          title: "VIP",
          tabBarStyle: { display: "none" },
        }}
      />
      {/* orders/[id] — detail pesanan, dibuka setelah checkout berhasil */}
      <Tabs.Screen
        name="orders/[id]"
        options={{
          href: null,
          title: "Detail Pesanan",
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
