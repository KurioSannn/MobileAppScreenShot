// Snaply Design Tokens — Warm Minimalist Direction
// Strictly avoids dark/neon AI aesthetics

export const Colors = {
  // Base backgrounds
  background: '#F8F6F0',      // Warm creamy off-white
  surface: '#FFFFFF',         // Pure clean white card surface
  surfaceSubtle: '#F3EFE6',   // Soft warm beige
  surfaceMuted: '#EFECE4',    // Very soft neutral

  // Text
  textPrimary: '#1E1E1E',     // Deep charcoal (never pitch black)
  textSecondary: '#6E6B65',   // Muted warm stone
  textMuted: '#9E9B93',       // Subtle placeholder / disabled text
  textInverse: '#FFFFFF',

  // Brand / Action Accents (Warm Minimal)
  primary: '#F5B031',         // Honey Gold / Warm Amber
  primaryPressed: '#E59F22',
  primaryLight: '#FFF4DA',

  secondary: '#2C2B29',       // Deep earth slate
  secondaryLight: '#ECE9E2',

  // Status & Semantic
  success: '#2A7B4C',         // Forest sage green
  successLight: '#E3F2E9',
  warning: '#D97706',         // Warm amber warning
  warningLight: '#FEF3C7',
  danger: '#C84C32',          // Terracotta red (not harsh neon red)
  dangerLight: '#FDEAE2',
  info: '#6847B8',            // Soft iris purple (for manga)
  infoLight: '#EBE6F8',

  // Category Pastel Tones (from visual mockup)
  pastelPeach: '#FDEAE2',
  pastelPeachIcon: '#C44E28',
  pastelLavender: '#EBE6F8',
  pastelLavenderIcon: '#6847B8',
  pastelMint: '#E3F2E9',
  pastelMintIcon: '#2A7B4C',
  pastelHoney: '#FFF4DA',
  pastelHoneyIcon: '#B57B14',

  // Borders & Dividers
  border: '#E8E4DA',
  borderLight: '#F0ECE4',
  borderStrong: '#D5CEC5',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  card: 24,
  pill: 9999,
};

export const Typography = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 26,
    hero: 32,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};
