import { Colors } from '@/constants/typography';
import { useAuthStore } from '@/stores/auth.store';
import { showAlert, showConfirm } from '@/utils/alert';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const PRIMARY = Colors.primary[600];
const PRIMARY_LIGHT = Colors.primary[50];
const WHITE = '#ffffff';
const TEXT_DARK = Colors.neutral[900];
const TEXT_MUTED = Colors.neutral[500];
const BORDER = '#EAEEF0';
const MINT = '#D8EDE7';
const ERROR_BG = '#fee2e2';
const ERROR_TEXT = '#dc2626';

const StoreIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M2 2.5A.5.5 0 0 1 2.5 2h11a.5.5 0 0 1 .5.5v1.3l-1.4.7A4.5 4.5 0 0 0 8 5.044 4.5 4.5 0 0 0 2.9 4.5L1.5 3.8V2.5zM1 5.11l1.3.65A3.5 3.5 0 0 1 8 4.5a3.5 3.5 0 0 1 5.7 1.26L15 5.11V13a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5.11zM4.5 14.5a1.5 1.5 0 0 0 1.5-1.5h1a1.5 1.5 0 0 0 3 0h1a1.5 1.5 0 0 0 1.5 1.5v1a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5v-1z" />
  </Svg>
);

const CrownIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M2 4.5l3.5 3L8 3.5l2.5 4 3.5-3-1.4 7.5H3.4L2 4.5z" />
    <Path d="M3.4 12.5h9.2V14H3.4z" />
  </Svg>
);

const LifebuoyIcon = ({
  color,
  size = 18,
}: {
  color: string;
  size?: number;
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke={color}
    strokeWidth="1.4"
  >
    <Path
      d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      strokeLinejoin="round"
    />
    <Path d="M8 1v4M8 11v4M1 8h4M11 8h4" strokeLinecap="round" />
  </Svg>
);

const QuestionIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16" fill="#d97706">
    <Path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
    <Path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94" />
  </Svg>
);

const ChatIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16" fill="#2563eb">
    <Path d="M8 1C4.14 1 1 3.806 1 7.267c0 1.917.977 3.626 2.508 4.742-.062.47-.27 1.086-.73 1.53-.06.057-.014.153.066.142 1.09-.137 1.909-.59 2.469-1.023A7.83 7.83 0 0 0 8 13.533c3.86 0 7-2.806 7-6.267S11.86 1 8 1m-4.5 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2m4.5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2m4.5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2" />
  </Svg>
);

export default function MitraProfile() {
  const router = useRouter();
  const { user, mitra, clearAuth } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // isVip mitra belum didukung backend — selalu false, tampil sebagai Nonaktif.
  const isVip = !!user?.isVip;

  const handleLogout = () => {
    showConfirm(
      'Keluar Akun',
      'Apakah Anda yakin ingin keluar dari akun ini?',
      async () => {
        try {
          setIsLoggingOut(true);
          await clearAuth();
          router.replace('/(auth)/login');
        } catch (error) {
          console.error('[mitra/profile] Gagal logout:', error);
          showAlert(
            'Gagal',
            'Terjadi kesalahan saat memproses logout. Silakan coba lagi.',
          );
        } finally {
          setIsLoggingOut(false);
        }
      },
      { confirmText: 'Keluar', cancelText: 'Batal', destructive: true },
    );
  };

  const infoRows = [
    { emoji: '📍', value: mitra?.address || 'Alamat belum diatur' },
    { emoji: '📞', value: user?.phone || '-' },
    { emoji: '✉️', value: user?.email || '-', highlight: true },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Nama warung ── */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <StoreIcon color={WHITE} size={30} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroName} numberOfLines={1}>
              {mitra?.businessName || 'Warung Saya'}
            </Text>
            {!!mitra?.category && (
              <Text style={styles.heroCategory} numberOfLines={1}>
                {mitra.category}
              </Text>
            )}
          </View>
        </View>

        {/* ── VIP ── */}
        <TouchableOpacity
          style={styles.vipCard}
          activeOpacity={0.7}
          onPress={() => router.push('/(mitra)/vip')}
        >
          <View style={styles.vipIconWrap}>
            <CrownIcon color={PRIMARY} size={20} />
          </View>
          <View style={styles.vipInfo}>
            <Text style={styles.vipLabel}>VIP</Text>
            <Text
              style={[styles.vipStatus, !isVip && styles.vipStatusInactive]}
            >
              {isVip ? 'Aktif' : 'Nonaktif'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* ── Informasi Warung ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <StoreIcon color={PRIMARY} size={15} />
            </View>
            <Text style={styles.cardHeaderTitle}>Informasi Warung</Text>
          </View>

          {infoRows.map((row, index) => (
            <View
              key={row.emoji}
              style={[
                styles.infoRow,
                index === infoRows.length - 1 && styles.infoRowLast,
              ]}
            >
              <View style={styles.infoIconWrap}>
                <Text style={styles.infoEmoji}>{row.emoji}</Text>
              </View>
              <Text
                style={[styles.infoText, row.highlight && styles.infoEmail]}
                numberOfLines={1}
              >
                {row.value}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          ))}
        </View>

        {/* ── Bantuan ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <LifebuoyIcon color={PRIMARY} size={16} />
            </View>
            <Text style={styles.cardHeaderTitle}>Bantuan</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Pusat Bantuan',
                'Kunjungi support@safo.id untuk bantuan.',
              )
            }
          >
            <View style={[styles.infoIconWrap, { backgroundColor: '#fef3c7' }]}>
              <QuestionIcon />
            </View>
            <Text style={styles.infoText}>Pusat Bantuan</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.infoRow, styles.infoRowLast]}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert('Chat Admin', 'Hubungi admin SAFO melalui WhatsApp.')
            }
          >
            <View style={[styles.infoIconWrap, { backgroundColor: '#eff6ff' }]}>
              <ChatIcon />
            </View>
            <Text style={styles.infoText}>Chat Admin</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            isLoggingOut && styles.logoutButtonDisabled,
          ]}
          activeOpacity={0.8}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={ERROR_TEXT} />
          ) : (
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WHITE,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroText: {
    flex: 1,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  heroCategory: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 3,
  },

  vipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MINT,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  vipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vipInfo: {
    flex: 1,
  },
  vipLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  vipStatus: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
    marginTop: 1,
  },
  vipStatusInactive: {
    color: TEXT_MUTED,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  cardHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F6F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoEmoji: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_DARK,
  },
  infoEmail: {
    color: PRIMARY,
  },
  chevron: {
    fontSize: 18,
    color: '#B0B0B0',
    marginLeft: 8,
  },

  logoutButton: {
    marginTop: 4,
    backgroundColor: ERROR_BG,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: ERROR_TEXT,
  },
});
