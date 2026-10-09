/**
 * SAFO Design System — Typography & Color Tokens
 */

export const FontFamily = {
  regular: "System",
  medium: "System",
  semiBold: "System",
  bold: "System",
  mono: "Courier New",
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 34,
} as const;

export const LineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.625,
} as const;

export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semiBold: "600" as const,
  bold: "700" as const,
  extraBold: "800" as const,
} as const;

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const BorderRadius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const Colors = {
  primary: {
    50: "#e8f4f1",
    100: "#c5e5e0",
    200: "#a1d5ce",
    300: "#7ec6bc",
    400: "#5ab6ab",
    500: "#37a699",
    600: "#1a5c52",
    700: "#0f3d35",
    800: "#0a2620",
    900: "#051812",
  },
  secondary: {
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    300: "#fdba74",
    400: "#fb923c",
    500: "#f97316",
    600: "#ea580c",
    700: "#c2410c",
  },
  neutral: {
    0: "#ffffff",
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
  error: "#ef4444",
  warning: "#f59e0b",
  /** Status colors used in orders */
  status: {
    pendingPayment: { bg: "#fef3c7", text: "#92400e" },
    paid: { bg: "#e8f4f1", text: "#0f3d35" },
    ready: { bg: "#dbeafe", text: "#1e40af" },
    completed: { bg: "#e8f4f1", text: "#0f3d35" },
    cancelled: { bg: "#fee2e2", text: "#991b1b" },
  },
} as const;
