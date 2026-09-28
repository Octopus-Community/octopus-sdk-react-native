import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { OCTOPUS_BRAND } from '../theme/branding';

/**
 * The CSS `radial-gradient` the dark halo paints for a window `width` wide: the brand accent
 * at 12 % fading to fully transparent, centred on the top-right corner, radius = the width.
 *
 * Written as an ellipse with two equal radii rather than `circle <r>`, which is the same
 * shape in CSS: React Native 0.81's parser consumes the token after a single size, so in
 * `circle 411px at 100% 0%` it swallows `at`, reads `100% 0%` as a second size and silently
 * centres the gradient on the screen. Two explicit radii keep `at` intact.
 *
 * Exported for the unit test — the shared cross-platform spec pins these exact numbers.
 */
export function darkHaloBackgroundImage(width: number): string {
  const radius = `${Math.round(width)}px`;
  return `radial-gradient(ellipse ${radius} ${radius} at 100% 0%, ${
    OCTOPUS_BRAND.darkHalo
  }, ${OCTOPUS_BRAND.darkHaloEnd})`;
}

export interface DarkHaloProps {
  /** Dark theme and an example-owned screen: false renders nothing. */
  visible: boolean;
}

/**
 * The dark-theme glow of the shared sample identity, drawn once behind the whole shell.
 *
 * Mount it as the FIRST child of a full-window container whose own fill is the page
 * background: it fills that container, is fixed to the viewport (nothing inside scrolls it)
 * and sits under the header, which is transparent in dark mode so the glow runs through it
 * with no hard edge. Screens above it paint `chrome.screen` (transparent in dark).
 *
 * React Native's built-in `experimental_backgroundImage`, so no extra native dependency; it
 * needs the new architecture, which the example enables — without it the view is simply
 * transparent and the page stays flat.
 */
export function DarkHalo({ visible }: DarkHaloProps) {
  const { width } = useWindowDimensions();
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      testID="sample-dark-halo"
      style={[
        StyleSheet.absoluteFill,
        { experimental_backgroundImage: darkHaloBackgroundImage(width) },
      ]}
    />
  );
}
