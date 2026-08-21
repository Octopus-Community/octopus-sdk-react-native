/* eslint-disable react-native/no-inline-styles */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SegmentControl } from '../components/SegmentControl';
import type {
  ThemeMode,
  ThemeSet,
  FontType,
  LogoMode,
  FontSizeMode,
  BottomInsetPreset,
  LinkBackgroundMode,
  FontOverrideMode,
} from '../types/theme';
import { EXAMPLE_FONT_FAMILY, EXAMPLE_FONT_WEIGHT } from '../types/theme';

export type {
  ThemeMode,
  ThemeSet,
  FontType,
  LogoMode,
  FontSizeMode,
  BottomInsetPreset,
  LinkBackgroundMode,
  FontOverrideMode,
};

const THEME_MODE_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const THEME_SET_OPTIONS: { label: string; value: ThemeSet }[] = [
  { label: 'None', value: 'none' },
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

export interface ThemeScreenProps {
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
  primaryColor: string;
  onPrimaryColor: string;
}

/**
 * Theme tab: compact controls for Octopus UI appearance (mode, set, fonts, logo, bottom inset).
 */
export function ThemeScreen({
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
  primaryColor,
  onPrimaryColor,
}: ThemeScreenProps) {
  const textColor = isDark ? '#ffffff' : '#000000';
  const cardBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const borderColor = isDark ? '#444444' : '#e8e8e8';

  const effectiveMode = themeMode ?? 'system';

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
    >
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Theme mode</Text>
        <SegmentControl
          options={THEME_MODE_OPTIONS}
          value={effectiveMode}
          onChange={onThemeModeChange}
          isDark={isDark}
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Color set</Text>
        <SegmentControl
          options={THEME_SET_OPTIONS}
          value={themeSet}
          onChange={onThemeSetChange}
          isDark={isDark}
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Font type</Text>
        <SegmentControl
          options={FONT_TYPE_OPTIONS}
          value={fontType}
          onChange={onFontTypeChange}
          isDark={isDark}
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Font size</Text>
        <SegmentControl
          options={FONT_SIZE_OPTIONS}
          value={fontSizeMode}
          onChange={onFontSizeModeChange}
          isDark={isDark}
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Custom logo</Text>
        <SegmentControl
          options={LOGO_OPTIONS}
          value={logoMode}
          onChange={onLogoModeChange}
          isDark={isDark}
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>
          Link &amp; background
        </Text>
        <Text style={[styles.hint, { color: isDark ? '#888' : '#666' }]}>
          Custom URL color in posts/comments and community background. Works
          with any color set, including None.
        </Text>
        <SegmentControl
          options={LINK_BACKGROUND_OPTIONS}
          value={linkBackgroundMode}
          onChange={onLinkBackgroundModeChange}
          isDark={isDark}
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Font override</Text>
        <Text style={[styles.hint, { color: isDark ? '#888' : '#666' }]}>
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
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
        />
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Bottom inset</Text>
        <Text style={[styles.hint, { color: isDark ? '#888' : '#666' }]}>
          Safe area inset for Octopus UI (iOS pt / Android dp). "Unset" omits
          the option entirely — on Android this resolves the inset from where
          the embedded view is mounted; "0" opts back out of that resolution.
        </Text>
        <SegmentControl
          options={BOTTOM_INSET_OPTIONS}
          value={bottomInsetPreset}
          onChange={onBottomInsetPresetChange}
          isDark={isDark}
          primaryColor={primaryColor}
          onPrimaryColor={onPrimaryColor}
        />
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 24,
  },
});
