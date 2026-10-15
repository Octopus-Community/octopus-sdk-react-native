/** Single source for the sample palette. SDK probe themes remain independent. */
export const OCTOPUS_BRAND = {
  navy: '#0F1B2D',
  accent: '#1D88FE',
  accentDark: '#7FB8FF',
  accentInk: '#0F1B2D',
  danger: '#B03A4E',
  dangerDark: '#F0A0A8',
  guestAmber: '#D6A54C',
  warn: '#7A5716',
  warnSurface: '#F9F2E6',
  warnBorder: '#747E8C',
  dangerSurface: '#F8EDEF',
  dangerBorder: '#B03A4E',
  success: '#30B653',
  darkBackground: '#070D17',
  darkSurface: '#18253B',
  darkSurfaceRaised: '#22324C',
  darkElevated: '#18253B',
  darkBorder: '#4A5F80',
  darkBorderStrong: '#4A5F80',
  darkTrack: '#8093AB',
  darkSegmentTrack: '#22324C',
  darkPressed: '#22324C',
  darkText: '#F2F5F9',
  darkBody: '#F2F5F9',
  darkSecondary: '#A3B0C2',
  darkPrimaryLow: '#1B3556',
  darkPrimaryHigh: '#1D88FE',
  darkTint: '#1B3556',
  darkTintBorder: '#8093AB',
  lightBackground: '#F5F7FA',
  lightSurfaceRaised: '#E4E8EE',
  /** Light segment track: one step lighter than the raised surface, so the selected
   * `control` fill keeps the 3:1 non-text floor against it (#E4E8EE gives 2.84:1). */
  lightSegmentTrack: '#EEF1F5',
  error: '#B03A4E',
} as const;

/** React Native keeps its own platform marker. */
export const OCTOPUS_PLATFORM_SLOT_COLOR = '#7C3577';

/**
 * DS → SDK mapping, matching Android's CommunityTheme. The four gray roles are
 * Android-only public fields; iOS keeps its native gray ramp. Missing SDK gray
 * slots are intentionally deferred to R9, without extending the package API.
 */
export const OCTOPUS_SDK_THEME = {
  light: {
    primary: OCTOPUS_BRAND.navy,
    primaryLowContrast: '#E8F2FF',
    primaryHighContrast: OCTOPUS_BRAND.accent,
    onPrimary: '#FFFFFF',
    // A background/link present only in dark also applies to light in the SDK.
    background: OCTOPUS_BRAND.lightBackground,
    link: OCTOPUS_BRAND.navy,
  },
  dark: {
    primary: OCTOPUS_BRAND.accentDark,
    primaryLowContrast: OCTOPUS_BRAND.darkPrimaryLow,
    primaryHighContrast: OCTOPUS_BRAND.accent,
    onPrimary: OCTOPUS_BRAND.darkBackground,
    background: OCTOPUS_BRAND.darkBackground,
    link: OCTOPUS_BRAND.accentDark,
    gray100: OCTOPUS_BRAND.darkBackground,
    gray200: OCTOPUS_BRAND.darkSurface,
    // White at 8% composited on surface; SDK disabled also uses this opaque slot.
    gray300: '#2B364B',
    gray700: OCTOPUS_BRAND.darkText,
  },
} as const;

