import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

// Platform system fonts: no commercial font files are redistributed.
const systemFont = Platform.select({ ios: 'System', default: 'sans-serif' });
export const sampleMonoFont = Platform.select({
  ios: 'Menlo',
  default: 'monospace',
});
function type(
  size: number,
  lineHeight: number,
  fontWeight: TextStyle['fontWeight']
): TextStyle {
  return { fontFamily: systemFont, fontSize: size, lineHeight, fontWeight };
}
export const sampleTypography = {
  appBarMedium: type(28, 36, '600'),
  appBarLarge: type(36, 44, '600'),
  buttonLabel: type(16, 22, '600'),
  scenarioTitle: type(12.5, 18, '600'),
  mono: { ...type(13, 18, '400'), fontFamily: sampleMonoFont },
  monoSmall: { ...type(12, 16, '400'), fontFamily: sampleMonoFont },
  title1: type(26, 34, '600'),
  title2: type(22, 28, '600'),
  headline: type(18, 24, '600'),
  body: type(16, 22, '400'),
  callout: type(14, 20, '400'),
  caption: type(12, 16, '500'),
  label: type(14, 20, '600'),
  badge: type(12, 16, '600'),
};
export const sampleSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  gutter: 16,
  lg: 20,
  group: 24,
  xl: 32,
};
export const sampleRadius = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 };
export const sampleSize = {
  touch: 48,
  row: 56,
  scenarioRow: 64,
  badge: 28,
  icon: 24,
};
