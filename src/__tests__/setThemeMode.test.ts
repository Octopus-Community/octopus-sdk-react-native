import { Appearance } from 'react-native';
import { setThemeMode } from '../setThemeMode';
import { initialize } from '../initialize';
import { colorSchemeManager } from '../internals/colorSchemeManager';
import { setIsInitialised } from '../internals/initialisationState';

const mockUpdateColorScheme = jest.fn();
const mockInitialize = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    updateColorScheme: (...args: unknown[]) => mockUpdateColorScheme(...args),
    initialize: (...args: unknown[]) => mockInitialize(...args),
  },
}));

const INIT_OPTIONS = {
  apiKey: 'k',
  connectionMode: { type: 'octopus' },
} as const;

/** The `colorScheme` the last `initialize()` handed to the native side. */
function initialisedWithColorScheme(): unknown {
  expect(mockInitialize).toHaveBeenCalledTimes(1);
  return mockInitialize.mock.calls[0][0].colorScheme;
}

beforeEach(() => {
  mockUpdateColorScheme.mockReset();
  mockInitialize.mockReset();
  mockInitialize.mockResolvedValue(undefined);
  setIsInitialised(false);
  // Release any force left over from a previous test — `colorSchemeManager`
  // is a module-level singleton, so state otherwise leaks across tests.
  setThemeMode('system');
  colorSchemeManager.stopListening();
  mockUpdateColorScheme.mockReset();
});

describe('setThemeMode', () => {
  it('forces light and reports it to the native module', () => {
    setThemeMode('light');
    expect(mockUpdateColorScheme).toHaveBeenCalledWith('light', true);
  });

  it('forces dark and reports it to the native module', () => {
    setThemeMode('dark');
    expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark', true);
  });

  it('releases a force on "system" without pinning a system value', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    colorSchemeManager.startListening();
    mockUpdateColorScheme.mockClear();

    setThemeMode('dark');
    expect(mockUpdateColorScheme).toHaveBeenLastCalledWith('dark', true);

    // Released: no scheme goes out, flagged as not forced. Android falls back to
    // its own configuration at render time instead of the value JS observed here,
    // iOS drops its interface-style override.
    setThemeMode('system');
    expect(mockUpdateColorScheme).toHaveBeenLastCalledWith(undefined, false);
  });

  it('starts the native side from a force set before initialize()', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');

    setThemeMode('dark');
    mockUpdateColorScheme.mockClear();

    await initialize(INIT_OPTIONS);

    // The Android theme config is built from this value: it has to be the force,
    // not the system scheme, or the force would be overwritten one native call
    // after being pushed.
    expect(initialisedWithColorScheme()).toBe('dark');
    // And the force is pushed again once the native side exists, for iOS.
    expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark', true);
  });

  it('keeps an active force across a second initialize()', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');

    await initialize(INIT_OPTIONS);
    setThemeMode('dark');
    mockInitialize.mockClear();
    mockUpdateColorScheme.mockClear();

    await initialize(INIT_OPTIONS);

    expect(initialisedWithColorScheme()).toBe('dark');
    expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark', true);
  });

  it('initializes from the system scheme and sends nothing more when no force is active', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');

    await initialize(INIT_OPTIONS);

    expect(initialisedWithColorScheme()).toBe('light');
    expect(mockUpdateColorScheme).not.toHaveBeenCalled();
  });

  it('a forced value takes precedence over the system-observed scheme', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    colorSchemeManager.startListening();

    setThemeMode('dark');
    expect(mockUpdateColorScheme).toHaveBeenLastCalledWith('dark', true);
  });

  it('handles a native rejection instead of floating it (issue #257)', async () => {
    // The bridge call is fired, never awaited: an unhandled rejection here reaches
    // the host on a path it has no way to catch — including the example's launch
    // restore, which is what turned one refused theme into a crash-loop.
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    const rejection = Promise.reject(new Error('INVALID_ARGS'));
    mockUpdateColorScheme.mockReturnValue(rejection);

    expect(() => setThemeMode('dark')).not.toThrow();

    await expect(rejection).rejects.toThrow('INVALID_ARGS');
    // Two macrotask turns: enough for Node to have reported an unhandled rejection
    // if nothing had attached a handler.
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('keeps observing after a native rejection', () => {
    // A rejection is the module answering, not the module being absent, so the
    // appearance observers stay attached and the next change retries.
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    colorSchemeManager.startListening();
    mockUpdateColorScheme.mockReturnValue(Promise.reject(new Error('nope')));

    setThemeMode('dark');

    mockUpdateColorScheme.mockReset();
    mockUpdateColorScheme.mockReturnValue(undefined);
    setThemeMode('light');
    expect(mockUpdateColorScheme).toHaveBeenCalledWith('light', true);
  });

  it('stops observing when the native module is not linked at all', () => {
    // The synchronous throw of the `nativeModule` linking Proxy: nothing this
    // manager does can ever succeed, so it unsubscribes rather than throwing on
    // every future appearance change.
    const remove = jest.fn();
    const addChangeListenerSpy = jest
      .spyOn(Appearance, 'addChangeListener')
      .mockReturnValue({ remove } as unknown as ReturnType<
        typeof Appearance.addChangeListener
      >);
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    colorSchemeManager.startListening();
    mockUpdateColorScheme.mockImplementation(() => {
      throw new Error("doesn't seem to be linked");
    });

    expect(() => setThemeMode('dark')).not.toThrow();
    expect(remove).toHaveBeenCalled();

    addChangeListenerSpy.mockRestore();
  });

  it('does not leak a system Appearance change to the native module while forced', () => {
    // The TSDoc promises the forced value keeps winning even while this
    // module keeps reacting to system changes internally — capture the
    // listener `startListening()` registers so this test can fire a system
    // change directly, rather than depending on the real native Appearance
    // bridge to emit one.
    let systemChangeListener:
      | Parameters<typeof Appearance.addChangeListener>[0]
      | undefined;
    const addChangeListenerSpy = jest
      .spyOn(Appearance, 'addChangeListener')
      .mockImplementation((listener) => {
        systemChangeListener = listener;
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof Appearance.addChangeListener
        >;
      });
    const getColorSchemeSpy = jest
      .spyOn(Appearance, 'getColorScheme')
      .mockReturnValue('light');

    colorSchemeManager.startListening();
    setThemeMode('dark');
    mockUpdateColorScheme.mockClear();

    // Simulate the system switching to light while 'dark' is still forced.
    systemChangeListener?.({ colorScheme: 'light' });

    expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark', true);
    expect(mockUpdateColorScheme).not.toHaveBeenCalledWith(
      'light',
      expect.anything()
    );

    addChangeListenerSpy.mockRestore();
    getColorSchemeSpy.mockRestore();
  });
});
