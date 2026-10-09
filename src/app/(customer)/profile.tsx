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
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/typography';

const PRIMARY = Colors.primary[600];
const PRIMARY_LIGHT = Colors.primary[50];
const PRIMARY_DARK = Colors.primary[700];
const WHITE = '#ffffff';
const TEXT_DARK = Colors.neutral[900];
const TEXT_MUTED = Colors.neutral[500];
const BORDER_COLOR = Colors.neutral[100];
const ERROR_BG = '#fee2e2';
const ERROR_TEXT = '#dc2626';

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
    backgroundColor: WHITE,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
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
    borderRadius: 16,
    backgroundColor: PRIMARY_DARK,
    borderWidth: 0,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    color: WHITE,
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
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: WHITE,
    flexShrink: 1,
  },
  vipBadge: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 0,
  },
  vipLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  vipStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
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
  logoutButton: {
    marginTop: 12,
    backgroundColor: ERROR_BG,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: ERROR_TEXT,
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