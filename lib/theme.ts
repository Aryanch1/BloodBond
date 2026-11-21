import { useWindowDimensions } from 'react-native';

/**
 * BloodBond design tokens — one consistent system for the whole app.
 *
 * Identity: a "lifeline board". Deep crimson (#B42318) is the one
 * disciplined theme color, on warm white (#FFF9F7) with ink (#221A18).
 * Bebas Neue (poster-style condensed display) is the display face —
 * deliberately different from Sora (FridgeToMeal/MediGuide), Fraunces
 * (SplitEase), Bricolage Grotesque (PlantDoctor), Archivo (CivicHelper),
 * Space Grotesk (BudgetBuddy) and DM Serif Display (ElderEase). The
 * hero is typographic, not a photo; navigation is a feed with a
 * board-switcher chip row and a crimson floating action button.
 */

export const palette = {
  // Brand — one disciplined deep crimson.
  primary: '#B42318',
  primaryDeep: '#7A150C',
  primaryLight: '#D92D20',
  primarySoft: '#FBE3E0',
  primaryPale: '#FDF0EE',
  // Bright red — urgency ribbons and the droplet fill only.
  bright: '#C8102E',
  // Neutrals (warm tinted so the whole UI feels one family).
  ink: '#221A18',
  body: '#584A45',
  muted: '#8E7D77',
  line: 'rgba(34, 26, 24, 0.10)',
  surface: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.62)',
  glassStrong: 'rgba(255, 255, 255, 0.80)',
  sheet: 'rgba(255, 255, 255, 0.88)',
  // Aurora background stops — warm white with a rose tint.
  aurora: ['#FFF9F7', '#FCECEA', '#F9E3E0'] as const,
  // Blood semantics.
  critical: '#B42318',
  criticalSoft: '#FBE3E0',
  urgent: '#B87A1F',
  urgentSoft: '#FBF3DC',
  routine: '#2E7D32',
  routineSoft: '#E6F2E6',
  // Status.
  warning: '#B87A1F',
  warningSoft: '#FBF3DC',
  error: '#B3261E',
  errorSoft: '#FCE8E6',
  success: '#2E7D32',
  successSoft: '#E6F2E6',
} as const;

/** Blood-group colors (all groups share the crimson identity; the
 *  universal donor O- gets the bright red). */
export const groupColors: Record<string, string> = {
  'O-': '#C8102E',
  'O+': '#B42318',
  'A-': '#B42318',
  'A+': '#B42318',
  'B-': '#B42318',
  'B+': '#B42318',
  'AB-': '#B42318',
  'AB+': '#B42318',
};

/** Backwards-compatible alias used by shared UI components. */
export const memberColors = [
  '#B42318',
  '#C8102E',
  '#7A150C',
  '#D92D20',
  '#2E7D32',
  '#B87A1F',
  '#584A45',
] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 12,
  md: 18,
  card: 30,
  sheet: 38,
  pill: 999,
  input: 24,
} as const;

/**
 * Display typeface — Bebas Neue (bundled via
 * @expo-google-fonts/bebas-neue, loaded in app/_layout.tsx). Used
 * for headlines, screen titles and big numbers; body text stays on the
 * system font. Bebas Neue ships only a 400 weight, so display text
 * reads through size and letter-spacing, not weight.
 */
export const font = {
  display: 'BebasNeue_400Regular',
  bold: 'BebasNeue_400Regular',
} as const;

export const type = {
  display: { fontFamily: font.display, fontSize: 48, lineHeight: 50, letterSpacing: 0.5 },
  displayWide: { fontFamily: font.display, fontSize: 60, lineHeight: 62, letterSpacing: 0.5 },
  title: { fontFamily: font.display, fontSize: 30, lineHeight: 34, letterSpacing: 0.5 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.6 },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 1.1 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#221A18',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: {
    shadowColor: '#B42318',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  float: {
    shadowColor: '#221A18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export type Breakpoint = 'compact' | 'medium' | 'wide' | 'desktop';

export interface Responsive {
  breakpoint: Breakpoint;
  width: number;
  /** Max width for the centered content column. */
  contentMaxWidth: number;
  /** Horizontal page padding. */
  pad: number;
  /** Columns for card grids. */
  columns: number;
  /** Two-pane list + detail layout (foldable unfolded / tablet / desktop). */
  twoPane: boolean;
  display: typeof type.display | typeof type.displayWide;
}

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();
  if (width < 600) {
    return {
      breakpoint: 'compact',
      width,
      contentMaxWidth: width,
      pad: 20,
      columns: 1,
      twoPane: false,
      display: type.display,
    };
  }
  if (width < 840) {
    return {
      breakpoint: 'medium',
      width,
      contentMaxWidth: 640,
      pad: 28,
      columns: 1,
      twoPane: false,
      display: type.displayWide,
    };
  }
  if (width < 1280) {
    return {
      breakpoint: 'wide',
      width,
      contentMaxWidth: 1024,
      pad: 32,
      columns: 2,
      twoPane: true,
      display: type.displayWide,
    };
  }
  return {
    breakpoint: 'desktop',
    width,
    contentMaxWidth: 1120,
    pad: 40,
    columns: 3,
    twoPane: true,
    display: type.displayWide,
  };
}
