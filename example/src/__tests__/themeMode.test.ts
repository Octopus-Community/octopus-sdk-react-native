import { debugLog } from '../debug/debugLog';
import { setThemeMode as applySdkThemeMode } from '../../../src/setThemeMode';
import {
  applyThemeMode,
  coerceThemeMode,
  FALLBACK_THEME_MODE,
  restoreThemeMode,
} from '../theme/themeMode';

// Mock the host Appearance and SDK appearance calls, including failures. Mocked rather than spied on: these tests run under the library's
// jest project, where a real `react-native` import from `example/` resolves to the
// example's own copy and asks for a batched bridge that no host-side test has.
const mockSetColorScheme = jest.fn();
const mockSetSdkThemeMode = jest.fn();
const mockUpdateColorScheme = jest.fn();
jest.mock('../../../src/internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    updateColorScheme: (...args: unknown[]) => mockUpdateColorScheme(...args),
  },
}));
jest.mock(
  '@octopus-community/react-native',
  () => ({
    setThemeMode: (...args: unknown[]) => mockSetSdkThemeMode(...args),
  }),
  { virtual: true }
);
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
  mockSetSdkThemeMode.mockReset();
  mockSetSdkThemeMode.mockImplementation(applySdkThemeMode);
  applySdkThemeMode('system');
  mockUpdateColorScheme.mockClear();
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
    // 'system' releases the SDK force, rather than pinning an observed device value.
    expect(mockSetSdkThemeMode).toHaveBeenCalledWith('system');
    expect(mockUpdateColorScheme).toHaveBeenCalledWith(undefined, false);
  });

  it.each(['light', 'dark'] as const)('applies %s verbatim', (mode) => {
    expect(applyThemeMode(mode)).toBe(mode);
    expect(setColorScheme).toHaveBeenCalledWith(mode);
    expect(mockSetSdkThemeMode).toHaveBeenCalledWith(mode);
    expect(mockUpdateColorScheme).toHaveBeenCalledWith(mode, true);
  });

  it('falls back to system, and reports, when applying throws', () => {
    setColorScheme.mockImplementation((scheme?: unknown) => {
      if (scheme === 'dark') throw new Error('native appearance unavailable');
    });

    // The crash-loop of issue #257 in one call: a persisted "dark" that the
    // platform refuses must leave the app running on the system appearance.
    expect(applyThemeMode('dark')).toBe(FALLBACK_THEME_MODE);
    expect(setColorScheme).toHaveBeenLastCalledWith(undefined);
    expect(mockSetSdkThemeMode).toHaveBeenLastCalledWith('system');
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

it('keeps host and SDK appearances aligned through live changes', () => {
  for (const mode of ['dark', 'light', 'system'] as const) applyThemeMode(mode);
  expect(setColorScheme.mock.calls).toEqual([['dark'], ['light'], [undefined]]);
  expect(mockSetSdkThemeMode.mock.calls).toEqual([
    ['dark'],
    ['light'],
    ['system'],
  ]);
});

it('releases the SDK force if applying its mode throws', () => {
  mockSetSdkThemeMode.mockImplementation((mode) => {
    if (mode === 'light') throw new Error('SDK appearance unavailable');
  });
  expect(applyThemeMode('light')).toBe('system');
  expect(setColorScheme).toHaveBeenLastCalledWith(undefined);
  expect(mockSetSdkThemeMode).toHaveBeenLastCalledWith('system');
});

it('survives both appearance bridges being unavailable', () => {
  setColorScheme.mockImplementation(() => {
    throw new Error('host unavailable');
  });
  mockSetSdkThemeMode.mockImplementation(() => {
    throw new Error('SDK unavailable');
  });
  expect(() => applyThemeMode('dark')).not.toThrow();
  expect(applyThemeMode('dark')).toBe('system');
});

describe('restoreThemeMode', () => {
  it.each(['light', 'dark', 'system'] as const)(
    'restores %s to host and SDK before initialization',
    (mode) => {
      expect(restoreThemeMode(mode)).toBe(mode);
      expect(setColorScheme).toHaveBeenCalledWith(
        mode === 'system' ? undefined : mode
      );
      expect(mockSetSdkThemeMode).toHaveBeenCalledWith(mode);
      expect(mockUpdateColorScheme).toHaveBeenCalledWith(
        mode === 'system' ? undefined : mode,
        mode !== 'system'
      );
    }
  );

  it('never throws on a value read back from storage', () => {
    setColorScheme.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(restoreThemeMode({ theme: 'dark' })).toBe(FALLBACK_THEME_MODE);
    expect(restoreThemeMode('dark')).toBe(FALLBACK_THEME_MODE);
  });
});
