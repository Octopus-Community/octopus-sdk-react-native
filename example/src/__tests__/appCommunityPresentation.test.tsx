jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  default: { OS: 'android' },
}));
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  Clipboard: { setString: jest.fn() },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn(async () => {}) },
  Image: { resolveAssetSource: () => ({ uri: 'asset.png' }) },
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  Modal: 'Modal',
  NativeModules: { SampleModalStatusBar: { setStyle: jest.fn() } },
  findNodeHandle: jest.fn((node) => node?.nativeTag ?? null),
  processColor: jest.requireActual(
    'react-native/Libraries/StyleSheet/processColor'
  ).default,
  ActivityIndicator: 'ActivityIndicator',
  Platform: {
    OS: 'android',
    select: (values: Record<string, unknown>) => values.default,
  },
  StyleSheet: {
    create: (value: unknown) => value,
    absoluteFill: {},
    absoluteFillObject: {},
    hairlineWidth: 1,
  },
  PanResponder: { create: (value: unknown) => ({ panHandlers: value }) },
  Appearance: { setColorScheme: jest.fn() },
  useColorScheme: () => 'light',
  requireNativeComponent: (name: string) => name,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));
jest.mock(
  '@octopus-community/react-native',
  () => ({
    OctopusUIView: 'OctopusUIView',
    initialize: jest.fn(async () => {}),
    connectUser: jest.fn(async () => {}),
    disconnectUser: jest.fn(async () => {}),
    switchCommunity: jest.fn(async () => {}),
    reset: jest.fn(async () => {}),
    isConnectUserError: jest.fn((error: { code?: string }) => !!error?.code),
    debugOverrideExposeClientUserId: jest.fn(async () => {}),
    closeUI: jest.fn(async () => {}),
    setLogLevel: jest.fn(),
    setThemeMode: jest.fn(),
    useUserTokenProvider: jest.fn(),
    useBridgeShareTokenProvider: jest.fn(),
    overrideDefaultLocale: jest.fn(async () => {}),
    addHasAccessToCommunityListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotSeenNotificationsCountListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    addNavigateToUrlListener: jest.fn(() => ({ remove: jest.fn() })),
    addConnectionStateListener: jest.fn(() => ({ remove: jest.fn() })),
    addProfileListener: jest.fn(() => ({ remove: jest.fn() })),
    addSDKEventListener: jest.fn(() => ({ remove: jest.fn() })),
    addLoginRequiredListener: jest.fn(() => ({ remove: jest.fn() })),
    addEditUserListener: jest.fn(() => ({ remove: jest.fn() })),
    addNavigateToProfileListener: jest.fn(() => ({ remove: jest.fn() })),
    UrlOpeningStrategy: { Default: 'default' },
  }),
  { virtual: true }
);
jest.mock('../config/demoConfig', () => ({
  octopusUserId: 'demo-user',
  octopusUserTokens: {
    none: '',
    premium: '',
    moderator: '',
    premiumModerator: '',
  },
  octopusIsProdServer: false,
  octopusApiServer: { host: 'demo.invalid' },
  DEMO_HOST: 'demo.invalid',
  PRODUCTION_HOST: 'prod.invalid',
  octopusServerLabel: 'Demo',
  octopusHostLabel: 'Demo',
  resolveApiKey: jest.fn(() => 'unit-test-demo-key'),
  communityLabel: () => 'Demo community',
  apiKeySourceLabel: () => 'Test fixture',
  ENTITLEMENT_LABELS: { none: 'None' },
  applySwitchedCommunity: (config: unknown) => config,
}));
jest.mock('../config/configStorage', () => ({
  loadPersistedDemoConfig: jest.fn(async () => ({
    apiKeySource: 'demo',
    customApiKey: '',
    selectedKeyId: null,
    userId: 'demo-user',
    theme: 'system',
    serverEnv: 'demo',
  })),
  persistDemoConfig: jest.fn(),
  clearPersistedDemoConfig: jest.fn(async () => {}),
}));
jest.mock('../push', () => ({
  setupOctopusPush: jest.fn(async () => jest.fn()),
}));
jest.mock('../navigation/useHardwareBack', () => ({
  useHardwareBack: jest.fn(),
  useHardwareBackListener: jest.fn(),
}));
jest.mock('../update/appUpdate', () => ({ isAppUpdateSupported: () => false }));
jest.mock('../components/SampleSystemBars', () => ({
  SampleSystemBars: () => null,
}));
jest.mock('../components/AppUpdateSnackbar', () => ({
  AppUpdateSnackbar: () => null,
}));
jest.mock('../components/ProductionWarningBanner', () => ({
  ProductionWarningBanner: () => null,
}));
jest.mock('../components/SettingsOverview', () => ({
  SettingsOverview: () => null,
}));
jest.mock('../screens/SettingsScreen', () => ({ SettingsScreen: () => null }));
jest.mock('../screens/ConfigScreen', () => ({ ConfigScreen: 'ConfigScreen' }));
jest.mock('../screens/ScenariosScreen', () => ({
  ScenariosScreen: 'ScenariosScreen',
}));
jest.mock('../screens/DebugScreen', () => ({ DebugScreen: 'DebugScreen' }));
jest.mock('../screens/ClientProfileScreen', () => ({
  ClientProfileScreen: () => null,
}));
jest.mock('../screens/SignInScreen', () => ({ SignInScreen: () => null }));
jest.mock('../screens/EditProfileScreen', () => ({
  EditProfileScreen: () => null,
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Appearance, Modal, NativeModules, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Octopus from '@octopus-community/react-native';
import App from '../App';
import { CommunityPresentation } from '../components/CommunityPresentation';
import { HostScreenModal } from '../components/HostScreenModal';
import { ScenariosScreen } from '../screens/ScenariosScreen';
import { DebugScreen } from '../screens/DebugScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import * as demoConfig from '../config/demoConfig';
import { DebugConsoleSheet } from '../components/DebugConsoleSheet';
import { AppBar } from '../components/AppBar';
import { SampleSystemBars } from '../components/SampleSystemBars';
import { chromeColors } from '../theme/branding';
import { TabBar } from '../components/TabBar';
import { CommunityScreen } from '../screens/CommunityScreen';
import { pushInbox } from '../navigation/pushInbox';
import { sampleSupport } from '../config/sampleSupport';
import { resolveApiKey } from '../config/demoConfig';
import { maskApiKey, redactApiKeys } from '../config/apiKeyMask';

async function mountApp() {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<App />, {
      createNodeMock: (element) =>
        element.type === Modal ? { nativeTag: 42 } : null,
    });
  });
  return tree;
}

