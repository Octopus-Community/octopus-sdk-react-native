import { debugLog } from '../debug/debugLog';
import {
  applyThemeMode,
  coerceThemeMode,
  FALLBACK_THEME_MODE,
  restoreThemeMode,
} from '../theme/themeMode';

// `Appearance` is the whole of this module's contact with the platform, and it is the
// part that can throw. Mocked rather than spied on: these tests run under the library's
// jest project, where a real `react-native` import from `example/` resolves to the
// example's own copy and asks for a batched bridge that no host-side test has.
const mockSetColorScheme = jest.fn();
jest.mock('react-native', () => ({
  Appearance: {
    setColorScheme: (...args: unknown[]) => mockSetColorScheme(...args),
  },
}));

/** The details of every line the console recorded, newest first. */
function consoleDetails(): string[] {
  return debugLog.all.map((e) => e.detail);
}

const setColorScheme = mockSetColorScheme;

beforeEach(() => {
  debugLog.clear();
  setColorScheme.mockReset();
  setColorScheme.mockImplementation(() => {});
});

describe('coerceThemeMode', () => {
  it.each(['system', 'light', 'dark'] as const)('keeps %s', (mode) => {
    expect(coerceThemeMode(mode)).toBe(mode);
    expect(consoleDetails()).toHaveLength(0);
  });

  it.each([
    ['a mode from a future build', 'sepia'],
    ['a capitalised value', 'Dark'],
    ['a missing field', undefined],
    ['a null', null],
    ['a non-string', 7],
  ])('falls back to system on %s', (_label, value) => {
    expect(coerceThemeMode(value)).toBe(FALLBACK_THEME_MODE);
    // Surfaced in the example's debug console rather than swallowed: a tester
    // seeing "system" after choosing something else needs to know why.
    expect(consoleDetails()[0]).toContain('unknown persisted appearance');
  });
});

describe('applyThemeMode', () => {
  it('maps system to undefined, so the host follows the device', () => {
    expect(applyThemeMode('system')).toBe('system');
    expect(setColorScheme).toHaveBeenCalledWith(undefined);
  });

  it.each(['light', 'dark'] as const)('applies %s verbatim', (mode) => {
    expect(applyThemeMode(mode)).toBe(mode);
    expect(setColorScheme).toHaveBeenCalledWith(mode);
  });

  it('falls back to system, and reports, when applying throws', () => {
    setColorScheme.mockImplementation((scheme?: unknown) => {
      if (scheme === 'dark') throw new Error('native appearance unavailable');
    });

    // The crash-loop of issue #257 in one call: a persisted "dark" that the
    // platform refuses must leave the app running on the system appearance.
    expect(applyThemeMode('dark')).toBe(FALLBACK_THEME_MODE);
    expect(setColorScheme).toHaveBeenLastCalledWith(undefined);
    expect(consoleDetails()[0]).toContain('native appearance unavailable');
  });

  it('survives the fallback throwing too', () => {
    setColorScheme.mockImplementation(() => {
      throw new Error('everything is on fire');
    });

    expect(() => applyThemeMode('dark')).not.toThrow();
    expect(applyThemeMode('dark')).toBe(FALLBACK_THEME_MODE);
  });

  it('does not re-apply system after system itself threw', () => {
    setColorScheme.mockImplementation(() => {
      throw new Error('nope');
    });

    expect(applyThemeMode('system')).toBe(FALLBACK_THEME_MODE);
    expect(setColorScheme).toHaveBeenCalledTimes(1);
  });
});

describe('restoreThemeMode', () => {
  it('narrows then applies', () => {
    expect(restoreThemeMode('dark')).toBe('dark');
    expect(setColorScheme).toHaveBeenCalledWith('dark');
  });

  it('never throws on a value read back from storage', () => {
    setColorScheme.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(restoreThemeMode({ theme: 'dark' })).toBe(FALLBACK_THEME_MODE);
    expect(restoreThemeMode('dark')).toBe(FALLBACK_THEME_MODE);
  });
});
