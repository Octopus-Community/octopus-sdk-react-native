jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
  Clipboard: { setString: jest.fn() },
  NativeModules: {},
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 },
  Platform: { select: (value: { default: string }) => value.default },
}));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));
jest.mock(
  '@octopus-community/react-native',
  () => ({
    debugGetCommunityConfig: jest.fn(async () => ({
      exposeClientUserId: true,
      forceLoginOnStrongActions: false,
      displayAccountAge: false,
      forceNicknameChoice: false,
      consentTexts: null,
      termsAcceptanceMode: 'disabled',
    })),
    fetchCommunityData: jest.fn(),
    syncFollowGroups: jest.fn(),
    SyncFollowGroupStatus: { Applied: 'applied' },
  }),
  { virtual: true }
);

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Clipboard, Text, TouchableOpacity } from 'react-native';
import * as Octopus from '@octopus-community/react-native';
import { ClientProfileScreen } from '../screens/ClientProfileScreen';
import { SyncFollowGroupsPanel } from '../screens/panels/SyncFollowGroupsPanel';
import { SettingsOverview } from '../components/SettingsOverview';
import { connectionKind } from '../components/ConnectionStateCard';
import { DebugScreen } from '../screens/DebugScreen';
import { buildDebugInfoCards } from '../debug/debugInfo';
import { debugLog } from '../debug/debugLog';
import { apiKeySourceLabel, resolveApiKey } from '../config/demoConfig';
import type { DemoConfig } from '../config/demoConfig';
import { maskApiKey, rememberApiKey } from '../config/apiKeyMask';

const config: DemoConfig = {
  apiKeySource: 'custom',
  customApiKey: 'demo1111111111115678',
  selectedKeyId: null,
  userId: 'demo-user',
  theme: 'system',
  serverEnv: 'custom',
};
const connected = { connected: true, isGuest: false };
const debugProps = {
  primaryColor: '#123456',
  onPrimaryColor: '#ffffff',
  isInitialized: true,
  connectionState: connected,
  hasAccessToCommunity: true,
  notSeenNotificationsCount: 0,
  pushToken: null,
};
const textOf = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join('\n');

it.each([false, true])(
  'renders Settings and Debug info without a raw key (dark=%s)',
  async (isDark) => {
    const apiKey = resolveApiKey(config);
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(
        <>
          <SettingsOverview
            config={config}
            isDark={isDark}
            isInitialized
            initError={null}
            connectionState={connected}
            clientUserId="demo-user"
            entitlements={[]}
            hasFailedConnection={false}
            themeSummary="Follow system"
            languageSummary="Follow system"
            sessionStartedAt={null}
            effectiveApiKey={apiKey}
            onEditConfig={jest.fn()}
          />
          <DebugScreen
            {...debugProps}
            isDark={isDark}
            view="info"
            infoCards={buildDebugInfoCards({
              sampleVersionLabel: 'test',
              sdkVersion: 'test',
              build: null,
              serverLabel: 'Demo',
              host: 'api-demo2.8pus.io',
              community: 'Custom community',
              apiKeySource: apiKeySourceLabel(config),
              userId: config.userId,
              displayMode: 'embed',
              urlOpeningMode: 'defaultBrowser',
              profileTapMode: 'sdkScreens',
            })}
          />
        </>
      );
    });
    expect(textOf(tree)).not.toContain(apiKey);
    expect(textOf(tree)).toContain('SDK · Running, signed in');
    expect(textOf(tree)).toContain('connected');
    expect(textOf(tree)).not.toContain('anonymous');
    act(() => tree.unmount());
  }
);

it('keeps the rendered event/API log and its Copy action masked', () => {
  const key = rememberApiKey(resolveApiKey(config));
  debugLog.clear();
  debugLog.event('session', `apiKey=${key}`);
  debugLog.apiCall('initialize', `failed with ${key}`);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<DebugScreen {...debugProps} isDark={false} />);
  });
  expect(textOf(tree)).not.toContain(key);
  expect(textOf(tree)).toContain(maskApiKey(key));
  act(() =>
    tree.root.findByProps({ testID: 'debug-copy-button' }).props.onPress()
  );
  expect(Clipboard.setString).toHaveBeenCalledWith(
    debugLog.exportJson(['event'])
  );
  expect(jest.mocked(Clipboard.setString).mock.calls.at(-1)![0]).not.toContain(
    key
  );
  act(() => tree.unmount());
  debugLog.clear();
});

it.each([false, true])(
  'masks SDK rejection messages in the profile and group panels (dark=%s)',
  async (isDark) => {
    const key = rememberApiKey('panel3333333333339876');
    const error = new Error(`Rejected ${key}; x-api-key=unresolved3333339876`);
    jest.mocked(Octopus.fetchCommunityData).mockRejectedValueOnce(error);
    jest.mocked(Octopus.syncFollowGroups).mockRejectedValueOnce(error);
    debugLog.clear();
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(
        <>
          <ClientProfileScreen isDark={isDark} clientUserId="demo-user" />
          <SyncFollowGroupsPanel isDark={isDark} primaryColor="#123456" />
        </>
      );
    });
    await act(async () => {
      await tree.root.findAllByType(TouchableOpacity)[0]!.props.onPress();
    });
    const rendered = textOf(tree);
    expect(rendered.split(`Rejected ${maskApiKey(key)}`).length - 1).toBe(2);
    for (const output of [rendered, debugLog.exportJson()]) {
      expect(output).not.toContain(key);
      expect(output).not.toContain('unresolved3333339876');
    }
    act(() => tree.unmount());
    debugLog.clear();
  }
);

it.each([
  [null, 'off'],
  [{ connected: false, isGuest: false }, 'off'],
  [{ connected: true, isGuest: true }, 'guest'],
  [connected, 'connected'],
] as const)(
  'Debug info uses the same connection classification as Settings (%j)',
  (state, expected) => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <DebugScreen
          {...debugProps}
          connectionState={state}
          isDark={false}
          view="info"
        />
      );
    });
    expect(connectionKind(state)).toBe(expected);
    expect(textOf(tree).split('\n')).toContain(expected);
    act(() => tree.unmount());
  }
);
