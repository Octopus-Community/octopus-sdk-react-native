import { initialize } from '../initialize';
import { setLogger, resetLogger } from '../internals/logger';
import { LogLevel } from '../enums/LogLevel.enum';

const mockInitialize = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
  },
}));

beforeEach(() => {
  mockInitialize.mockReset();
  mockInitialize.mockResolvedValue(undefined);
});

afterEach(() => {
  resetLogger();
});

function warningsOf(logger: jest.Mock): string[] {
  return logger.mock.calls
    .filter(([level]) => level === LogLevel.WARN)
    .map(([, message]) => String(message));
}

describe('initialize forwards the link and background theme colors', () => {
  it('forwards them from a single color set', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: {
        colors: {
          primary: '#3B82F6',
          link: '#C2410C',
          background: '#FFF7ED',
        },
      },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.colors).toEqual({
      primary: '#3B82F6',
      link: '#C2410C',
      background: '#FFF7ED',
    });
  });

  it('forwards them per mode from a dual-mode color set', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: {
        colors: {
          light: { link: '#C2410C', background: '#FFF7ED' },
          dark: { link: '#FDBA74', background: '#1C1917' },
        },
      },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.colors.light).toEqual({
      link: '#C2410C',
      background: '#FFF7ED',
    });
    expect(payload.theme.colors.dark).toEqual({
      link: '#FDBA74',
      background: '#1C1917',
    });
  });

  it('forwards a theme carrying only one of the two colors', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { colors: { link: '#C2410C' } },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.colors).toEqual({ link: '#C2410C' });
  });

  it('adds no default when they are omitted', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { colors: { primary: '#3B82F6' } },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.colors.link).toBeUndefined();
    expect(payload.theme.colors.background).toBeUndefined();
  });
});

describe('initialize warns on an invalid theme color', () => {
  it('names the offending key of a single color set', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { colors: { link: 'not-a-color', background: '#FFF7ED' } },
    });
    const warnings = warningsOf(logger);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('theme.colors.link');
  });

  it('names the offending mode of a dual-mode color set', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: {
        colors: {
          light: { background: '#FFF7ED' },
          dark: { background: 'rgb(0,0,0)' },
        },
      },
    });
    const warnings = warningsOf(logger);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('theme.colors.dark.background');
  });

  it('still forwards the theme so the valid colors apply', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { colors: { link: 'nope', background: '#FFF7ED' } },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.colors.background).toBe('#FFF7ED');
  });

  it('warns for nothing when no theme colors are set', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initialize({ apiKey: 'k', connectionMode: { type: 'octopus' } });
    expect(warningsOf(logger)).toHaveLength(0);
  });
});

describe('initialize canonicalizes theme colors for both bridges', () => {
  // Android validates with `Color.parseColor` and applies with `toColorInt()`, which
  // both require a leading `#` and a length of exactly 7 or 9. iOS accepts every form.
  // Without canonicalization these inputs would render on iOS and be silently dropped
  // back to the native default on Android.
  it('rewrites every accepted hex form to #RRGGBB / #AARRGGBB', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: {
        colors: {
          primary: '#F63',
          primaryLowContrast: 'FF6633',
          primaryHighContrast: '#80FF6633',
          onPrimary: 'fff',
          link: '#c2410c',
          background: 'FFF7ED',
        },
      },
    });
    expect(warningsOf(logger)).toHaveLength(0);
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.colors).toEqual({
      // #RGB doubles each digit, it never zero-pads.
      primary: '#FF6633',
      primaryLowContrast: '#FF6633',
      // 8 digits are AARRGGBB — alpha first, kept in place.
      primaryHighContrast: '#80FF6633',
      onPrimary: '#FFFFFF',
      link: '#C2410C',
      background: '#FFF7ED',
    });
  });

  it('canonicalizes both sides of a dual-mode color set', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: {
        colors: {
          light: { link: 'c2410c', background: '#fff' },
          dark: { link: '#FDBA74', background: '1C1917' },
        },
      },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.colors.light).toEqual({
      link: '#C2410C',
      background: '#FFFFFF',
    });
    expect(payload.theme.colors.dark).toEqual({
      link: '#FDBA74',
      background: '#1C1917',
    });
  });

  it('forwards an unparseable value untouched, next to the canonicalized ones', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { colors: { link: 'nope', background: 'fff7ed' } },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.colors).toEqual({
      link: 'nope',
      background: '#FFF7ED',
    });
    expect(warningsOf(logger)).toHaveLength(1);
  });

  it('does not mutate the theme object it was given', async () => {
    const colors = { link: 'c2410c' };
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { colors },
    });
    expect(colors.link).toBe('c2410c');
    expect(mockInitialize.mock.calls[0][0].theme.colors.link).toBe('#C2410C');
  });
});
