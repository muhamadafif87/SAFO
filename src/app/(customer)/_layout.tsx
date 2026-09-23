import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

// Design tokens matching SAFO & wireframe
const PRIMARY = '#1a5c52';
const ACTIVE_BG = '#ddf2ed';
const INACTIVE_COLOR = '#111827';
const BORDER_TOP = '#f0f2f5';

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function HomeIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L8 1.207l-6.354 6.353A.5.5 0 0 0 1.5 8v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5" />
    </Svg>
  );
}

function OrdersIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      {/* Clipboard board */}
      <Path d="M3.5 2a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5H12a.5.5 0 0 1 0-1h.5A1.5 1.5 0 0 1 14 2.5v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-12A1.5 1.5 0 0 1 3.5 1H4a.5.5 0 0 1 0 1z" />
      {/* Clipboard top clip */}
      <Path d="M10 .5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5.5.5 0 0 1-.5.5.5.5 0 0 0-.5.5V2a.5.5 0 0 0 .5.5h5A.5.5 0 0 0 11 2v-.5a.5.5 0 0 0-.5-.5.5.5 0 0 1-.5-.5" />
      {/* Checklist lines */}
      <Path d="M5.5 6.5A.5.5 0 0 1 6 6h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5m0 3A.5.5 0 0 1 6 9h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5m0 3A.5.5 0 0 1 6 12h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5" />
    </Svg>
  );
}

function ProfileIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1m5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
    </Svg>
  );
}

// ─── Custom Bottom Navigation Bar ─────────────────────────────────────────────

function CustomBottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Visible bottom navigation items
  const tabConfig: Record<string, { label: string; icon: (color: string) => React.ReactNode }> = {
    index: {
      label: 'Beranda',
      icon: (color) => <HomeIcon color={color} size={19} />,
    },
    orders: {
      label: 'Pesanan',
      icon: (color) => <OrdersIcon color={color} size={19} />,
    },
    profile: {
      label: 'Profil',
      icon: (color) => <ProfileIcon color={color} size={19} />,
    },
  };

  // Check if current focused route hides tab bar (e.g. checkout)
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute?.key]?.options;
  if ((currentOptions?.tabBarStyle as any)?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
            type: 'tabPress',
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
          title: 'Beranda',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pesanan',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
        }}
      />

      {/* Hidden screens — accessible via router.push but not shown in tab bar */}
      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
          title: 'Checkout',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          href: null,
          title: 'Produk',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: BORDER_TOP,
    paddingTop: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 14,
    minWidth: 74,
  },
  pillActive: {
    backgroundColor: ACTIVE_BG,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
