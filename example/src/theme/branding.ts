/**
 * The sample app's OWN chrome palette — the shared sample design identity (refresh-2026).
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
  /** App bar, primary buttons (light mode), titles. Also the light-theme nav accent (§3). */
  navy: '#0F1B2D',
  /**
   * Active-control fill — switches, selected segments, section labels, and the primary
   * button color in dark mode. Fill-only per the shared sample design contract: 3.50:1 on
   * white, so it must never be a label or icon colour, and its own ink is {@link accentInk}
   * rather than white — see `onControl` below. The selected tab uses {@link navy} (light) /
   * {@link accentDark} (dark) instead — see `navActive` below.
   */
  accent: '#1D88FE',
  /** Signal dark accent for controls, links and icons. */
  accentDark: '#66B0FF',
  /** Light-mode control ink; kept independent of the dark palette. */
  accentInk: '#142238',
  /** Danger text / destructive accents — light mode. */
  danger: '#9E243F',
  /** Danger text / destructive accents — dark mode. */
  // off-table: semantic error colour keeps text contrast on cards and elevated surfaces.
  dangerDark: '#FF6B8F',
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
  // Dark ladder, aligned on the octopuscommunity.com site: ink → navy → navy-2, each step a
  // bluish navy rather than a neutral grey, so depth reads as depth instead of flat slabs.
  /** Dark-mode page background (site `--ink`). */
  darkBackground: '#070D17',
  /** Dark-mode card surface: the brand navy, one step above the page. */
  darkSurface: '#0F1B2D',
  /** Inset fields remain distinct from the card beneath them (the hover step). */
  darkSurfaceRaised: '#1D2E48',
  /** Elevated overlays only (site `--navy-2`). */
  darkElevated: '#16243A',
  /** Default hairline (site `--line`). Decorative only — never a control boundary. */
  darkBorder: '#1E2A3D',
  /** Stronger decorative hairline: the frame of the current-configuration block. */
  darkBorderStrong: '#243349',
  // off-table: non-text control boundary ≥ 3:1 (WCAG 1.4.11) — 4.13:1 on the card.
  darkTrack: '#6A7D9B',
  // off-table: secondary ink holds 4.79:1 on this segment fill (≥ 4.5:1).
  darkSegmentTrack: '#1D2E48',
  darkPressed: '#1D2E48',
  /** Text ladder: headings, body, then captions and metadata. */
  darkText: '#F2F6FC',
  darkBody: '#E9F0FA',
  darkSecondary: '#8C9AB0',
  /**
   * The dark-theme halo behind every example-owned screen: the brand blue ({@link accent})
   * at 12 %, centred on the screen's top-right corner and fading to the same hue at zero
   * alpha so it never interpolates through black. Drawn by `DarkHalo`.
   */
  darkHalo: 'rgba(29,136,254,0.12)',
  darkHaloEnd: 'rgba(29,136,254,0)',
  darkPrimaryLow: '#16273C',
  darkPrimaryHigh: '#8FC6FF',
  darkTint: 'rgba(102,176,255,0.10)',
  darkTintBorder: 'rgba(102,176,255,0.28)',
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

/**
 * The colour set the sample hands to the **SDK** as its navy preset — the shared sample
 * design contract's SDK brand theme block (§4), not the sample's own chrome.
 *
 * Deliberately a second, disjoint token group: `OCTOPUS_BRAND` above paints the host's
 * shell, this one paints the Octopus UI inside it. They happen to share hues, and they
 * must stay free to diverge — a change to one repainting the other is exactly the bug the
 * split exists to prevent. Kept here rather than inline in `App.tsx` so the contract's
 * values live in one file with the rest of the palette.
 *
 * Dark mapping (DS role → value → SDK token):
 * Page → #070D17 → background
 * Accent → #66B0FF → primary, link
 * Tinted container → #16273C → primaryLowContrast
 * Progress / focus → #8FC6FF → primaryHighContrast
 * Accent ink → #070D17 → onPrimary
 * Page → #070D17 → gray100 (Android only)
 * Card → #0F1B2D → shell surface, gray200 (Android only)
 * Hairline → #1E2A3D → shell border, gray300 (Android only)
 * Strong hairline → #243349 → current-configuration frame (no SDK token)
 * Elevated → #16243A → shell elevated (no SDK token)
 * Pressed card → #1D2E48 → shell surfacePressed (no SDK token)
 * Heading → #F2F6FC → shell text (no SDK token)
 * Body → #E9F0FA → shell textBody, gray700 (Android only)
 * Caption → #8C9AB0 → shell textSecondary (no SDK token)
 *
 * The four `gray*` keys follow the Android sample's mapping so the community's own neutral
 * surfaces land on the same navy ladder. They are Android-only in the binding: iOS's native
 * theme does not expose its gray ramp, so the iOS community keeps its default grays. The
 * Android sample also hands gray500/800/900 and onHover, which the binding does not carry.
 */
