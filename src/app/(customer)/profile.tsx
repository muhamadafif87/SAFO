import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'expo-router';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const TEAL_DARK = '#0E6B5A';   
const TEAL = '#0F6E5C';        
const MINT = '#D8EDE7';        
const BG = '#F7F9F8';          
const TEXT_DARK = '#222222';
const TEXT_MUTED = '#888888';
const BORDER = '#E5E7EB';
const LINK_BLUE = '#2563eb';

const PersonIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    {/* path baru dari clipboard */}
    <Path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
    <Path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1" />
  </Svg>
);

const CrownIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M2 4.5l3.5 3L8 3.5l2.5 4 3.5-3-1.4 7.5H3.4L2 4.5z" />
    <Path d="M3.4 12.5h9.2V14H3.4z" />
  </Svg>
);

const LifebuoyIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.4">
    <Path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" strokeLinejoin="round" />
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

const FALLBACK_HOURS = '21.00 – 23.00 WIB'; 

export default function CustomerProfile() {
  const router = useRouter();
  const { user, mitra } = useAuthStore();

  const isVip = !!user?.isVip;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header: back + title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Svg width={20} height={20} viewBox="0 0 16 16" fill={TEXT_DARK}>
            <Path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Hero card teal gelap ── */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <PersonIcon color={TEAL_DARK} size={32} />
          </View>
          <Text style={styles.heroName}>{user?.name || 'Nama'}</Text>
          <Text style={styles.heroPhone}>{user?.phone || '-'}</Text>
        </View>

        {/* ── Kartu VIP ── */}
        <TouchableOpacity
          style={styles.vipCard}
          activeOpacity={0.7}
          onPress={() => Alert.alert('VIP', 'Fitur VIP segera hadir.')}
        >
          <View style={styles.vipIconWrap}>
            <CrownIcon color={TEAL} size={20} />
          </View>
          <View style={styles.vipInfo}>
            <Text style={styles.vipLabel}>VIP</Text>
            <Text style={[styles.vipStatus, !isVip && styles.vipStatusInactive]}>
              {isVip ? 'Aktif' : 'Nonaktif'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* ── Informasi Pribadi ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <PersonIcon color={TEAL} size={16} />
            </View>
            <Text style={styles.cardHeaderTitle}>Informasi Pribadi</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Text style={styles.infoEmoji}>📍</Text>
            </View>
            <Text style={styles.infoText}>{mitra?.address || '-'}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Text style={styles.infoEmoji}>📞</Text>
            </View>
            <Text style={styles.infoText}>{user?.phone || '-'}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIconWrap}>
              <Text style={styles.infoEmoji}>✉️</Text>
            </View>
            <Text style={[styles.infoText, styles.infoEmail]} numberOfLines={1}>
              {user?.email || '-'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        {/* ── Bantuan ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <LifebuoyIcon color={TEAL} size={16} />
            </View>
            <Text style={styles.cardHeaderTitle}>Bantuan</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Pusat Bantuan', 'Kunjungi support@safo.id untuk bantuan.')}
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
            onPress={() => Alert.alert('Chat Admin', 'Hubungi admin SAFO melalui WhatsApp.')}
          >
            <View style={[styles.infoIconWrap, { backgroundColor: '#eff6ff' }]}>
              <ChatIcon />
            </View>
            <Text style={styles.infoText}>Chat Admin</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  headerSpacer: {
    width: 40,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  heroCard: {
    backgroundColor: TEAL_DARK,
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroPhone: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  vipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MINT,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  vipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vipInfo: {
    flex: 1,
  },
  vipLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  vipStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: TEAL,
    marginTop: 1,
  },
  vipStatusInactive: {
    color: TEXT_MUTED,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  cardHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: MINT,
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
    color: LINK_BLUE,
  },
  chevron: {
    fontSize: 18,
    color: '#B0B0B0',
    marginLeft: 8,
  },
});