const pushTap = (id: string) => ({
  id,
  notification: {
    title: '',
    body: '',
    linkPath: '/post/demo',
    rawPayload: { message_id: id },
  },
});

function enableFeedback() {
  const previousSheet = sampleSupport.FeedbackSheet;
  // The real internal sheet is excluded from the public mirror. Its Modal prop
  // forwarding is covered separately by feedback.local.test.ts.
  sampleSupport.FeedbackSheet = function FeedbackSheet({
    visible,
    onClose,
    onDismiss,
  }) {
    return (
      <Modal visible={visible} onRequestClose={onClose} onDismiss={onDismiss} />
    );
  };
  return () => {
    sampleSupport.FeedbackSheet = previousSheet;
  };
}

it('dispatches Community retaps from the tab bar, preserving the push target on ordinary tab visits', async () => {
  const tree = await mountApp();
  try {
    const community = () => tree.root.findByType(CommunityScreen);
    const tabs = () => tree.root.findByType(TabBar);
    const tap = pushTap('app-retap');
    await act(async () => {
      await pushInbox.enqueue(tap);
    });
    const generation = community().props.communitySessionNonce;
    expect(community().props.notification).toEqual(tap.notification);
    expect(tabs().props.activeTab).toBe('community');
    act(() => tabs().props.onTabChange('settings'));
    act(() => tabs().props.onTabChange('community'));
    expect(community().props.communitySessionNonce).toBe(generation);
    expect(community().props.notification).toEqual(tap.notification);
    act(() => tabs().props.onTabChange('community'));
    expect(community().props.communitySessionNonce).toBe(generation + 1);
    expect(community().props.notification).toBeNull();
  } finally {
    act(() => tree.unmount());
  }
});