// Dark explicitly maps Signal background/link; light retains the existing SDK defaults.
export const OCTOPUS_SDK_THEME = {
  light: {
    primary: '#0F1B2D',
    primaryLowContrast: '#DCE9FC',
    primaryHighContrast: '#1D88FE',
    onPrimary: '#FFFFFF',
  },
  dark: {
    primary: OCTOPUS_BRAND.accentDark,
    primaryLowContrast: OCTOPUS_BRAND.darkPrimaryLow,
    primaryHighContrast: OCTOPUS_BRAND.darkPrimaryHigh,
    onPrimary: OCTOPUS_BRAND.darkBackground,
    background: OCTOPUS_BRAND.darkBackground,
    link: OCTOPUS_BRAND.accentDark,
    gray100: OCTOPUS_BRAND.darkBackground,
    gray200: OCTOPUS_BRAND.darkSurface,
    gray300: OCTOPUS_BRAND.darkBorder,
    gray700: OCTOPUS_BRAND.darkBody,
  },
} as const;

/** Every chrome color the sample's own screens draw with. */
export interface ChromeColors {
  /** Dark-only Signal chip overrides, preserving each light component's style. */
  badge?: { backgroundColor: string; borderColor: string; borderWidth: number };
  badgeText?: { color: string; opacity: number };
  /** Page background — painted once by the app shell, under the dark `DarkHalo`. */
  background: string;
  /**
   * Root fill of an example-owned screen. The page background in light theme; transparent
   * in dark, so the shell's page colour and its top-right halo show through without a seam.
   */
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
  /**
   * Text/glyphs drawn on the active-control fill: dark ink in both themes.
   */
  onControl: string;
  /** Switch off-track, distinguishable from the surrounding card. */
  track: string;
  /** Segmented-control track, contrasting with inactive ink and the selected pill. */
  segmentTrack: string;
  /**
   * The colour the top system-bar inset is painted in: the navy bar colour in light, the
   * page colour in dark. Kept distinct from {@link header} so system bars keep their
   * behaviour while the dark header itself goes transparent.
   */
  appBar: string;
  /** App bar fill: {@link appBar} in light; transparent in dark, over the halo. */
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
  background: OCTOPUS_BRAND.lightBackground,
  screen: OCTOPUS_BRAND.lightBackground,
  surface: '#FFFFFF',
  surfaceRaised: OCTOPUS_BRAND.lightSurfaceRaised,
  elevated: OCTOPUS_BRAND.lightBackground,
  surfacePressed: '#FFFFFF',
  textBody: OCTOPUS_BRAND.navy,
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
  // AccentInk, not white: white only holds 3.50:1 on this fill.
  onControl: OCTOPUS_BRAND.accentInk,
  track: OCTOPUS_BRAND.lightSurfaceRaised,
  segmentTrack: OCTOPUS_BRAND.lightSurfaceRaised,
  appBar: OCTOPUS_BRAND.navy,
  header: OCTOPUS_BRAND.navy,
  onAppBar: '#FFFFFF',
  navSurface: '#FFFFFF',
  // Navy, not the fill-only accent blue (the shared sample design contract — Accent is
  // never a label/icon colour in light theme). 17.28:1 on the white nav bar.
  navActive: OCTOPUS_BRAND.navy,
  navInactive: '#6B7685',
  // Navy at 15% over the bar's own (white) container — navy still holds 12.70:1 as a
  // label over that tint, the tightest real path for the indicator.
  navIndicator: 'rgba(15,27,45,0.15)',
  danger: OCTOPUS_BRAND.danger,
  dangerSurface: OCTOPUS_BRAND.dangerSurface,
  dangerBorder: OCTOPUS_BRAND.dangerBorder,
  warn: OCTOPUS_BRAND.warn,
  warnSurface: OCTOPUS_BRAND.warnSurface,
  warnBorder: OCTOPUS_BRAND.warnBorder,
  success: OCTOPUS_BRAND.success,
  guestAccent: OCTOPUS_BRAND.guestAmber,
  codeSurface: OCTOPUS_BRAND.accentInk,
  onCodeSurface: OCTOPUS_BRAND.lightSurfaceRaised,
  snackbar: OCTOPUS_BRAND.navy,
  onSnackbar: '#FFFFFF',
  // The dark accent, not the fill-only blue: on navy it is the readable one (inverse
  // primary, as Material paints a light-theme snackbar action).
  snackbarAction: OCTOPUS_BRAND.accentDark,
};

