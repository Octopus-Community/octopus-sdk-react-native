jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { select: (values: { default: string }) => values.default },
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('../components/PillButton', () => ({ PillButton: 'PillButton' }));
let mockStatus: AppUpdateStatus = { kind: 'notFromPlayStore' };
jest.mock('../update/appUpdateStore', () => ({
  getAppUpdateStatus: () => mockStatus,
  subscribeToAppUpdate: () => () => {},
  runAppUpdateCheck: jest.fn(),
  startAppUpdateFlow: jest.fn(),
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import type { AppUpdateStatus } from '../update/appUpdate';
import { AppSection } from '../components/AppSection';

it('shows sideload provenance once and keeps the update check available', () => {
  mockStatus = { kind: 'notFromPlayStore' };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<AppSection isDark={false} />);
  });
  const matches = tree.root
    .findAllByType(Text)
    .filter((node) => node.props.children === 'Not installed from Play Store');
  expect(matches).toHaveLength(1);
  expect(
    tree.root.findByProps({ testID: 'sample-update-action' }).props.label
  ).toBe('Check for update');
  act(() => tree.unmount());
});

it('keeps a distinct update status and action next to store provenance', () => {
  mockStatus = { kind: 'available', availableVersionCode: 42 };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<AppSection isDark />);
  });
  expect(
    tree.root.findByProps({ testID: 'sample-update-status' }).props.children
  ).toBe('A new version is available');
  expect(
    tree.root.findByProps({ testID: 'sample-update-action' }).props.label
  ).toBe('Update now');
  act(() => tree.unmount());
});
