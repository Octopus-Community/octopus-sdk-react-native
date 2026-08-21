import { initialize } from '../initialize';
import { setLogger, resetLogger } from '../internals/logger';
import { LogLevel } from '../enums/LogLevel.enum';

const mockInitialize = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
  },
}));

const logo = { uri: 'logo.png', width: 1, height: 1, scale: 1 };

beforeEach(() => {
  mockInitialize.mockReset();
  mockInitialize.mockResolvedValue(undefined);
});

afterEach(() => {
  resetLogger();
});

describe('initialize forwards topAppBar', () => {
  it('forwards a text title with center alignment and colored background', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      topAppBar: {
        title: { type: 'text', text: 'My Community' },
        alignment: 'center',
        coloredBackground: true,
      },
    });
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.topAppBar).toEqual({
      title: { type: 'text', text: 'My Community' },
      alignment: 'center',
      coloredBackground: true,
    });
  });

  it('forwards a logo title with leading alignment', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      topAppBar: { title: { type: 'logo' }, alignment: 'leading' },
    });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.topAppBar).toEqual({
      title: { type: 'logo' },
      alignment: 'leading',
    });
  });

  it('omits topAppBar from the payload when not provided', async () => {
    await initialize({ apiKey: 'k', connectionMode: { type: 'octopus' } });
    const payload = mockInitialize.mock.calls[0][0];
    expect(payload.topAppBar).toBeUndefined();
  });
});

describe('initialize warns on a text title combined with a theme logo', () => {
  it('logs a WARN when title is text and a theme logo is set', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { logo: { image: logo } },
      topAppBar: { title: { type: 'text', text: 'My Community' } },
    });
    const warnCalls = logger.mock.calls.filter(
      ([level]) => level === LogLevel.WARN
    );
    expect(warnCalls).toHaveLength(1);
    expect(warnCalls[0][1]).toMatch(/topAppBar/);
    expect(warnCalls[0][1]).toMatch(/logo/i);
  });

  it('does not warn when a text title is used without a theme logo', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      topAppBar: { title: { type: 'text', text: 'My Community' } },
    });
    expect(
      logger.mock.calls.filter(([level]) => level === LogLevel.WARN)
    ).toHaveLength(0);
  });

  it('does not warn for a logo title even when a theme logo is set', async () => {
    const logger = jest.fn();
    setLogger(logger);
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { logo: { image: logo } },
      topAppBar: { title: { type: 'logo' } },
    });
    expect(
      logger.mock.calls.filter(([level]) => level === LogLevel.WARN)
    ).toHaveLength(0);
  });
});
