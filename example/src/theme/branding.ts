/**
 * The sample app's OWN chrome palette — the shared sample design identity (charte refresh-2026).
 *
 * This is deliberately independent of the theme the Theme scenario hands to the SDK. The
 * sample is a host app: its shell (app bar, tab bar, cards, buttons) is the host's brand,
 * and the Octopus UI inside it is what changes when a tester picks a color set. Before this
 * existed the two were the same value, so switching the SDK's demo theme repainted the
 * sample's own chrome and the screenshot no longer showed what a real integration looks
 * like.
 *
 * The values below are the cross-platform sample identity handed down by the design
 * handoff: navy app bar / primary buttons, blue accent for active controls (switches,
 * segments, selected tab), and the semantic trio (danger / guest-amber / success), so the
 * samples across platforms read as one product family.
 *
 * No font is declared here on purpose: the sample ships no font binary and uses the system
 * family on both platforms.
 */
export const OCTOPUS_BRAND = {
  /** App bar, primary buttons (light mode), titles. */
  navy: '#0F1B2D',
  /** Active-control accent — switches, selected segments, selected tab, section labels. Also the primary button color in dark mode. */
  accent: '#1D88FE',
  /** Danger text / destructive accents — light mode. */
  danger: '#9E243F',
  /** Danger text / destructive accents — dark mode. */
  dangerDark: '#FF3366',
  /** Guest / read-only status accent — same value in light and dark. */
  guestAmber: '#D99A2B',
  /** Degraded (read-only) band text — light mode. */
  warn: '#7A4B08',
  warnSurface: '#FFF7E6',
  warnBorder: '#F1D390',
  /** Blocking band surface / border — light mode (shares the danger text color). */
  dangerSurface: '#FCEDEF',
  dangerBorder: '#E4B7C0',
  /** Success green — the READY dot, the Connected pill, the Result `✓ Success` header. */
  success: '#30B653',
  /** Dark-mode page background. */
  darkBackground: '#0B1421',
  /** Dark-mode card / field surface. */
  darkSurface: '#142238',
  /** Dark-mode inset field surface (inputs, code blocks' lighter sibling). */
  darkSurfaceRaised: '#1B2C45',
  /** Light-mode page background. */
  lightBackground: '#F5F7FA',
  /** Light-mode inset field surface. */
  lightSurfaceRaised: '#EEF1F5',
  /**
   * Kept as the count-badge red: the SDK design system's error red, which is what the
   * unread badge draws in on every sample.
   */
  error: '#BA1A1A',
} as const;

/**
 * Tint reserved for the platform marker — the launcher icon's pill.
 *
 * The in-app marker is the app bar's pill, which draws in a translucent white on the
 * navy bar instead (see `AppBar`); this hue stays for the launcher badge only.
 */
export const OCTOPUS_PLATFORM_SLOT_COLOR = '#7C3577';

/** Every chrome color the sample's own screens draw with. */
export interface ChromeColors {
  /** Page background. */
  background: string;
  /** Card / grouped-row surface, on top of {@link background}. */
  surface: string;
  /** Inset surface *inside* a card — result panels, code blocks. */
  surfaceRaised: string;
  /** Tinted surface — status bands, the framed configuration block. */
  tint: string;
  /** Border of a {@link tint} surface. */
  tintBorder: string;
  /** Hairline and 1pt borders. */
  border: string;
  /** Primary text. */
  text: string;
  /** Hints, captions, secondary rows. */
  textSecondary: string;
  /** Placeholder inside a text input — dimmer than {@link textSecondary}. */
  textPlaceholder: string;
  /** CTA background — primary buttons, selected segments. */
  accent: string;
  /** CTA background while pressed. */
  accentPressed: string;
  /** Text and glyphs drawn on {@link accent}. */
  onAccent: string;
  /** Active state of a control — switch track, selected radio, checked box. */
  control: string;
  /** Segmented-control track, under the selected pill. */
  track: string;
  /** App bar background. */
  appBar: string;
  /** Text and glyphs drawn on {@link appBar}. */
  onAppBar: string;
  /** Tab bar surface. */
  navSurface: string;
  /** Selected tab tint. */
  navActive: string;
  /** Unselected tab tint. */
  navInactive: string;
  /** Danger text. */
  danger: string;
  /** Danger band / danger-zone surface. */
  dangerSurface: string;
  /** Danger band / danger-zone border. */
  dangerBorder: string;
  /** Degraded-state text. */
  warn: string;
  /** Degraded band surface. */
  warnSurface: string;
  /** Degraded band border. */
  warnBorder: string;
  /** Success text and dots. */
  success: string;
  /** Guest / read-only status accent — same value in light and dark (charte). */
  guestAccent: string;
  /** Dark code block — a raw SDK result. */
  codeSurface: string;
  /** Text inside a {@link codeSurface} block. */
  onCodeSurface: string;
}

