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