it.each([
  ['ios', false],
  ['ios', true],
  ['android', false],
] as const)(
  'routes a push after the feedback sheet closes on %s (already closing: %s)',
  async (platform, alreadyClosing) => {
    const previousPlatform = Platform.OS;
    Platform.OS = platform;
    const restoreFeedback = enableFeedback();
    const tree = await mountApp();
    try {
      const sheet = () => tree.root.findByType(sampleSupport.FeedbackSheet!);
      const modal = () => sheet().findByType(Modal);
      const community = () => tree.root.findByType(CommunityScreen);
      act(() => tree.root.findByType(SettingsScreen).props.onOpenFeedback());
      expect(modal().props.visible).toBe(true);
      if (alreadyClosing) act(() => modal().props.onRequestClose());
      const tap = pushTap(`app-feedback-${platform}-${alreadyClosing}`);
      await act(async () => {
        await pushInbox.enqueue(tap);
      });
      expect(modal().props.visible).toBe(false);
      if (platform === 'ios') {
        expect(community().props.notification).toBeNull();
        expect(pushInbox.snapshot()).toEqual([tap]);
        await act(async () => modal().props.onDismiss());
      }
      expect(community().props.notification).toEqual(tap.notification);
      expect(tree.root.findByType(TabBar).props.activeTab).toBe('community');
      expect(pushInbox.snapshot()).toHaveLength(0);
    } finally {
      act(() => tree.unmount());
      restoreFeedback();
      Platform.OS = previousPlatform;
    }
  }
);

it('waits for auxiliary overlays, then the host screen, then the community modal and native fullscreen before routing on iOS', async () => {
  const previousPlatform = Platform.OS;
  Platform.OS = 'ios';
  const restoreFeedback = enableFeedback();
  const tree = await mountApp();
  try {
    const presentation = () => tree.root.findByType(CommunityPresentation);
    const host = () => tree.root.findByType(HostScreenModal);
    const community = () => tree.root.findByType(CommunityScreen);
    act(() =>
      tree.root.findByType(ScenariosScreen).props.onOpenPresentation('modal')
    );
    await act(async () => {
      jest.mocked(Octopus.addLoginRequiredListener).mock.calls.at(-1)![0]();
    });
    act(() => host().props.onShow());
    act(() =>
      tree.root.findByType(SettingsScreen).props.onOpenDebug('console')
    );
    await act(async () => {
      await jest
        .mocked(Octopus.addNavigateToUrlListener)
        .mock.calls.at(-1)![0]('https://www.octopuscommunity.com/contact');
    });
    act(() => tree.root.findByType(SettingsScreen).props.onOpenFeedback());
    const consoleModal = tree.root
      .findByType(DebugConsoleSheet)
      .findByType(Modal);
    const webModal = tree.root
      .findAllByType(Modal)
      .filter((modal) => modal.findAllByType(WebView).length)
      .at(-1)!;
    const feedbackModal = tree.root
      .findByType(sampleSupport.FeedbackSheet!)
      .findByType(Modal);
    jest.mocked(Octopus.closeUI).mockClear();
    let nativeClosed!: () => void;
    jest.mocked(Octopus.closeUI).mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          nativeClosed = done;
        })
    );
    const tap = pushTap('app-nested-dismissal');
    await act(async () => {
      await pushInbox.enqueue(tap);
    });
    expect(consoleModal.props.visible).toBe(false);
    expect(webModal.props.visible).toBe(false);
    expect(feedbackModal.props.visible).toBe(false);
    expect(host().props.visible).toBe(true);
    expect(presentation().props.mode).toBe('modal');
    await act(async () => {
      feedbackModal.props.onDismiss();
      consoleModal.props.onDismiss();
    });
    expect(host().props.visible).toBe(true);
    expect(Octopus.closeUI).not.toHaveBeenCalled();
    await act(async () => webModal.props.onDismiss());
    expect(host().props.visible).toBe(false);
    expect(presentation().props.mode).toBe('modal');
    expect(Octopus.closeUI).not.toHaveBeenCalled();
    await act(async () => host().props.onDismiss());
    expect(presentation().props.mode).toBeNull();
    expect(Octopus.closeUI).not.toHaveBeenCalled();
    await act(async () => presentation().props.onDismiss());
    expect(Octopus.closeUI).toHaveBeenCalledTimes(1);
    expect(community().props.notification).toBeNull();
    expect(pushInbox.snapshot()).toEqual([tap]);
    await act(async () => nativeClosed());
    expect(community().props.notification).toEqual(tap.notification);
    expect(pushInbox.snapshot()).toHaveLength(0);
  } finally {
    act(() => tree.unmount());
    restoreFeedback();
    Platform.OS = previousPlatform;
  }
});

