import { sampleRadius, sampleTypography } from '../../theme/tokens';
import { View, Text, StyleSheet } from 'react-native';
import { SegmentControl } from '../../components/SegmentControl';
import { chromeColors } from '../../theme/branding';
import type {
  ThemeMode,
  ThemeSet,
  FontType,
  LogoMode,
  FontSizeMode,
  BottomInsetPreset,
  LinkBackgroundMode,
  FontOverrideMode,
} from '../../types/theme';
import { EXAMPLE_FONT_FAMILY, EXAMPLE_FONT_WEIGHT } from '../../types/theme';

const THEME_MODE_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const THEME_SET_OPTIONS: { label: string; value: ThemeSet }[] = [
  { label: 'None', value: 'none' },
  { label: 'Octopus navy', value: 'octopusNavy' },
  { label: 'Theme 1', value: 'theme1' },
  { label: 'Theme 2', value: 'theme2' },
  { label: 'Theme 3', value: 'theme3' },
];

const FONT_TYPE_OPTIONS: { label: string; value: FontType }[] = [
  { label: 'Default', value: 'default' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
];

const LOGO_OPTIONS: { label: string; value: LogoMode }[] = [
  { label: 'Off', value: 'disabled' },
  { label: 'On', value: 'enabled' },
];

const FONT_SIZE_OPTIONS: { label: string; value: FontSizeMode }[] = [
  { label: 'Default', value: 'default' },
  { label: 'Small', value: 'small' },
  { label: 'Large', value: 'large' },
];

const BOTTOM_INSET_OPTIONS: { label: string; value: BottomInsetPreset }[] = [
  // Omits `ui.bottomSafeAreaInset` entirely — on Android this now resolves the inset from
  // where <OctopusUIView> is mounted (issue #120) rather than reserving nothing.
  { label: 'Unset', value: 'unset' },
  { label: '0 (opt out)', value: 'none' },
  { label: '20pt', value: '20' },
  { label: '70pt', value: '70' },
];

const LINK_BACKGROUND_OPTIONS: {
  label: string;
  value: LinkBackgroundMode;
}[] = [
  { label: 'Default', value: 'default' },
  { label: 'Custom', value: 'custom' },
];

const FONT_OVERRIDE_OPTIONS: { label: string; value: FontOverrideMode }[] = [
  { label: 'Default', value: 'default' },
  { label: `Weight ${EXAMPLE_FONT_WEIGHT}`, value: 'weight' },
  { label: EXAMPLE_FONT_FAMILY, value: 'family' },
];

export interface ThemePanelProps {
  themeMode: ThemeMode | null;
  onThemeModeChange: (mode: ThemeMode) => void;
  themeSet: ThemeSet;
  onThemeSetChange: (value: ThemeSet) => void;
  fontType: FontType;
  onFontTypeChange: (value: FontType) => void;
  logoMode: LogoMode;
  onLogoModeChange: (value: LogoMode) => void;
  fontSizeMode: FontSizeMode;
  onFontSizeModeChange: (value: FontSizeMode) => void;
  bottomInsetPreset: BottomInsetPreset;
  onBottomInsetPresetChange: (value: BottomInsetPreset) => void;
  linkBackgroundMode: LinkBackgroundMode;
  onLinkBackgroundModeChange: (value: LinkBackgroundMode) => void;
  fontOverrideMode: FontOverrideMode;
  onFontOverrideModeChange: (value: FontOverrideMode) => void;
  isDark: boolean;
}

/**
 * Theme controls for the Octopus UI appearance (mode, color set, fonts, logo, link/background,
 * bottom inset).
 *
 * Lives under the Theme scenario card, where the shared catalog puts this capability. A panel,
 * not a screen: the scenario detail owns the scroll, so this renders as a plain column of
 * cards.
 */
export function ThemePanel({
  themeMode,
  onThemeModeChange,
  themeSet,
  onThemeSetChange,
  fontType,
  onFontTypeChange,
  logoMode,
  onLogoModeChange,
  fontSizeMode,
  onFontSizeModeChange,
  bottomInsetPreset,
  onBottomInsetPresetChange,
  linkBackgroundMode,
  onLinkBackgroundModeChange,
  fontOverrideMode,
  onFontOverrideModeChange,
  isDark,
}: ThemePanelProps) {
  const chrome = chromeColors(isDark);
  const textColor = chrome.text;
  const cardBg = chrome.surface;
  const borderColor = chrome.border;

  const effectiveMode = themeMode ?? 'system';

  return (
    <View style={styles.panel}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Theme mode</Text>
        <SegmentControl
          options={THEME_MODE_OPTIONS}
          value={effectiveMode}
          onChange={onThemeModeChange}
          isDark={isDark}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Color set</Text>
        <SegmentControl
          options={THEME_SET_OPTIONS}
          value={themeSet}
          onChange={onThemeSetChange}
          isDark={isDark}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Font type</Text>
        <SegmentControl
          options={FONT_TYPE_OPTIONS}
          value={fontType}
          onChange={onFontTypeChange}
          isDark={isDark}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Font size</Text>
        <SegmentControl
          options={FONT_SIZE_OPTIONS}
          value={fontSizeMode}
          onChange={onFontSizeModeChange}
          isDark={isDark}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Custom logo</Text>
        <Text style={[styles.hint, { color: chrome.textSecondary }]}>
          Also overrides three icons (theme.icons): the post's "Comment" action
          , the "more actions" button (horizontal dots instead of ⋮) and the
          "clear text" button (outlined circle), plus the illustration on empty
          post and comment lists.
        </Text>
        <SegmentControl
          options={LOGO_OPTIONS}
          value={logoMode}
          onChange={onLogoModeChange}
          isDark={isDark}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>
          Link &amp; background
        </Text>
        <Text style={[styles.hint, { color: chrome.textSecondary }]}>
          Custom URL color in posts/comments and community background. Works
          with any color set, including None.
        </Text>
        <SegmentControl
          options={LINK_BACKGROUND_OPTIONS}
          value={linkBackgroundMode}
          onChange={onLinkBackgroundModeChange}
          isDark={isDark}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Font override</Text>
        <Text style={[styles.hint, { color: chrome.textSecondary }]}>
          Theme-wide family and weight, applied to every text style. The weight
          needs no native font registration; {EXAMPLE_FONT_FAMILY} is registered
          by iOS itself, and on Android this example ships no res/font/
          resource, so it logs the documented warning and keeps the default
          font.
        </Text>
        <SegmentControl
          options={FONT_OVERRIDE_OPTIONS}
          value={fontOverrideMode}
          onChange={onFontOverrideModeChange}
          isDark={isDark}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Bottom inset</Text>
        <Text style={[styles.hint, { color: chrome.textSecondary }]}>
          Bottom margin the Octopus UI keeps clear (iOS pt / Android dp). In an
          embedded view it is the total band (on iOS, max(value, system safe
          area)); in fullscreen it is added on top of the system safe area. It
          is an initialize option, so switching preset re-inits the SDK. "Unset"
          omits the option entirely — on Android this resolves the inset from
          where the embedded view is mounted; "0" opts back out of that
          resolution.
        </Text>
        <SegmentControl
          options={BOTTOM_INSET_OPTIONS}
          value={bottomInsetPreset}
          onChange={onBottomInsetPresetChange}
          isDark={isDark}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 12,
  },
  card: {
    padding: 12,
    borderRadius: sampleRadius.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  label: {
    ...sampleTypography.callout,

    marginBottom: 8,
  },
  hint: {
    ...sampleTypography.caption,
    marginBottom: 8,
  },
});
