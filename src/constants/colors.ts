/**
 * SAFO Design System — Color Palette
 * Brand identity: fresh greens (sustainability) + warm oranges (food/appetite)
 */

export const Colors = {
  // ── Brand Primary (Green — sustainability, freshness)
  primary: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E', // brand green
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // ── Brand Secondary (Orange — food, warmth, urgency/flash sale)
  secondary: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // brand orange
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  // ── Accent (Teal — trust, secondary actions)
  accent: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // ── Neutrals
  neutral: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // ── Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // ── Status chips (order status)
  status: {
    pendingPayment: { bg: '#FEF3C7', text: '#92400E' },
    paid: { bg: '#DBEAFE', text: '#1E40AF' },
    ready: { bg: '#D1FAE5', text: '#065F46' },
    completed: { bg: '#F0FDF4', text: '#14532D' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
    expired: { bg: '#F3F4F6', text: '#374151' },
  },
} as const;

export const LightTheme = {
  background: Colors.neutral[50],
  surface: Colors.neutral[0],
  surfaceElevated: Colors.neutral[0],
  border: Colors.neutral[200],
  borderSubtle: Colors.neutral[100],

  text: Colors.neutral[900],
  textSecondary: Colors.neutral[600],
  textTertiary: Colors.neutral[400],
  textInverse: Colors.neutral[0],

  primary: Colors.primary[500],
  primaryLight: Colors.primary[100],
  primaryDark: Colors.primary[700],

  secondary: Colors.secondary[500],
  secondaryLight: Colors.secondary[100],
  secondaryDark: Colors.secondary[700],

  tabBarBg: Colors.neutral[0],
  tabBarBorder: Colors.neutral[200],
  tabIconActive: Colors.primary[600],
  tabIconInactive: Colors.neutral[400],

  cardBg: Colors.neutral[0],
  cardShadow: Colors.neutral[900],

  inputBg: Colors.neutral[100],
  inputBorder: Colors.neutral[200],
  inputBorderFocus: Colors.primary[500],
  inputText: Colors.neutral[900],
  inputPlaceholder: Colors.neutral[400],

  flash: Colors.secondary[500],   // flash sale badge color
} as const;

export const DarkTheme = {
  background: Colors.neutral[950],
  surface: Colors.neutral[900],
  surfaceElevated: Colors.neutral[800],
  border: Colors.neutral[700],
  borderSubtle: Colors.neutral[800],

  text: Colors.neutral[50],
  textSecondary: Colors.neutral[400],
  textTertiary: Colors.neutral[600],
  textInverse: Colors.neutral[900],

  primary: Colors.primary[400],
  primaryLight: Colors.primary[900],
  primaryDark: Colors.primary[300],

  secondary: Colors.secondary[400],
  secondaryLight: Colors.secondary[900],
  secondaryDark: Colors.secondary[300],

  tabBarBg: Colors.neutral[900],
  tabBarBorder: Colors.neutral[800],
  tabIconActive: Colors.primary[400],
  tabIconInactive: Colors.neutral[600],

  cardBg: Colors.neutral[900],
  cardShadow: Colors.neutral[950],

  inputBg: Colors.neutral[800],
  inputBorder: Colors.neutral[700],
  inputBorderFocus: Colors.primary[400],
  inputText: Colors.neutral[50],
  inputPlaceholder: Colors.neutral[600],

  flash: Colors.secondary[400],
} as const;

export type ThemeColors = typeof LightTheme;
