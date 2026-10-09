import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Lebar layar dipakai untuk menyesuaikan padding/ukuran pill di layar sempit
// (mis. iPhone SE ~320px) maupun layar lebar (tablet).
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_NARROW_SCREEN = SCREEN_WIDTH < 360;
const IS_WIDE_SCREEN = SCREEN_WIDTH >= 600; // tablet / landscape besar

type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

// Design tokens matching SAFO & wireframe
const PRIMARY = "#1a5c52";
const ACTIVE_BG = "#ddf2ed";
const INACTIVE_COLOR = "#111827";
const BORDER_TOP = "#f0f2f5";

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function HomeIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        fill={color}
        d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 00.5.5h4a.5.5 0 00.5-.5v-7a.5.5 0 00-.146-.354L13 5.793V2.5a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5v1.293L8.354 1.146a.5.5 0 00-.708 0l-6 6A.5.5 0 001.5 7.5v7a.5.5 0 00.5.5h4a.5.5 0 00.5-.5"
      />
    </Svg>
  );
}

function OrdersIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      {/* fill dipasang langsung di <Path>, bukan cuma di <Svg> induk —
          react-native-svg tidak selalu menurunkan fill ke child secara
          konsisten di semua versi/platform, ini yang membuat ikon ini
          sebelumnya tidak tampil. */}
      <Path
        fill={color}
        d="M13 .5c0-.276-.226-.506-.498-.465-1.703.257-2.94 2.012-3 8.462a.5.5 0 00.498.5c.56.01 1 .13 1 1.003v5.5a.5.5 0 00.5.5h1a.5.5 0 00.5-.5zM4.25 0a.25.25 0 01.25.25v5.122a.128.128 0 00.256.006l.233-5.14A.25.25 0 015.24 0h.522a.25.25 0 01.25.238l.233 5.14a.128.128 0 00.256-.006V.25A.25.25 0 016.75 0h.29a.5.5 0 01.498.458l.423 5.07a1.69 1.69 0 01-1.059 1.711l-.053.022a.92.92 0 00-.58.884L6.47 15a.971.971 0 11-1.942 0l.202-6.855a.92.92 0 00-.58-.884l-.053-.022a1.69 1.69 0 01-1.059-1.712L3.462.458A.5.5 0 013.96 0z"
      />
    </Svg>
  );
}

function ProfileIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        fill={color}
        d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 100-6 3 3 0 000 6"
      />
    </Svg>
  );
}

// ─── Custom Bottom Navigation Bar ─────────────────────────────────────────────

function CustomBottomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Visible bottom navigation items
  const tabConfig: Record<
    string,
    { label: string; icon: (color: string) => React.ReactNode }
  > = {
    index: {
      label: "Beranda",
      icon: (color) => <HomeIcon color={color} size={19} />,
    },
    'orders/index': {
      label: 'Pesanan',
      icon: (color) => <OrdersIcon color={color} size={19} />,
    },
    profile: {
      label: "Profil",
      icon: (color) => <ProfileIcon color={color} size={19} />,
    },
  };

  // Check if current focused route hides tab bar (e.g. checkout)
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute?.key]?.options;
  if ((currentOptions?.tabBarStyle as any)?.display === "none") {
    return null;
  }

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          // Safe-area kiri/kanan: perlu untuk device dengan notch/lengkungan
          // saat landscape, atau gesture bar di beberapa Android.
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
        },
      ]}
    >
      {/* Wrapper ini membatasi lebar tab bar di layar lebar (tablet) supaya
          tombol tidak melar penuh, dan tetap full-width di HP biasa. */}
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const config = tabConfig[route.name];
          // If route is not one of visible tabs or has href: null, don't render it in the bar
          const options = descriptors[route.key]?.options;
          if (!config || (options as any)?.href === null) {
            return null;
          }

          const isFocused = state.index === index;
          const color = isFocused ? PRIMARY : INACTIVE_COLOR;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={config.label}
              activeOpacity={0.7}
              onPress={onPress}
              style={styles.tabButton}
            >
              <View style={[styles.pill, isFocused && styles.pillActive]}>
                {config.icon(color)}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    { color },
                    isFocused && styles.tabLabelActive,
                  ]}
                >
                  {config.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Customer Tabs Layout ─────────────────────────────────────────────────────

export default function CustomerLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomBottomTabBar {...props} />}
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: BORDER_TOP,
    paddingTop: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 6,
  },
  // Membatasi lebar efektif tab bar di layar lebar/tablet agar tombol tidak
  // melebar berlebihan, sekaligus tetap full-width di HP.
  tabBarInner: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: IS_WIDE_SCREEN ? 480 : "100%",
    alignSelf: "center",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    // Padding & minWidth dikecilkan di layar sempit supaya 3 tab + label
    // tidak saling tabrakan/overflow (mis. iPhone SE, Android kecil).
    paddingHorizontal: IS_NARROW_SCREEN ? 8 : 16,
    borderRadius: 14,
    minWidth: IS_NARROW_SCREEN ? 0 : 74,
    maxWidth: "100%",
  },
  pillActive: {
    backgroundColor: ACTIVE_BG,
  },
  tabLabel: {
    fontSize: IS_NARROW_SCREEN ? 10 : 11,
    fontWeight: "500",
    marginTop: 2,
    // Cegah label 2 baris/terpotong aneh di layar sempit atau saat
    // pengaturan font sistem diperbesar (accessibility).
    flexShrink: 1,
  },
  tabLabelActive: {
    fontWeight: "600",
  },
});
