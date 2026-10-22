jest.mock('react-native', () => ({
  Platform: { select: (values: { default: string }) => values.default },
  View: 'View',
  Text: 'Text',
  Switch: 'Switch',
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('../components/SettingsRadio', () => ({ SettingsRadio: () => null }));
jest.mock('../components/SegmentControl', () => ({
  SegmentControl: () => null,
}));
jest.mock('../components/PillButton', () => ({ PillButton: () => null }));
jest.mock('../components/SampleRecipes', () => ({
  GroupHeader: () => null,
  ListDivider: () => null,
}));
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Switch } from 'react-native';
import { HostIntegrationPanel } from '../screens/HostIntegrationPanel';
import { chromeColors } from '../theme/branding';

it.each([false, true])(
  'uses accessible switch tokens in the host integration panel (dark=%s)',
  (isDark) => {
    const noop = jest.fn();
    const c = chromeColors(isDark);
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <HostIntegrationPanel
          isDark={isDark}
          displayMode="embed"
          onDisplayModeChange={noop}
          profileTapMode="appScreens"
          onProfileTapModeChange={noop}
          editEnabled
          onEditEnabledChange={noop}
          loginEnabled={false}
          onLoginEnabledChange={noop}
          urlOpeningMode="sampleRule"
          onUrlOpeningModeChange={noop}
          appManagedFields={[]}
          busy={false}
          onRestart={noop}
        />
      );
    });
    try {
      const switches = tree.root.findAllByType(Switch);
      expect(switches.length).toBeGreaterThan(0);
      for (const control of switches) {
        expect(control.props.trackColor).toEqual({
          false: c.track,
          true: c.control,
        });
        expect(control.props.thumbColor).toBe(
          control.props.value ? c.onControl : c.surfaceRaised
        );
      }
      act(() =>
        tree.root
          .findByProps({ testID: 'host-integration-login-switch' })
          .props.onValueChange(true)
      );
      expect(noop).toHaveBeenCalledWith(true);
    } finally {
      act(() => tree.unmount());
    }
  }
);