it('uses the avatar-only default, then applies managed fields to initialization, host editing and community switches', async () => {
  const tokens = jest.replaceProperty(
    demoConfig.octopusUserTokens,
    'none',
    'test-fixture-token'
  );
  const tree = await mountApp();
  try {
    const settings = () => tree.root.findByType(SettingsScreen);
    const scenarios = () => tree.root.findByType(ScenariosScreen);
    const integration = () => settings().props.integration;
    expect(
      jest.mocked(Octopus.initialize).mock.calls.at(-1)![0].connectionMode
    ).toEqual({
      type: 'sso',
      appManagedFields: ['profilePicture'],
    });
    await act(async () => settings().props.onConnectUser());
    expect(settings().props.isMockUserConnected).toBe(true);
    const disconnectCount = jest.mocked(Octopus.disconnectUser).mock.calls
      .length;
    await act(async () =>
      integration().props.onRestart(['username', 'biography'])
    );
    expect(Octopus.disconnectUser).toHaveBeenCalledTimes(disconnectCount + 1);
    expect(settings().props.isMockUserConnected).toBe(false);
    expect(
      jest.mocked(Octopus.initialize).mock.calls.at(-1)![0].connectionMode
    ).toEqual({
      type: 'sso',
      appManagedFields: ['username', 'biography'],
    });
    await act(async () => settings().props.onConnectUser());
    await act(async () => {
      jest
        .mocked(Octopus.addEditUserListener)
        .mock.calls.at(-1)![0]({ fieldToEdit: 'biography' });
    });
    const editor = () => tree.root.findByType(EditProfileScreen);
    expect(editor().props.fieldToEdit).toBe('biography');
    expect(editor().props.appManagedFields).toEqual(['username', 'biography']);
    expect(editor().props.canSave).toBe(true);
    await act(async () => editor().props.onSave({ biography: '' }));
    expect(Octopus.connectUser).toHaveBeenLastCalledWith({
      userId: 'demo-user',
      profile: {
        username: 'John Doe',
        profilePicture: 'https://i.pravatar.cc/150',
        biography: '',
      },
    });
    expect(tree.root.findAllByType(EditProfileScreen)).toHaveLength(0);
    // Reconnect uses the last successfully supplied values, including the cleared bio.
    await act(async () => settings().props.onConnectUser());
    expect(
      jest.mocked(Octopus.connectUser).mock.calls.at(-1)![0].profile?.biography
    ).toBe('');
    await act(async () =>
      scenarios().props.onSwitchCommunity({
        key: 'unit-test-other-key',
        label: 'Demo B',
      })
    );
    expect(
      jest.mocked(Octopus.switchCommunity).mock.calls.at(-1)![0].connectionMode
    ).toEqual({
      type: 'sso',
      appManagedFields: ['username', 'biography'],
    });
    // Reset returns to the default without initializing the old session during reset.
    const initializationCount = jest.mocked(Octopus.initialize).mock.calls
      .length;
    await act(async () => settings().props.onResetData());
    expect(Octopus.initialize).toHaveBeenCalledTimes(initializationCount);
    await act(async () =>
      tree.root.findByType('ConfigScreen' as never).props.onStart({
        apiKeySource: 'demo',
        customApiKey: '',
        selectedKeyId: null,
        userId: 'demo-user',
        theme: 'system',
        serverEnv: 'demo',
      })
    );
    expect(
      jest.mocked(Octopus.initialize).mock.calls.at(-1)![0].connectionMode
    ).toEqual({
      type: 'sso',
      appManagedFields: ['profilePicture'],
    });
  } finally {
    act(() => tree.unmount());
    tokens.restore();
  }
});

