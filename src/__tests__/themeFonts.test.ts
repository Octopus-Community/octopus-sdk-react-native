import { initialize } from '../initialize';

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

describe('initialize forwards the navBarItem text style', () => {
  it('includes navBarItem in the parsed font configuration', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: {
        fonts: {
          textStyles: {
            body1: { fontSize: { size: 16 } },
            navBarItem: { fontType: 'serif', fontSize: { size: 15 } },
          },
        },
      },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.fonts.parsedConfig.textStyles).toEqual({
      body1: { fontSize: 16 },
      navBarItem: { fontType: 'serif', fontSize: 15 },
    });
  });

  it('forwards a theme carrying only navBarItem', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: {
        fonts: { textStyles: { navBarItem: { fontSize: { size: 15 } } } },
      },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.theme.fonts.parsedConfig.textStyles).toEqual({
      navBarItem: { fontSize: 15 },
    });
  });

  it('adds no navBarItem entry when it is omitted', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: {
        fonts: { textStyles: { body1: { fontSize: { size: 16 } } } },
      },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(
      payload.theme.fonts.parsedConfig.textStyles.navBarItem
    ).toBeUndefined();
  });
});