/** Every chrome color the sample's own screens draw with. */
export interface ChromeColors {
  /** Dark-only Signal chip overrides, preserving each light component's style. */
  badge?: { backgroundColor: string; borderColor: string; borderWidth: number };
  badgeText?: { color: string; opacity: number };
  /** Page background, shared by the app shell and its screens. */
  background: string;
  /** Root fill of an example-owned screen, matching the page background. */
  screen: string;
  /** Card / grouped-row surface, on top of {@link background}. */
  surface: string;
  /** Inset surface *inside* a card — result panels, code blocks. */
  surfaceRaised: string;
  /** Dialog / modal surface. */
  elevated: string;
  /** Pressed ordinary surface. */
  surfacePressed: string;
  /** Body copy. */
  textBody: string;
  /** Tinted surface — status bands, the framed configuration block. */
  tint: string;
  /** Border of a {@link tint} surface. */
  tintBorder: string;
  /** Accessible control boundary and focus ring. */
  outline: string;
  focus: string;
  accentText: string;
  badgeFill: string;
  onBadge: string;
  /** Card borders; decorative, not control boundaries. */
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
  /**
   * Text/glyphs drawn on the active-control fill: dark ink in both themes.
   */
  onControl: string;
  /** Switch off-track, distinguishable from the surrounding card. */
  track: string;
  /** Segmented-control track, contrasting with inactive ink and the selected pill. */
  segmentTrack: string;
  /** System-bar inset fill, matching the page background in both themes. */
  appBar: string;
  /** App bar fill, matching {@link appBar} in both themes. */
  header: string;
  /** Text and glyphs drawn on {@link appBar}. */
  onAppBar: string;
  /** Tab bar surface. */
  navSurface: string;
  /**
   * Selected tab's icon/label tint (the shared sample design contract):
   * {@link OCTOPUS_BRAND.navy} in light theme, {@link OCTOPUS_BRAND.accentDark} in dark —
   * never the fill-only `accent` blue.
   */
  navActive: string;
  /** Unselected tab tint. */
  navInactive: string;
  /**
   * Selected tab's indicator — {@link navActive} at 15% alpha, posed explicitly rather
   * than left to a framework default (the shared sample design contract).
   */
  navIndicator: string;
  /** Danger text. */
  danger: string;
  /** Danger band / danger-zone surface. */
  dangerSurface: string;
  hairline: string;
  successSurface: string;
  accentContainer: string;
  onAccentContainer: string;
  surface3: string;
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
  /** Guest / read-only status accent — same value in light and dark (design contract). */
  guestAccent: string;
  /** Dark code block — a raw SDK result. */
  codeSurface: string;
  /** Text inside a {@link codeSurface} block. */
  onCodeSurface: string;
  /**
   * Snackbar surface — the top of the stack, like Material's inverse surface: navy over
   * the light page, the elevated navy in dark (the Flutter example's `snackBarTheme`).
   */
  snackbar: string;
  /** Message text and dismiss glyph on {@link snackbar} (Material's inverse-on-surface). */
  onSnackbar: string;
  /** Action label on {@link snackbar} (Material's inverse-primary). */
  snackbarAction: string;
}

const LIGHT: ChromeColors = {
  badge: { backgroundColor: '#E8F2FF', borderColor: '#747E8C', borderWidth: 1 },
  badgeText: { color: '#095FBF', opacity: 1 },
  background: OCTOPUS_BRAND.lightBackground,
  screen: OCTOPUS_BRAND.lightBackground,
  surface: '#FFFFFF',
  surfaceRaised: OCTOPUS_BRAND.lightSurfaceRaised,
  elevated: '#FFFFFF',
  surfacePressed: OCTOPUS_BRAND.lightSurfaceRaised,
  textBody: OCTOPUS_BRAND.navy,
  tint: '#E8F2FF',
  tintBorder: '#747E8C',
  border: '#C2CAD5',
  outline: '#747E8C',
  focus: '#095FBF',
  accentText: '#095FBF',
  badgeFill: OCTOPUS_BRAND.danger,
  onBadge: '#FFFFFF',
  text: OCTOPUS_BRAND.navy,
  textSecondary: '#566170',
  textPlaceholder: '#566170',
  accent: OCTOPUS_BRAND.navy,
  accentPressed: '#16273D',
  onAccent: '#FFFFFF',
  control: OCTOPUS_BRAND.accent,
  onControl: OCTOPUS_BRAND.accentInk,
  track: '#747E8C',
  segmentTrack: OCTOPUS_BRAND.lightSegmentTrack,
  appBar: OCTOPUS_BRAND.lightBackground,
  header: OCTOPUS_BRAND.lightBackground,
  onAppBar: OCTOPUS_BRAND.navy,
  navSurface: '#E4E8EE',
  navActive: '#0A3D7A',
  navInactive: '#566170',
  navIndicator: '#D4E6FF',
  accentContainer: '#D4E6FF',
  onAccentContainer: '#0A3D7A',
  surface3: '#DAE0E8',
  danger: OCTOPUS_BRAND.danger,
  dangerSurface: OCTOPUS_BRAND.dangerSurface,
  dangerBorder: OCTOPUS_BRAND.dangerBorder,
  warn: OCTOPUS_BRAND.warn,
  warnSurface: OCTOPUS_BRAND.warnSurface,
  warnBorder: OCTOPUS_BRAND.warnBorder,
  success: '#176830',
  successSurface: '#E3F5E8',
  hairline: '#E4E7EC',
  guestAccent: '#7A5716',
  codeSurface: OCTOPUS_BRAND.navy,
  onCodeSurface: '#D7E3F2',
  snackbar: OCTOPUS_BRAND.navy,
  onSnackbar: '#FFFFFF',
  snackbarAction: OCTOPUS_BRAND.accentDark,
};