it('keeps the host connection on Restart when managed fields are unchanged, regardless of order', async () => {
  const tree = await mountApp();
  try {
    const settings = () => tree.root.findByType(SettingsScreen);
    const restart = (fields: Octopus.UserProfileField[]) =>
      settings().props.integration.props.onRestart(fields);
    await act(async () => settings().props.onConnectUser());
    const disconnectCount = jest.mocked(Octopus.disconnectUser).mock.calls
      .length;
    const initializationCount = jest.mocked(Octopus.initialize).mock.calls
      .length;
    await act(async () => restart(['profilePicture']));
    expect(settings().props.isMockUserConnected).toBe(true);
    expect(Octopus.disconnectUser).toHaveBeenCalledTimes(disconnectCount);
    expect(Octopus.initialize).toHaveBeenCalledTimes(initializationCount + 1);

    await act(async () => restart(['username', 'biography', 'profilePicture']));
    await act(async () => settings().props.onConnectUser());
    const changedDisconnectCount = jest.mocked(Octopus.disconnectUser).mock
      .calls.length;
    await act(async () => restart(['profilePicture', 'biography', 'username']));
    expect(settings().props.isMockUserConnected).toBe(true);
    expect(Octopus.disconnectUser).toHaveBeenCalledTimes(
      changedDisconnectCount
    );
  } finally {
    act(() => tree.unmount());
  }
});

it('waits for the SDK to disconnect before applying different managed fields on Restart', async () => {
  const tree = await mountApp();
  try {
    const settings = () => tree.root.findByType(SettingsScreen);
    await act(async () => settings().props.onConnectUser());
    const initializationCount = jest.mocked(Octopus.initialize).mock.calls
      .length;
    let resolve!: () => void;
    jest.mocked(Octopus.disconnectUser).mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done;
      })
    );
    let restarting!: Promise<void>;
    act(() => {
      restarting = settings().props.integration.props.onRestart([
        'biography',
        'profilePicture',
      ]);
    });
    expect(settings().props.isMockUserConnected).toBe(false);
    expect(settings().props.integration.props.busy).toBe(true);
    expect(Octopus.initialize).toHaveBeenCalledTimes(initializationCount);
    expect(settings().props.integration.props.appManagedFields).toEqual([
      'profilePicture',
    ]);
    await act(async () => {
      resolve();
      await restarting;
    });
    expect(Octopus.initialize).toHaveBeenCalledTimes(initializationCount + 1);
    expect(
      jest.mocked(Octopus.initialize).mock.calls.at(-1)![0].connectionMode
    ).toEqual({
      type: 'sso',
      appManagedFields: ['biography', 'profilePicture'],
    });
  } finally {
    act(() => tree.unmount());
  }
});

it('waits for connectUser before retaining profile edits, and leaves a failed save visible', async () => {
  const tokens = jest.replaceProperty(
    demoConfig.octopusUserTokens,
    'none',
    'test-fixture-token'
  );
  const premium = jest.replaceProperty(
    demoConfig.octopusUserTokens,
    'premium',
    'test-fixture-premium-token'
  );
  const consoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});
  const tree = await mountApp();
  try {
    const settings = () => tree.root.findByType(SettingsScreen);
    await act(async () =>
      settings().props.integration.props.onRestart([
        'username',
        'biography',
        'profilePicture',
      ])
    );
    await act(async () =>
      tree.root
        .findByType(ScenariosScreen)
        .props.onConnectUser('premium', { nickname: 'Client A' })
    );
    await act(async () => {
      jest
        .mocked(Octopus.addEditUserListener)
        .mock.calls.at(-1)![0]({ fieldToEdit: null });
    });
    const editor = () => tree.root.findByType(EditProfileScreen);
    let resolve!: () => void;
    jest.mocked(Octopus.connectUser).mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done;
      })
    );
    let saving!: Promise<void>;
    act(() => {
      saving = editor().props.onSave({
        username: 'Updated name',
        biography: 'Updated bio',
      });
    });
    expect(editor().props.busy).toBe(true);
    expect(editor().props.user.profile.username).toBe('Client A');
    expect(editor().props.user.profile.biography).toBeUndefined();
    await act(async () => {
      resolve();
      await saving;
    });
    const dismiss = tree.root.findByType(HostScreenModal).props.onDismiss;
    act(() => dismiss());
    await act(async () => {
      jest
        .mocked(Octopus.addEditUserListener)
        .mock.calls.at(-1)![0]({ fieldToEdit: 'username' });
    });
    expect(editor().props.user.profile).toMatchObject({
      username: 'Updated name',
      biography: 'Updated bio',
    });
    // Edits keep the entitlement variant of the current host account.
    const provider = jest
      .mocked(Octopus.useUserTokenProvider)
      .mock.calls.at(-1)![0];
    await act(async () => {
      await expect(provider()).resolves.toBe('test-fixture-premium-token');
    });
    jest
      .mocked(Octopus.connectUser)
      .mockRejectedValueOnce(new Error('Connection refused'));
    await act(async () => editor().props.onSave({ username: 'Rejected name' }));
    expect(editor().props.error).toContain('Connection refused');
    expect(editor().props.user).toBeNull();
    expect(editor().props.canSave).toBe(false);
    expect(settings().props.isMockUserConnected).toBe(false);
    expect(
      jest.mocked(Octopus.connectUser).mock.calls.at(-1)![0].profile
    ).toEqual({
      username: 'Rejected name',
      biography: 'Updated bio',
      profilePicture: 'https://i.pravatar.cc/150',
    });
  } finally {
    act(() => tree.unmount());
    tokens.restore();
    premium.restore();
    consoleError.mockRestore();
  }
});

