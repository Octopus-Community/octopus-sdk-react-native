/* eslint-disable no-bitwise -- processColor returns a packed ARGB integer. */
import { processColor } from 'react-native';

/** Select the higher-contrast icons for the active SDK surface, including presets. */
export function statusBarStyleForSurface(
  background: string,
  isDark: boolean
): 'dark' | 'light' {
  const color = processColor(background);
  if (typeof color !== 'number') return isDark ? 'light' : 'dark';
  const alpha = ((color >>> 24) & 255) / 255;
  const base = isDark ? 0 : 255;
  const linear = (shift: number) => {
    const channel =
      (((color >>> shift) & 255) * alpha + base * (1 - alpha)) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * linear(16) + 0.7152 * linear(8) + 0.0722 * linear(0);
  // Black and white have equal contrast at sqrt(1.05 * 0.05) - 0.05.
  return luminance > Math.sqrt(1.05 * 0.05) - 0.05 ? 'dark' : 'light';
}