const DARK: ChromeColors = {
  badge: {
    backgroundColor: OCTOPUS_BRAND.darkTint,
    borderColor: OCTOPUS_BRAND.darkTintBorder,
    borderWidth: 1,
  },
  badgeText: { color: OCTOPUS_BRAND.accentDark, opacity: 1 },
  background: OCTOPUS_BRAND.darkBackground,
  screen: 'transparent',
  surface: OCTOPUS_BRAND.darkSurface,
  surfaceRaised: OCTOPUS_BRAND.darkSurfaceRaised,
  elevated: OCTOPUS_BRAND.darkElevated,
  surfacePressed: OCTOPUS_BRAND.darkPressed,
  textBody: OCTOPUS_BRAND.darkBody,
  tint: OCTOPUS_BRAND.darkTint,
  tintBorder: OCTOPUS_BRAND.darkTintBorder,
  border: OCTOPUS_BRAND.darkBorder,
  text: OCTOPUS_BRAND.darkText,
  textSecondary: OCTOPUS_BRAND.darkSecondary,
  textPlaceholder: OCTOPUS_BRAND.darkSecondary,
  accent: OCTOPUS_BRAND.accentDark,
  accentPressed: OCTOPUS_BRAND.darkPrimaryHigh,
  onAccent: OCTOPUS_BRAND.darkBackground,
  control: OCTOPUS_BRAND.accentDark,
  onControl: OCTOPUS_BRAND.darkBackground,
  track: OCTOPUS_BRAND.darkTrack,
  segmentTrack: OCTOPUS_BRAND.darkSegmentTrack,
  appBar: OCTOPUS_BRAND.darkBackground,
  header: 'transparent',
  onAppBar: OCTOPUS_BRAND.darkText,
  navSurface: OCTOPUS_BRAND.darkSurface,
  navActive: OCTOPUS_BRAND.accentDark,
  navInactive: OCTOPUS_BRAND.darkSecondary,
  navIndicator: 'rgba(102,176,255,0.15)',
  danger: OCTOPUS_BRAND.dangerDark,
  dangerSurface: '#2A0F16',
  dangerBorder: '#5E2331',
  warn: '#F1D390',
  warnSurface: '#2A1F0B',
  warnBorder: '#5E4A1F',
  success: '#54DD78',
  guestAccent: OCTOPUS_BRAND.guestAmber,
  codeSurface: OCTOPUS_BRAND.darkBackground,
  onCodeSurface: OCTOPUS_BRAND.darkBody,
  snackbar: OCTOPUS_BRAND.darkElevated,
  onSnackbar: OCTOPUS_BRAND.darkBody,
  snackbarAction: OCTOPUS_BRAND.accentDark,
};

/** The chrome palette for the host's light/dark appearance. */
export function chromeColors(isDark: boolean): ChromeColors {
  return isDark ? DARK : LIGHT;
}
