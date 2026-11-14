import { Colors } from '@/constants/typography';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const PRIMARY = Colors.primary[600];
const PRIMARY_DARK = Colors.primary[700];
const MINT = '#D8EDE7';
const WHITE = '#ffffff';
const TEXT_DARK = Colors.neutral[900];
const TEXT_MUTED = Colors.neutral[500];
const BORDER = '#EAEEF0';
const PAGE_BG = '#F4F6F7';

const BackIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
  </Svg>
);

const CrownIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M2 4.5l3.5 3L8 3.5l2.5 4 3.5-3-1.4 7.5H3.4L2 4.5z" />
    <Path d="M3.4 12.5h9.2V14H3.4z" />
  </Svg>
);

const UploadIcon = ({
  color,
  size = 20,
}: {
  color: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M8 1.5a.5.5 0 0 1 .5.5v6.293l2.146-2.147a.5.5 0 1 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 .708-.708L7.5 8.293V2a.5.5 0 0 1 .5-.5z" />
    <Path d="M2 10.5a.5.5 0 0 1 .5.5v2A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 1 1 0v2A2.5 2.5 0 0 1 12 15.5H4A2.5 2.5 0 0 1 1.5 13v-2a.5.5 0 0 1 .5-.5z" />
  </Svg>
);

const MegaphoneIcon = ({
  color,
  size = 20,
}: {
  color: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M11.5 2.5a.5.5 0 0 0-.75-.433L5.5 5.03V3a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v3.22l-.79.474A.5.5 0 0 0 2.5 7.6V8.4a.5.5 0 0 0 .207.404l.793.58V13a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-2.03l4.74 2.61A.5.5 0 0 0 11.5 13.5v-11zM4.5 12.5v-5.8l.5-.3v5.4l-.5.7zm1.75-6.79L10.7 3.12v9.42L6.25 9.1V5.71z" />
    <Path d="M13.5 5.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z" />
  </Svg>
);

type Benefit = {
  icon: (color: string) => React.ReactNode;
  title: string;
  description: string;
  comparison?: { from: string; to: string };
};

const BENEFITS: Benefit[] = [
  {
    icon: (color) => <UploadIcon color={color} />,
    title: 'Limit Upload Produk',
    description:
      'Upload lebih banyak menu untuk meningkatkan peluang penjualan.',
    comparison: { from: '10 Produk', to: '50 Produk' },
  },
  {
    icon: (color) => <MegaphoneIcon color={color} />,
    title: 'Promosi Homepage',
    description:
      'Warung dapat tampil pada banner promosi di halaman beranda untuk meningkatkan eksposur dan peluang penjualan.',
  },
  {
    icon: (color) => <CrownIcon color={color} size={20} />,
    title: 'Badge VIP',
    description:
      'Toko dapat tampil pada banner promosi di beranda pelanggan untuk meningkatkan eksposur dan peluang penjualan.',
  },
];

export default function MitraVip() {
  const router = useRouter();

  // Langganan VIP mitra belum didukung backend — tombol sengaja dinonaktifkan
  // sampai endpoint & limit produk benar-benar tersedia.
  const canUpgrade = false;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackIcon color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VIP</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Hero ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <CrownIcon color={PRIMARY_DARK} size={30} />
          </View>
          <Text style={styles.heroTitle}>SAFO VIP</Text>
          <Text style={styles.heroSubtitle}>
            Tingkatkan visibilitas warung dan dapatkan fitur eksklusif.
          </Text>
        </View>

        {/* ── Manfaat ── */}
        {BENEFITS.map((benefit) => (
          <View key={benefit.title} style={styles.benefitCard}>
            <View style={styles.benefitIconWrap}>
              {benefit.icon(PRIMARY)}
            </View>
            <View style={styles.benefitBody}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>
                {benefit.description}
              </Text>
              {benefit.comparison && (
                <View style={styles.comparisonRow}>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>
                      {benefit.comparison.from}
                    </Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                  <View style={[styles.pill, styles.pillActive]}>
                    <Text style={[styles.pillText, styles.pillTextActive]}>
                      {benefit.comparison.to}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Harga + Aksi ── */}
      <View style={styles.footer}>
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Harga VIP</Text>
          <Text style={styles.priceValue}>
            Rp 19.000 <Text style={styles.priceUnit}>/ Bulan</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.upgradeButton, !canUpgrade && styles.upgradeDisabled]}
          activeOpacity={canUpgrade ? 0.75 : 1}
          disabled={!canUpgrade}
          onPress={() => {}}
        >
          <Text style={styles.upgradeText}>Upgrade VIP</Text>
        </TouchableOpacity>

        {!canUpgrade && (
          <Text style={styles.disabledHint}>
            Langganan VIP mitra sedang disiapkan.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PRIMARY_DARK,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },

  heroCard: {
    backgroundColor: MINT,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconWrap: {
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY_DARK,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: PRIMARY_DARK,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.85,
  },

  benefitCard: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
  },
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitBody: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 5,
  },
  benefitDescription: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
  },

  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  pill: {
    backgroundColor: '#F1F4F5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillActive: {
    backgroundColor: MINT,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  pillTextActive: {
    color: PRIMARY_DARK,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 13,
    color: TEXT_MUTED,
  },

  footer: {
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 13,
    color: TEXT_DARK,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: PRIMARY_DARK,
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },

  upgradeButton: {
    backgroundColor: PRIMARY_DARK,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  upgradeDisabled: {
    backgroundColor: '#9DB6B2',
  },
  upgradeText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
  disabledHint: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 8,
  },
});
