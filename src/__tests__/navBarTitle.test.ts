import { Platform } from 'react-native';
import { initialize } from '../initialize';
import { parseFontConfig } from '../internals/fontParser';
import { resetLogger, setLogger } from '../internals/logger';
import { LogLevel } from '../enums/LogLevel.enum';

const mockInitialize = jest.fn();
jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
  },
}));

beforeEach(() => {
  mockInitialize.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  resetLogger();
});

describe('navigation-bar title font parsing', () => {
  it('keeps the old parsed shape when unset', () => {
    expect(parseFontConfig({})).toBeNull();
    expect(parseFontConfig({ fontFamily: 'brand', fontWeight: 500 })).toEqual({
      textStyles: {},
      fontFamily: 'brand',
      fontWeight: 500,
    });
  });

  it.each([
    [{ fontSize: { size: 23.5 } }, { fontSize: 23.5 }],
    [{ fontFamily: '  title_font  ' }, { fontFamily: 'title_font' }],
    [
      { fontFamily: 'title_font', fontSize: { size: 25 } },
      { fontFamily: 'title_font', fontSize: 25 },
    ],
  ])('parses independent title properties %j', (navBarTitle, expected) => {
    expect(parseFontConfig({ navBarTitle })).toEqual({
      textStyles: {},
      navBarTitle: expected,
    });
  });

  it.each([0, -12, NaN, Infinity, -Infinity, 'large'])(
    'ignores invalid size %p',
    (size) => {
      const logger = jest.fn();
      setLogger(logger);
      expect(
        parseFontConfig({
          navBarTitle: {
            fontFamily: 'brand',
            fontSize: { size: size as number },
          },
        })
      ).toEqual({ textStyles: {}, navBarTitle: { fontFamily: 'brand' } });
      expect(logger).toHaveBeenCalledWith(
        LogLevel.WARN,
        expect.stringContaining('navBarTitle.fontSize'),
        undefined
      );
    }
  );

  it('treats empty and malformed family names as unset', () => {
    for (const fontFamily of ['', '  ', 42, null]) {
      expect(
        parseFontConfig({ navBarTitle: { fontFamily: fontFamily as string } })
      ).toBeNull();
    }
  });

  it('keeps global and body styles independent from the title', () => {
    expect(
      parseFontConfig({
        fontFamily: 'global',
        fontWeight: 700,
        textStyles: { body1: { fontSize: { size: 16 } } },
        navBarTitle: { fontFamily: 'title', fontSize: { size: 24 } },
      })
    ).toEqual({
      fontFamily: 'global',
      fontWeight: 700,
      textStyles: { body1: { fontSize: 16 } },
      navBarTitle: { fontFamily: 'title', fontSize: 24 },
    });
  });
});

describe('initialize platform handling', () => {
  async function init(fonts: Parameters<typeof parseFontConfig>[0]) {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'sso', appManagedFields: [] },
      theme: { fonts },
    });
    return mockInitialize.mock.calls.at(-1)[0].theme.fonts;
  }

  it('forwards the flattened override to Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(await init({ navBarTitle: { fontSize: { size: 24 } } })).toEqual({
      navBarTitle: { fontSize: { size: 24 } },
      parsedConfig: {
        textStyles: {},
        navBarTitle: { fontSize: 24 },
      },
    });
  });

  it.each([{}, { navBarTitle: { fontSize: { size: 24 } } }])(
    'omits an empty iOS fonts payload after stripping Android options: %j',
    async (fonts) => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      expect(await init(fonts)).toBeUndefined();
      expect(await init(undefined)).toBeUndefined();
    }
  );

  it('keeps the entire iOS fonts payload identical with and without the Android option', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const shared = {
      fontFamily: 'Brand',
      fontWeight: 500,
      textStyles: { body1: { fontSize: { size: 16 } } },
    };
    const without = await init(shared);
    const withTitle = {
      ...shared,
      navBarTitle: { fontFamily: 'android_title' },
    };
    expect(await init(withTitle)).toEqual(without);
    expect(withTitle.navBarTitle).toEqual({ fontFamily: 'android_title' });
    expect(without).toEqual({
      ...shared,
      parsedConfig: {
        fontFamily: 'Brand',
        fontWeight: 500,
        textStyles: { body1: { fontSize: 16 } },
      },
    });
  });
});
