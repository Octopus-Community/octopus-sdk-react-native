import { Appearance } from 'react-native';
import { setThemeMode } from '../setThemeMode';
import { colorSchemeManager } from '../internals/colorSchemeManager';

const mockUpdateColorScheme = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    updateColorScheme: (...args: unknown[]) => mockUpdateColorScheme(...args),
  },
}));

beforeEach(() => {
  mockUpdateColorScheme.mockReset();
  // Release any force left over from a previous test — `colorSchemeManager`
  // is a module-level singleton, so state otherwise leaks across tests.
  setThemeMode('system');
  colorSchemeManager.stopListening();
  mockUpdateColorScheme.mockReset();
});

describe('setThemeMode', () => {
  it('forces light and reports it to the native module', () => {
    setThemeMode('light');
    expect(mockUpdateColorScheme).toHaveBeenCalledWith('light');
  });

  it('forces dark and reports it to the native module', () => {
    setThemeMode('dark');
    expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark');
  });

  it('releases a force back to the system value on "system"', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    colorSchemeManager.startListening();
    mockUpdateColorScheme.mockClear();

    setThemeMode('dark');
    expect(mockUpdateColorScheme).toHaveBeenLastCalledWith('dark');

    setThemeMode('system');
    expect(mockUpdateColorScheme).toHaveBeenLastCalledWith('light');
  });

  it('a forced value takes precedence over the system-observed scheme', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    colorSchemeManager.startListening();

    setThemeMode('dark');
    expect(mockUpdateColorScheme).toHaveBeenLastCalledWith('dark');
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

    expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark');
    expect(mockUpdateColorScheme).not.toHaveBeenCalledWith('light');

    addChangeListenerSpy.mockRestore();
    getColorSchemeSpy.mockRestore();
  });
});
