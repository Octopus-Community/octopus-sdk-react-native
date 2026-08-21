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

async function initWithFonts(fonts: Record<string, unknown>) {
  await initialize({
    apiKey: 'k',
    connectionMode: { type: 'octopus' },
    theme: { fonts },
  });
  return mockInitialize.mock.calls[0][0].theme.fonts.parsedConfig;
}

describe('initialize forwards the theme-wide fontFamily and fontWeight', () => {
  it('forwards both next to the text styles', async () => {
    const parsed = await initWithFonts({
      fontFamily: 'MyBrandFont-Regular',
      fontWeight: 500,
      textStyles: { body1: { fontSize: { size: 16 } } },
    });
    expect(parsed).toEqual({
      fontFamily: 'MyBrandFont-Regular',
      fontWeight: 500,
      textStyles: { body1: { fontSize: 16 } },
    });
  });

  it('forwards a font configuration made only of fontFamily', async () => {
    // Both bridges key off `textStyles` to recognize a pre-processed config at all,
    // so it must be emitted even when empty or the whole config would be dropped.
    const parsed = await initWithFonts({ fontFamily: 'my_brand_font' });
    expect(parsed).toEqual({ fontFamily: 'my_brand_font', textStyles: {} });
  });

  it('forwards a font configuration made only of fontWeight', async () => {
    const parsed = await initWithFonts({ fontWeight: 700 });
    expect(parsed).toEqual({ fontWeight: 700, textStyles: {} });
  });

  it('adds neither key when they are omitted', async () => {
    const parsed = await initWithFonts({
      textStyles: { body1: { fontSize: { size: 16 } } },
    });
    expect(parsed.fontFamily).toBeUndefined();
    expect(parsed.fontWeight).toBeUndefined();
  });

  it('parses no configuration from an empty fonts object', async () => {
    expect(await initWithFonts({})).toBeNull();
  });

  it('treats a blank family name as unset, not as an override', async () => {
    // Unset and nothing else set, so there is no configuration to send at all.
    expect(await initWithFonts({ fontFamily: '   ' })).toBeNull();
  });

  it('trims a family name before forwarding it', async () => {
    expect((await initWithFonts({ fontFamily: '  Brand  ' })).fontFamily).toBe(
      'Brand'
    );
  });
});

describe('initialize validates the 100-900 fontWeight range', () => {
  it.each([100, 400, 900])('accepts %i', async (fontWeight) => {
    const logger = jest.fn();
    setLogger(logger);
    expect((await initWithFonts({ fontWeight })).fontWeight).toBe(fontWeight);
    expect(warningsOf(logger)).toHaveLength(0);
  });

  it.each([
    // The Flutter assert exists because `FontWeight.w100.index` is 0, not 100:
    // a host mapping from an index rather than a value lands here.
    ['below the range', 0],
    ['above the range', 1000],
    ['not a whole number', 450.5],
  ])('drops a weight %s with a warning', async (_label, fontWeight) => {
    const logger = jest.fn();
    setLogger(logger);
    const parsed = await initWithFonts({
      fontWeight: fontWeight as number,
      textStyles: { body1: { fontSize: { size: 16 } } },
    });
    expect(parsed.fontWeight).toBeUndefined();
    // The rest of the font configuration still applies.
    expect(parsed.textStyles).toEqual({ body1: { fontSize: 16 } });
    const warnings = warningsOf(logger);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('theme.fonts.fontWeight');
  });

  it('drops a non-numeric weight with a warning', async () => {
    const logger = jest.fn();
    setLogger(logger);
    const parsed = await initWithFonts({
      fontWeight: 'bold' as unknown as number,
    });
    expect(parsed).toBeNull();
    expect(warningsOf(logger)).toHaveLength(1);
  });
});

describe('fontFamily takes precedence over the per-style fontType', () => {
  it('names the superseded styles in a warning', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initWithFonts({
      fontFamily: 'Brand',
      textStyles: {
        title1: { fontType: 'serif' },
        body1: { fontType: 'monospace', fontSize: { size: 16 } },
        caption1: { fontSize: { size: 12 } },
      },
    });
    const warnings = warningsOf(logger);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('title1');
    expect(warnings[0]).toContain('body1');
    // A style carrying only a size is not superseded by a family.
    expect(warnings[0]).not.toContain('caption1');
  });

  it('still forwards the fontType values, which serve as the native fallback', async () => {
    // If the family does not resolve natively, each slot falls back to its fontType —
    // so the bridge must keep receiving both.
    const parsed = await initWithFonts({
      fontFamily: 'Brand',
      textStyles: { body1: { fontType: 'serif' } },
    });
    expect(parsed).toEqual({
      fontFamily: 'Brand',
      textStyles: { body1: { fontType: 'serif' } },
    });
  });

  it('warns for nothing when only fontType is set', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initWithFonts({ textStyles: { body1: { fontType: 'serif' } } });
    expect(warningsOf(logger)).toHaveLength(0);
  });

  it('warns for nothing when only fontFamily is set', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initWithFonts({ fontFamily: 'Brand' });
    expect(warningsOf(logger)).toHaveLength(0);
  });
});
