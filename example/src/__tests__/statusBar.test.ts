jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  default: { OS: 'android' },
}));

import { statusBarStyleForSurface } from '../theme/statusBar';
import { OCTOPUS_SDK_THEME } from '../theme/branding';

it.each([
  [OCTOPUS_SDK_THEME.light.background, false, 'dark'],
  [OCTOPUS_SDK_THEME.dark.background, true, 'light'],
  // A preset can override the background independently of its appearance name.
  ['#0F1B2D', false, 'light'],
  ['#F5F7FA', true, 'dark'],
  ['#FFF7ED', false, 'dark'],
  ['#1C1917', true, 'light'],
  ['white', true, 'dark'],
  ['rgb(255, 0, 0)', false, 'dark'],
  ['transparent', false, 'dark'],
  ['transparent', true, 'light'],
  ['invalid', false, 'dark'],
  ['invalid', true, 'light'],
] as const)(
  'surface %s (dark appearance: %s) selects %s icons',
  (background, isDark, expected) => {
    expect(statusBarStyleForSurface(background, isDark)).toBe(expected);
  }
);