it('registers the committed key before initialize and logs redacted init name and stack', async () => {
  const key = 'unit-test-demo-key';
  const error = new Error(`Rejected ${key}`);
  error.stack = `Error: Rejected ${key}\n    at initialize (${key}:10:2)`;
  jest.mocked(Octopus.initialize).mockImplementationOnce(async () => {
    expect(redactApiKeys(`Rejected ${key}`)).toBe(
      `Rejected ${maskApiKey(key)}`
    );
    throw error;
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  let tree!: ReactTestRenderer;
  try {
    tree = await mountApp();
    expect(log).toHaveBeenCalledWith(
      'Octopus init error',
      expect.stringContaining(`at initialize (${maskApiKey(key)}:10:2)`)
    );
    expect(
      log.mock.calls.find(([label]) => label === 'Octopus init error')![1]
    ).not.toContain(key);
  } finally {
    if (tree) act(() => tree.unmount());
    log.mockRestore();
  }
});

it('reuses key resolution across unrelated renders and keeps connectUser name/code/stack redacted', async () => {
  const tree = await mountApp();
  const resolve = jest.mocked(resolveApiKey);
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const key = 'unit-test-demo-key';
  const error = Object.assign(new Error(`Rejected ${key}`), {
    name: 'ConnectUserError',
    code: 'INVALID_TOKEN',
    stack: `ConnectUserError: Rejected ${key}\n    at connectUser (${key}:10:2)`,
  });
  jest.mocked(Octopus.connectUser).mockRejectedValueOnce(error);
  try {
    resolve.mockClear();
    act(() =>
      tree.root.findByType(ScenariosScreen).props.onOpenPresentation('sheet')
    );
    expect(resolve).not.toHaveBeenCalled();
    await act(async () => {
      await tree.root.findByType(SettingsScreen).props.onConnectUser();
    });
    expect(log).toHaveBeenCalledWith(
      'Octopus connectUser failed',
      expect.stringContaining(
        `ConnectUserError: Rejected ${maskApiKey(key)} (INVALID_TOKEN)`
      )
    );
    const output = log.mock.calls.find(
      ([label]) => label === 'Octopus connectUser failed'
    )![1];
    expect(output).toContain(`at connectUser (${maskApiKey(key)}:10:2)`);
    expect(output).not.toContain(key);
  } finally {
    act(() => tree.unmount());
    log.mockRestore();
  }
});

it.each(['modal', 'sheet'] as const)(
  'opens one %s community view, relocates host/debug/WebView overlays into it, then restores them on close',
  async (mode) => {
    const tree = await mountApp();
    const scenarios = () => tree.root.findByType(ScenariosScreen);
    act(() => scenarios().props.onOpenPresentation(mode));
    const presentation = () => tree.root.findByType(CommunityPresentation);
    const container = () => presentation().findAllByType(Modal)[0]!;
    expect(container().props.visible).toBe(true);
    expect(container().props.transparent).toBe(mode === 'sheet');
    expect(container().findAllByType(Octopus.OctopusUIView)).toHaveLength(1);
    expect(
      container().findByType(Octopus.OctopusUIView).props.interceptUrls
    ).toBe(true);
    expect(tree.root.findAllByType(HostScreenModal)).toHaveLength(1);
    expect(container().findByType(HostScreenModal)).toBeDefined();
    expect(container().findByType(DebugScreen)).toBeDefined();
    const appBar = tree.root
      .findAllByType(AppBar)
      .find((bar) => bar.props.title === 'Scenarios')!;
    expect(appBar.props.size).toBe('medium');
    act(() => appBar.props.onOpenDebug());
    const consoleSheet = container().findByType(DebugConsoleSheet);
    expect(consoleSheet.props.visible).toBe(true);
    expect(consoleSheet.findByType(Modal).props.visible).toBe(true);
    act(() => consoleSheet.props.onClose());
    act(() => tree.root.findByType(SettingsScreen).props.onOpenDebug('events'));
    const debugModal = container()
      .findAllByType(Modal)
      .find((modal) => modal !== container() && modal.props.visible)!;
    expect(debugModal.findByType(DebugScreen)).toBeDefined();
    act(() => debugModal.props.onRequestClose());
    await act(async () => {
      const navigate = jest
        .mocked(Octopus.addNavigateToUrlListener)
        .mock.calls.at(-1)![0];
      await navigate('https://www.octopuscommunity.com/contact');
    });
    expect(tree.root.findAllByType(WebView)).toHaveLength(1);
    expect(container().findByType(WebView).props.source.uri).toBe(
      'https://www.octopuscommunity.com/contact'
    );
    // The host presenter also owns the auxiliary overlays while it is visible.
    await act(async () => {
      const login = jest
        .mocked(Octopus.addLoginRequiredListener)
        .mock.calls.at(-1)![0];
      login();
    });
    const host = () => tree.root.findByType(HostScreenModal);
    expect(host().props.visible).toBe(true);
    expect(container().findByType(HostScreenModal)).toBe(host());
    expect(host().findByType(WebView)).toBeDefined();
    expect(host().findByType(DebugScreen)).toBeDefined();
    expect(host().findByType(DebugConsoleSheet)).toBeDefined();
    // Close from the sheet scrim or Android Dialog Back relocates every overlay.
    act(() => {
      if (mode === 'sheet')
        container()
          .findByProps({ testID: 'community-sheet-scrim' })
          .props.onPress();
      else container().props.onRequestClose();
    });
    expect(presentation().props.mode).toBeNull();
    expect(container().props.visible).toBe(false);
    expect(container().findAllByType(Octopus.OctopusUIView)).toHaveLength(0);
    expect(container().findAllByType(HostScreenModal)).toHaveLength(0);
    expect(container().findAllByType(WebView)).toHaveLength(0);
    expect(container().findAllByType(DebugScreen)).toHaveLength(0);
    expect(container().findAllByType(DebugConsoleSheet)).toHaveLength(0);
    expect(tree.root.findAllByType(HostScreenModal)).toHaveLength(1);
    expect(tree.root.findAllByType(DebugScreen)).toHaveLength(1);
    expect(tree.root.findAllByType(DebugConsoleSheet)).toHaveLength(1);
    expect(tree.root.findAllByType(WebView)).toHaveLength(1);
    act(() => tree.unmount());
  }
);

it('keeps Settings appearance applied to both the host and SDK, and describes the resolved build server', async () => {
  const tree = await mountApp();
  const settings = () => tree.root.findByType(SettingsScreen);
  expect(settings().props.serverLabel).toBe('Demo — demo.invalid');
  act(() => settings().props.onAppearanceChange('dark'));
  expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('dark');
  expect(Octopus.setThemeMode).toHaveBeenLastCalledWith('dark');
  expect(settings().props.appearance).toBe('dark');
  act(() => tree.unmount());
});

it('keeps the last confirmed profile override while a bridge call is pending or rejected, then commits a successful choice', async () => {
  const tree = await mountApp();
  const scenarios = () => tree.root.findByType(ScenariosScreen);
  const apply = jest.mocked(Octopus.debugOverrideExposeClientUserId);
  let reject!: (error: Error) => void;
  apply.mockImplementationOnce(
    () =>
      new Promise<void>((_, failure) => {
        reject = failure;
      })
  );
  let result!: Promise<void>;
  act(() => {
    result = scenarios().props.onExposeClientUserIdOverrideChange(true);
  });
  expect(scenarios().props.exposeClientUserIdOverride).toBeNull();
  const failed = result.catch((error: unknown) => error);
  const refused = new Error('Override refused');
  await act(async () => {
    reject(refused);
    expect(await failed).toBe(refused);
  });
  expect(scenarios().props.exposeClientUserIdOverride).toBeNull();
  await act(async () => {
    await scenarios().props.onExposeClientUserIdOverrideChange(false);
  });
  expect(scenarios().props.exposeClientUserIdOverride).toBe(false);
  act(() => tree.unmount());
});

it('keeps the sample status band and Debug access when a scenario detail owns the AppBar', async () => {
  const tree = await mountApp();
  act(() =>
    tree.root.findByType(SettingsScreen).props.onAppearanceChange('light')
  );
  const scenarios = () => tree.root.findByType(ScenariosScreen);
  const statusBand = () =>
    tree.root
      .findAllByType(SafeAreaView)
      .find(
        (view) =>
          view.props.edges?.length === 1 && view.props.edges[0] === 'top'
      )!;
  const shellBars = () =>
    tree.root
      .findAllByType(AppBar)
      .filter((bar) => bar.props.title === 'Scenarios');
  const chrome = chromeColors(false);
  expect(shellBars()).toHaveLength(1);
  act(() => scenarios().props.onTopBarChange('sample'));
  expect(shellBars()).toHaveLength(0);
  expect(statusBand().props.style.backgroundColor).toBe(chrome.appBar);
  expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe('dark');
  act(() => scenarios().props.onOpenPresentation('modal'));
  expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe('dark');
  act(() => scenarios().props.onOpenDebug());
  const consoleSheet = tree.root.findByType(DebugConsoleSheet);
  expect(consoleSheet.props.visible).toBe(true);
  expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe('dark');
  act(() => consoleSheet.props.onClose());
  expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe('dark');
  act(() => tree.root.findByType(CommunityPresentation).props.onClose());
  expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe('dark');
  act(() => scenarios().props.onOpenPresentation('sheet'));
  expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe('dark');
  act(() =>
    tree.root.findByProps({ testID: 'community-sheet-scrim' }).props.onPress()
  );
  expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe('dark');
  act(() => scenarios().props.onTopBarChange('community'));
  expect(shellBars()).toHaveLength(0);
  expect(statusBand().props.style.backgroundColor).toBe(
    tree.root.findByType(CommunityPresentation).props.communityBackground
  );
  expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe('dark');
  act(() => scenarios().props.onTopBarChange('shell'));
  expect(shellBars()).toHaveLength(1);
  expect(statusBand().props.style.backgroundColor).toBe(chrome.appBar);
  expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe('dark');
  act(() => tree.unmount());
});

it.each(['light', 'dark'] as const)(
  'styles the Modal Dialog for the %s community preset after show, updates a mounted presentation, and restores sample bars on close',
  async (appearance) => {
    const tree = await mountApp();
    const settings = () => tree.root.findByType(SettingsScreen);
    const scenarios = () => tree.root.findByType(ScenariosScreen);
    const presentation = () => tree.root.findByType(CommunityPresentation);
    const modal = () => presentation().findAllByType(Modal)[0]!;
    const apply = NativeModules.SampleModalStatusBar.setStyle;
    apply.mockClear();
    act(() => {
      settings().props.onAppearanceChange(appearance);
      settings().props.onThemeSetChange('octopusNavy');
      scenarios().props.onOpenPresentation('modal');
    });
    expect(apply).not.toHaveBeenCalled();
    expect(modal().props.statusBarTranslucent).toBe(true);
    act(() => modal().props.onShow());
    expect(apply).toHaveBeenLastCalledWith(
      42,
      appearance === 'light' ? 'dark-content' : 'light-content'
    );
    const background = appearance === 'light' ? '#F5F7FA' : '#070D17';
    expect(presentation().props.communityBackground).toBe(background);
    expect(
      modal().findAllByType(SafeAreaView)[0]!.props.style.at(-1).backgroundColor
    ).toBe(background);
    act(() =>
      settings().props.onAppearanceChange(
        appearance === 'light' ? 'dark' : 'light'
      )
    );
    expect(apply).toHaveBeenLastCalledWith(
      42,
      appearance === 'light' ? 'light-content' : 'dark-content'
    );
    act(() => modal().props.onRequestClose());
    expect(tree.root.findByType(SampleSystemBars).props.statusBar).toBe(
      appearance === 'light' ? 'light' : 'dark'
    );
    apply.mockClear();
    act(() => scenarios().props.onOpenPresentation('sheet'));
    expect(apply).not.toHaveBeenCalled();
    act(() => modal().props.onShow());
    expect(apply).toHaveBeenLastCalledWith(42, 'light-content');
    act(() => tree.unmount());
  }
);