const LIGHT: ChromeColors = {
  background: OCTOPUS_BRAND.lightBackground,
  surface: '#FFFFFF',
  surfaceRaised: OCTOPUS_BRAND.lightSurfaceRaised,
  tint: 'rgba(29,136,254,0.10)',
  tintBorder: OCTOPUS_BRAND.accent,
  border: '#E4E7EC',
  text: OCTOPUS_BRAND.navy,
  textSecondary: '#6B7685',
  textPlaceholder: '#A7B0BD',
  // Primary button fill in light mode is navy — the accent blue is reserved for active
  // controls (switches, segments, selected tab), never buttons, in light mode.
  accent: OCTOPUS_BRAND.navy,
  accentPressed: '#16273D',
  onAccent: '#FFFFFF',
  control: OCTOPUS_BRAND.accent,
  track: OCTOPUS_BRAND.lightSurfaceRaised,
  appBar: OCTOPUS_BRAND.navy,
  onAppBar: '#FFFFFF',
  navSurface: '#FFFFFF',
  navActive: OCTOPUS_BRAND.accent,
  navInactive: '#6B7685',
  danger: OCTOPUS_BRAND.danger,
  dangerSurface: OCTOPUS_BRAND.dangerSurface,
  dangerBorder: OCTOPUS_BRAND.dangerBorder,
  warn: OCTOPUS_BRAND.warn,
  warnSurface: OCTOPUS_BRAND.warnSurface,
  warnBorder: OCTOPUS_BRAND.warnBorder,
  success: OCTOPUS_BRAND.success,
  guestAccent: OCTOPUS_BRAND.guestAmber,
  codeSurface: OCTOPUS_BRAND.darkSurface,
  onCodeSurface: OCTOPUS_BRAND.lightSurfaceRaised,
};

const DARK: ChromeColors = {
  background: OCTOPUS_BRAND.darkBackground,
  surface: OCTOPUS_BRAND.darkSurface,
  surfaceRaised: OCTOPUS_BRAND.darkSurfaceRaised,
  tint: 'rgba(29,136,254,0.16)',
  tintBorder: '#7FB8FF',
  border: 'rgba(255,255,255,0.07)',
  text: '#F2F5F9',
  textSecondary: '#9AA7B8',
  textPlaceholder: '#5C6B7C',
  // The navy app bar is unreadable as a button fill on the dark page, so dark mode
  // promotes the accent blue to the CTA — the same swap the shared identity prescribes.
  accent: OCTOPUS_BRAND.accent,
  accentPressed: '#0F6FD6',
  onAccent: '#FFFFFF',
  control: OCTOPUS_BRAND.accent,
  // Deliberately lighter than the card it sits on: at the same value the track
  // disappears and an unselected segment loses its affordance.
  track: '#33415A',
  appBar: OCTOPUS_BRAND.darkBackground,
  onAppBar: '#FFFFFF',
  navSurface: '#0F1B2D',
  navActive: OCTOPUS_BRAND.accent,
  navInactive: '#9AA7B8',
  danger: OCTOPUS_BRAND.dangerDark,
  dangerSurface: '#2A0F16',
  dangerBorder: '#5E2331',
  warn: '#F1D390',
  warnSurface: '#2A1F0B',
  warnBorder: '#5E4A1F',
  success: '#54DD78',
  guestAccent: OCTOPUS_BRAND.guestAmber,
  codeSurface: '#060E18',
  onCodeSurface: OCTOPUS_BRAND.lightSurfaceRaised,
};

/** The chrome palette for the host's light/dark appearance. */
export function chromeColors(isDark: boolean): ChromeColors {
  return isDark ? DARK : LIGHT;
}