const DARK: ChromeColors = {
  badge: {
    backgroundColor: OCTOPUS_BRAND.darkTint,
    borderColor: '#8093AB',
    borderWidth: 1,
  },
  badgeText: { color: OCTOPUS_BRAND.accentDark, opacity: 1 },
  background: OCTOPUS_BRAND.darkBackground,
  screen: OCTOPUS_BRAND.darkBackground,
  surface: OCTOPUS_BRAND.darkSurface,
  surfaceRaised: OCTOPUS_BRAND.darkSurfaceRaised,
  elevated: OCTOPUS_BRAND.darkElevated,
  surfacePressed: OCTOPUS_BRAND.darkPressed,
  textBody: OCTOPUS_BRAND.darkBody,
  tint: OCTOPUS_BRAND.darkTint,
  tintBorder: '#8093AB',
  border: OCTOPUS_BRAND.darkBorder,
  outline: '#8093AB',
  focus: OCTOPUS_BRAND.accentDark,
  accentText: OCTOPUS_BRAND.accentDark,
  badgeFill: OCTOPUS_BRAND.dangerDark,
  onBadge: OCTOPUS_BRAND.darkBackground,
  text: OCTOPUS_BRAND.darkText,
  textSecondary: OCTOPUS_BRAND.darkSecondary,
  textPlaceholder: OCTOPUS_BRAND.darkSecondary,
  accent: '#1570D9',
  accentPressed: '#095FBF',
  onAccent: '#FFFFFF',
  control: OCTOPUS_BRAND.accentDark,
  onControl: OCTOPUS_BRAND.darkBackground,
  track: OCTOPUS_BRAND.darkTrack,
  segmentTrack: OCTOPUS_BRAND.darkSegmentTrack,
  appBar: OCTOPUS_BRAND.darkBackground,
  header: OCTOPUS_BRAND.darkBackground,
  onAppBar: OCTOPUS_BRAND.darkText,
  navSurface: '#22324C',
  navActive: '#E3EFFF',
  navInactive: OCTOPUS_BRAND.darkSecondary,
  navIndicator: '#2A5EA0',
  accentContainer: '#2A5EA0',
  onAccentContainer: '#E3EFFF',
  surface3: '#2E405C',
  danger: OCTOPUS_BRAND.dangerDark,
  dangerSurface: '#3F2E43',
  dangerBorder: OCTOPUS_BRAND.dangerDark,
  warn: '#E2BD78',
  warnSurface: '#3A3222',
  warnBorder: '#8093AB',
  success: '#8FE0A8',
  successSurface: '#14301F',
  hairline: 'rgba(255,255,255,0.08)',
  guestAccent: '#E2BD78',
  codeSurface: '#03060C',
  onCodeSurface: '#D7E3F2',
  snackbar: OCTOPUS_BRAND.darkElevated,
  onSnackbar: OCTOPUS_BRAND.darkBody,
  snackbarAction: OCTOPUS_BRAND.accentDark,
};

export function chromeColors(isDark: boolean): ChromeColors {
  return isDark ? DARK : LIGHT;
}
