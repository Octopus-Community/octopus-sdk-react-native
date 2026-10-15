jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  default: { OS: 'ios' },
}));
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  Modal: 'Modal',
  processColor: jest.requireActual(
    'react-native/Libraries/StyleSheet/processColor'
  ).default,
  Switch: 'Switch',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    create: (value: unknown) => value,
    absoluteFill: {},
    hairlineWidth: 1,
  },
  Platform: {
    OS: 'ios',
    select: (value: { default: string }) => value.default,
  },
  PanResponder: { create: (value: unknown) => ({ panHandlers: value }) },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));
jest.mock(
  '@octopus-community/react-native',
  () => ({
    OctopusUIView: 'OctopusUIView',
    debugGetCommunityConfig: jest.fn(async () => null),
    debugOverrideContentOptions: jest.fn(async () => undefined),
    debugOverrideForceNicknameChoice: jest.fn(async () => undefined),
    debugOverrideConsentTexts: jest.fn(async () => undefined),
    debugOverrideTermsAcceptanceMode: jest.fn(async () => undefined),
    fetchCommunityData: jest.fn(),
    addCommunityDataListener: jest.fn(() => ({ remove: jest.fn() })),
    addSDKEventListener: jest.fn(() => ({ remove: jest.fn() })),
    setGroupAccessDeniedCallback: jest.fn(() => jest.fn()),
    SyncFollowGroupStatus: { Applied: 'applied' },
  }),
  { virtual: true }
);
jest.mock('../navigation/useHardwareBack', () => ({
  useHardwareBack: jest.fn(),
}));
jest.mock('../screens/panels/ThemePanel', () => ({ ThemePanel: () => null }));
jest.mock('../screens/panels/SyncFollowGroupsPanel', () => ({
  SyncFollowGroupsPanel: () => null,
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput, Modal, TouchableOpacity, View } from 'react-native';
import {
  debugGetCommunityConfig,
  OctopusUIView,
  type OctopusGroup,
} from '@octopus-community/react-native';
import {
  CommunityPresentation,
  shouldDismissSheet,
} from '../components/CommunityPresentation';
import {
  communityConfigRows,
  useLiveCommunityConfig,
} from '../components/LiveCommunityConfigCard';
import { groupSyncActions } from '../scenarios/groupSync';
import { CONSENT_TEXTS_PRESETS } from '../scenarios/consentTexts';
import { SCENARIO_SECTIONS, matchesQuery } from '../scenarios/catalog';
import {
  ScenariosScreen,
  type ScenariosScreenProps,
} from '../screens/ScenariosScreen';
import { useHardwareBack } from '../navigation/useHardwareBack';
import { TabVisibility } from '../navigation/tabVisibility';
import { AdditionalScenarioPanel } from '../screens/panels/AdditionalScenarioPanel';
import * as Octopus from '@octopus-community/react-native';
import * as demoConfig from '../config/demoConfig';
import { maskApiKey, rememberApiKey } from '../config/apiKeyMask';

it('listens to SDK events without requiring the global callback toggle, and removes the listener', () => {
  const listen = Octopus.addSDKEventListener as jest.Mock;
  const remove = jest.fn();
  listen.mockReturnValueOnce({ remove });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <AdditionalScenarioPanel
        id="events"
        isDark={false}
        onOpenPresentation={jest.fn()}
        onVerifyInCommunity={jest.fn()}
        onUnifiedProfileChange={jest.fn()}
        unifiedProfileEnabled={false}
        exposeClientUserIdOverride={null}
        onExposeClientUserIdOverrideChange={jest.fn()}
      />
    );
  });
  const emit = listen.mock.calls[listen.mock.calls.length - 1]![0];
  act(() => emit({ type: 'screenDisplayed', screen: { type: 'mainFeed' } }));
  expect(textOf(tree)).toContain('mainFeed');
  act(() =>
    tree.root.findByProps({ testID: 'qa-preset-events-1' }).props.onPress()
  );
  expect(textOf(tree)).not.toContain('mainFeed');
  act(() => emit({ type: 'screenDisplayed', screen: { type: 'mainFeed' } }));
  expect(textOf(tree)).toContain('mainFeed');
  act(() => tree.unmount());
  expect(remove).toHaveBeenCalledTimes(1);
});

const textOf = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join('\n');

const sectionScreenProps = {
  isDark: false,
  primaryColor: '#123456',
  effectiveApiKey: '',
  isInitialized: false,
  communitySessionNonce: 1,
  clientUserId: 'demo-user',
  isMockUserConnected: false,
  exposeClientUserIdOverride: null,
  interceptProfileTaps: false,
  onTopBarChange: jest.fn(),
  onOpenPresentation: jest.fn(),
  onVerifyInCommunity: jest.fn(),
  onUnifiedProfileChange: jest.fn(),
  onExposeClientUserIdOverrideChange: jest.fn(),
  activeApiKeyId: null,
  activeCustomApiKey: null,
} as unknown as ScenariosScreenProps;

it('keeps expanded sections when the Scenarios tab is hidden and shown', async () => {
  let tree!: ReactTestRenderer;
  const screen = (visible: boolean) => (
    <TabVisibility.Provider value={visible}>
      <ScenariosScreen {...sectionScreenProps} />
    </TabVisibility.Provider>
  );
  await act(async () => {
    tree = create(screen(true));
  });
  try {
    const header = (id: string) =>
      tree.root.findByProps({ testID: `scenarios-section-${id}` });
    expect(header('sso').props.accessibilityState.expanded).toBe(false);
    expect(header('community').props.accessibilityState.expanded).toBe(false);
    act(() => header('sso').props.onPress());
    act(() => header('community').props.onPress());
    await act(async () => {
      tree.update(screen(false));
    });
    await act(async () => {
      tree.update(screen(true));
    });
    expect(header('sso').props.accessibilityState.expanded).toBe(true);
    expect(header('community').props.accessibilityState.expanded).toBe(true);
    expect(header('notifications').props.accessibilityState.expanded).toBe(
      false
    );
    expect(
      tree.root.findAllByProps({ testID: 'scenarios-unifiedProfile-card' })
        .length
    ).toBeGreaterThan(0);
    act(() => header('sso').props.onPress());
    expect(header('sso').props.accessibilityState.expanded).toBe(false);
  } finally {
    act(() => tree.unmount());
  }
});

it.each([null, false, true])(
  'announces the section count and force-login subtitle (forced=%s)',
  async (forced) => {
    jest.useFakeTimers();
    const read = debugGetCommunityConfig as jest.Mock;
    read.mockResolvedValue(
      forced === null ? null : { forceLoginOnStrongActions: forced }
    );
    let tree!: ReactTestRenderer;
    try {
      await act(async () => {
        tree = create(
          <ScenariosScreen {...sectionScreenProps} isInitialized />
        );
      });
      const header = () =>
        tree.root.findByProps({ testID: 'scenarios-section-sso' });
      const section = SCENARIO_SECTIONS.find((entry) => entry.id === 'sso')!;
      const subtitle =
        forced === null
          ? 'Force login: —'
          : forced
            ? 'Force login: Visitors must sign in before strong actions.'
            : 'Force login: Visitors can browse the community before signing in.';
      expect(header().props.accessibilityRole).toBe('button');
      expect(header().props.accessibilityLabel).toBe(
        `${section.title}, ${section.scenarios.length} scenarios, ${subtitle}`
      );
      expect(textOf(tree)).toContain(subtitle);
      expect(header().props.accessibilityHint).toBe('Expand section');
      act(() => header().props.onPress());
      expect(header().props.accessibilityState.expanded).toBe(true);
      expect(header().props.accessibilityHint).toBe('Collapse section');
      act(() => tree.root.findByType(TextInput).props.onChangeText('profile'));
      expect(header().props.accessibilityLabel).toBe(
        `${section.title}, ${section.scenarios.filter((id) => matchesQuery(id, 'profile')).length} scenarios`
      );
      expect(header().props.accessibilityState).toEqual({
        expanded: true,
        disabled: true,
      });
      expect(header().props.accessibilityHint).toBeUndefined();
    } finally {
      if (tree) act(() => tree.unmount());
      read.mockResolvedValue(null);
      jest.useRealTimers();
    }
  }
);

it.each(['Error', 'string'])(
  'redacts a session API key in clientProfile-error after a rejected %s',
  async (errorType) => {
    jest.useFakeTimers();
    const key = rememberApiKey('profile5555555555559876');
    const message = `Profile lookup rejected ${key}`;
    (Octopus.fetchCommunityData as jest.Mock).mockRejectedValueOnce(
      errorType === 'Error' ? new Error(message) : message
    );
    const props = {
      isDark: false,
      primaryColor: '#123456',
      effectiveApiKey: key,
      isInitialized: true,
      communitySessionNonce: 1,
      clientUserId: 'demo-user',
      isMockUserConnected: false,
      exposeClientUserIdOverride: null,
      onTopBarChange: jest.fn(),
      onExposeClientUserIdOverrideChange: jest.fn(),
      activeApiKeyId: null,
      activeCustomApiKey: null,
    } as unknown as ScenariosScreenProps;
    let tree!: ReactTestRenderer;
    try {
      await act(async () => {
        tree = create(<ScenariosScreen {...props} />);
      });
      act(() =>
        tree.root
          .findByProps({ testID: 'scenarios-search-input' })
          .props.onChangeText('fetchCommunityData')
      );
      act(() =>
        tree.root
          .findByProps({ testID: 'scenarios-communityData-card' })
          .props.onPress()
      );
      await act(async () => {
        tree.root
          .findByProps({ testID: 'qa-preset-communityData-6' })
          .props.onPress();
        await jest.advanceTimersByTimeAsync(300);
      });
      const error = tree.root.findByProps({ testID: 'clientProfile-error' });
      expect(error.props.children).toBe(
        `Profile lookup rejected ${maskApiKey(key)}`
      );
      expect(error.props.children).not.toContain(key);
    } finally {
      if (tree) act(() => tree.unmount());
      jest.useRealTimers();
    }
  }
);

it('memoizes the Lifecycle target, disables key autofill and renders a redacted switch error', async () => {
  jest.useFakeTimers();
  const resolve = jest.spyOn(demoConfig, 'resolveSwitchTarget');
  const key = 'switch4444444444449876';
  const onSwitchCommunity = jest.fn(
    async (target: demoConfig.SwitchCommunityTarget) => {
      rememberApiKey(target.key);
      throw new Error(`Rejected ${target.key}`);
    }
  );
  const props = {
    isDark: false,
    primaryColor: '#123456',
    effectiveApiKey: '',
    isInitialized: false,
    communitySessionNonce: 1,
    clientUserId: 'demo-user',
    isMockUserConnected: false,
    exposeClientUserIdOverride: null,
    onTopBarChange: jest.fn(),
    onExposeClientUserIdOverrideChange: jest.fn(),
    activeApiKeyId: null,
    activeCustomApiKey: null,
    activeCommunityLabel: 'Demo community',
    onSwitchCommunity,
  } as unknown as ScenariosScreenProps;
  let tree!: ReactTestRenderer;
  try {
    await act(async () => {
      tree = create(<ScenariosScreen {...props} />);
    });
    resolve.mockClear();
    act(() =>
      tree.root
        .findByProps({ testID: 'scenarios-search-input' })
        .props.onChangeText('Restart')
    );
    act(() =>
      tree.root
        .findByProps({ testID: 'scenarios-lifecycle-card' })
        .props.onPress()
    );
    expect(resolve).not.toHaveBeenCalled();
    const input = () =>
      tree.root.findByProps({ testID: 'qa-param-lifecycle-apiKey-input' });
    expect(input().props).toMatchObject({
      secureTextEntry: true,
      importantForAutofill: 'no',
      autoComplete: 'off',
      textContentType: 'none',
    });
    act(() => input().props.onChangeText(` ${key} `));
    expect(resolve).toHaveBeenCalledTimes(1);
    await act(async () => {
      tree.root
        .findByProps({ testID: 'qa-preset-lifecycle-1' })
        .props.onPress();
      await jest.advanceTimersByTimeAsync(300);
    });
    expect(onSwitchCommunity).toHaveBeenCalledWith({
      id: null,
      label: 'Custom community',
      key,
    });
    expect(textOf(tree)).toContain(`Rejected ${maskApiKey(key)}`);
    expect(textOf(tree)).not.toContain(key);
  } finally {
    if (tree) act(() => tree.unmount());
    resolve.mockRestore();
    jest.useRealTimers();
  }
});

it('registers and unregisters the group-denied callback through the catalog presets, and cleans up on unmount', () => {
  const register = Octopus.setGroupAccessDeniedCallback as jest.Mock;
  const unregister = jest.fn();
  register.mockReturnValue(unregister);
  register.mockClear();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <AdditionalScenarioPanel
        id="groupAccessDenied"
        isDark={false}
        onOpenPresentation={jest.fn()}
        onVerifyInCommunity={jest.fn()}
        onUnifiedProfileChange={jest.fn()}
        unifiedProfileEnabled={false}
        exposeClientUserIdOverride={null}
        onExposeClientUserIdOverrideChange={jest.fn()}
      />
    );
  });
  expect(register).not.toHaveBeenCalled();
  const tap = (testID: string) =>
    act(() => tree.root.findByProps({ testID }).props.onPress());
  tap('qa-preset-groupAccessDenied-1');
  expect(register).toHaveBeenCalledTimes(1);
  tap('qa-preset-groupAccessDenied-2');
  expect(unregister).toHaveBeenCalledTimes(1);
  tap('qa-preset-groupAccessDenied-1');
  expect(register).toHaveBeenCalledTimes(2);
  act(() => tree.unmount());
  expect(unregister).toHaveBeenCalledTimes(2);
});

it('orders the six Android groups, indexes each scenario once, and searches API names', () => {
  expect(SCENARIO_SECTIONS.map((s) => s.title)).toEqual([
    'Sign-in & user',
    'Presentation modes',
    'Community & groups',
    'Notifications',
    'Theme & language',
    'Host callbacks & events',
  ]);
  const ids = SCENARIO_SECTIONS.flatMap((s) => s.scenarios);
  expect(new Set(ids).size).toBe(ids.length);
  expect(matchesQuery('profileFieldsLock', ' PROFILE ')).toBe(true);
  expect(matchesQuery('groups', 'fetchGroups')).toBe(true);
  expect(matchesQuery('connection', 'zzzz')).toBe(false);
});

it('inverts confirmed server follow state, excludes immutable groups, and carries the action timestamp', () => {
  const groups = [
    { id: 'followed', isFollowed: true, canChangeFollowStatus: true },
    { id: 'unfollowed', isFollowed: false, canChangeFollowStatus: true },
    { id: 'essential', isFollowed: true, canChangeFollowStatus: false },
  ] as OctopusGroup[];
  const now = new Date(1000);
  expect(groupSyncActions(groups, 'invertAll', now)).toEqual([
    { groupId: 'followed', followed: false, actionDate: now },
    { groupId: 'unfollowed', followed: true, actionDate: now },
  ]);
  expect(groupSyncActions(groups, 'followAll').every((a) => a.followed)).toBe(
    true
  );
  expect(
    groupSyncActions(groups, 'unfollowAll').every((a) => !a.followed)
  ).toBe(true);
});

it('masks keys and distinguishes unavailable config from false flags', () => {
  const key = 'demo1111111111115678';
  expect(JSON.stringify(communityConfigRows(null, key))).not.toContain(key);
  expect(communityConfigRows(null, key)[1]!.value).toBe('—');
  expect(
    communityConfigRows(
      {
        exposeClientUserId: false,
        forceLoginOnStrongActions: true,
        displayAccountAge: false,
        forceNicknameChoice: false,
        consentTexts: null,
        termsAcceptanceMode: 'implicit',
      },
      key
    )[1]!.value
  ).toBe('✗ off');
});

it('discards a config response from a previous session and stops polling after unmount', async () => {
  jest.useFakeTimers();
  let resolveOld!: (value: unknown) => void;
  const read = debugGetCommunityConfig as jest.Mock;
  read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      })
  );
  read.mockResolvedValue({ exposeClientUserId: false });
  function Probe({ session }: { session: number }) {
    const config = useLiveCommunityConfig(true, session);
    return <Text>{config?.exposeClientUserId === false ? 'new' : 'old'}</Text>;
  }
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<Probe session={1} />);
  });
  await act(async () => {
    tree.update(<Probe session={2} />);
  });
  expect(textOf(tree)).toBe('new');
  await act(async () => {
    resolveOld({ exposeClientUserId: true });
  });
  expect(textOf(tree)).toBe('new');
  act(() => tree.unmount());
  const calls = read.mock.calls.length;
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(read).toHaveBeenCalledTimes(calls);
  read.mockResolvedValue(null);
  jest.useRealTimers();
});

it.each(['modal', 'sheet'] as const)(
  'mounts a real native view in %s and routes close and overlays',
  (mode) => {
    const close = jest.fn();
    const dismissed = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <CommunityPresentation
          mode={mode}
          isDark={false}
          session={1}
          interceptUrls
          interceptProfileTaps
          onClose={close}
          onDismiss={dismissed}
          overlays={<Text>Host overlay</Text>}
        />
      );
    });
    expect(tree.root.findByType(OctopusUIView).props.navBarLeadingAction).toBe(
      'close'
    );
    act(() => tree.root.findByType(OctopusUIView).props.onBackRequested());
    expect(close).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findByType(Modal).findAllByType(Text)[0]!.props.children
    ).toBe('Host overlay');
    if (mode === 'sheet') {
      act(() =>
        tree.root
          .findByProps({ testID: 'community-sheet-drag-handle' })
          .props.onPanResponderRelease({}, { dx: 0, dy: 90, vx: 0, vy: 0 })
      );
      expect(close).toHaveBeenCalledTimes(2);
      const scrim = tree.root.findByProps({ testID: 'community-sheet-scrim' });
      expect(scrim.props.accessibilityRole).toBe('button');
      expect(scrim.props.accessibilityLabel).toBe('Close community sheet');
      expect(scrim.findAllByType(OctopusUIView)).toHaveLength(0);
      act(() => scrim.props.onPress());
      expect(close).toHaveBeenCalledTimes(3);
    } else {
      expect(
        tree.root.findAllByProps({ testID: 'community-sheet-scrim' })
      ).toHaveLength(0);
    }
    act(() => tree.root.findByType(Modal).props.onDismiss());
    expect(dismissed).toHaveBeenCalledTimes(1);
    act(() =>
      tree.update(
        <CommunityPresentation
          mode={null}
          isDark={false}
          session={1}
          interceptUrls
          interceptProfileTaps
          onClose={close}
          onDismiss={dismissed}
          overlays={<Text>Host overlay</Text>}
        />
      )
    );
    expect(tree.root.findAllByType(OctopusUIView)).toHaveLength(0);
    act(() => tree.unmount());
  }
);

it('keeps the sheet responder on a plain View and handles taps, drags and accessible activation', () => {
  const close = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <CommunityPresentation
        mode="sheet"
        isDark={false}
        session={1}
        interceptUrls
        interceptProfileTaps
        onClose={close}
        onDismiss={jest.fn()}
        overlays={null}
      />
    );
  });
  const handle = tree.root.findByProps({
    testID: 'community-sheet-drag-handle',
  });
  expect(handle.type).toBe(View);
  expect(handle.props.onStartShouldSetPanResponder()).toBe(true);
  const release = (dx: number, dy: number, vx = 0, vy = 0) =>
    act(() => handle.props.onPanResponderRelease({}, { dx, dy, vx, vy }));
  release(100, 20);
  release(200, 90, 1.3, 0.4);
  release(0, -90);
  release(0, 20);
  release(0, 5, 0, 2);
  expect(close).not.toHaveBeenCalled();
  release(0, 90);
  release(0, 20, 0, 1);
  expect(close).toHaveBeenCalledTimes(2);
  release(0, 0);
  expect(close).toHaveBeenCalledTimes(3);
  act(() =>
    handle.props.onAccessibilityAction({
      nativeEvent: { actionName: 'activate' },
    })
  );
  expect(close).toHaveBeenCalledTimes(4);
  act(() => tree.unmount());
});

it('dismisses a sheet on a downward drag or fling, without treating an upward or accidental drag as dismissal', () => {
  expect(shouldDismissSheet(73, 0)).toBe(true);
  expect(shouldDismissSheet(20, 1)).toBe(true);
  expect(shouldDismissSheet(-100, 1)).toBe(false);
  expect(shouldDismissSheet(5, 2)).toBe(false);
});

it('puts search first, hides launch/config cards in search, and opens Unified Profile as a Back route', async () => {
  const launch = <Text>Launch controls</Text>;
  const props = {
    isDark: false,
    primaryColor: '#123456',
    launchActions: launch,
    effectiveApiKey: '',
    isInitialized: false,
    communitySessionNonce: 1,
    clientUserId: 'demo-user',
    isMockUserConnected: false,
    exposeClientUserIdOverride: null,
    interceptProfileTaps: false,
    onTopBarChange: jest.fn(),
    onOpenDebug: jest.fn(),
    onOpenPresentation: jest.fn(),
    onVerifyInCommunity: jest.fn(),
    onUnifiedProfileChange: jest.fn(),
    onExposeClientUserIdOverrideChange: jest.fn(),
    activeApiKeyId: null,
    activeCustomApiKey: null,
  } as unknown as ScenariosScreenProps;
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<ScenariosScreen {...props} />);
  });
  expect(tree.root.findByType(TextInput).props.testID).toBe(
    'scenarios-search-input'
  );
  expect(textOf(tree)).toContain('Live community config');
  const search = tree.root.findByType(TextInput);
  let ancestor = search.parent;
  while (ancestor) {
    expect(ancestor.type).not.toBe('ScrollView');
    ancestor = ancestor.parent;
  }
  act(() => tree.root.findByType(TextInput).props.onChangeText('zzzz'));
  expect(textOf(tree)).toContain('No scenario matches "zzzz".');
  expect(textOf(tree)).not.toContain('Launch controls');
  expect(textOf(tree)).not.toContain('Live community config');
  act(() => tree.root.findByType(TextInput).props.onChangeText(''));
  expect(
    tree.root.findAllByProps({ testID: 'scenarios-unifiedProfile-card' })
  ).toHaveLength(0);
  act(() =>
    tree.root.findByProps({ testID: 'scenarios-section-sso' }).props.onPress()
  );
  act(() =>
    tree.root
      .findByProps({ testID: 'scenarios-unifiedProfile-card' })
      .props.onPress()
  );
  expect(textOf(tree)).toContain('Try it');
  expect(
    tree.root.findAllByProps({ testID: 'scenarios-search-input' })
  ).toHaveLength(0);
  expect(props.onTopBarChange).toHaveBeenLastCalledWith('sample');
  act(() =>
    tree.root.findByProps({ testID: 'app-bar-debug-console' }).props.onPress()
  );
  expect(props.onOpenDebug).toHaveBeenCalledTimes(1);
  expect(
    tree.root.findByProps({ testID: 'scenarios-back-button' }).props
      .accessibilityLabel
  ).toBe('Back');
  act(() =>
    tree.root.findByProps({ testID: 'scenarios-back-button' }).props.onPress()
  );
  expect(props.onTopBarChange).toHaveBeenLastCalledWith('shell');
  act(() =>
    tree.root
      .findByProps({ testID: 'scenarios-section-community' })
      .props.onPress()
  );
  act(() =>
    tree.root
      .findByProps({ testID: 'scenarios-communityData-card' })
      .props.onPress()
  );
  expect(textOf(tree)).toContain('Preset 1 · Fetch by clientUserId');
  for (let preset = 1; preset <= 6; preset++)
    expect(
      tree.root.findAllByProps({
        testID: `qa-preset-communityData-${preset}`,
      }).length
    ).toBeGreaterThan(0);
  expect(textOf(tree)).toContain('Live state');
  act(() =>
    tree.root.findByProps({ testID: 'app-bar-debug-console' }).props.onPress()
  );
  expect(props.onOpenDebug).toHaveBeenCalledTimes(2);
  const hardwareBack = (useHardwareBack as jest.Mock).mock.calls.at(-1)![1];
  act(() => {
    expect(hardwareBack()).toBe(true);
  });
  expect(tree.root.findAllByType(TouchableOpacity).length).toBeGreaterThan(0);
  let resolveStop!: () => void;
  props.onStopSdk = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveStop = resolve;
      })
  );
  props.isSdkInitializing = false;
  act(() => tree.update(<ScenariosScreen {...props} />));
  act(() => tree.root.findByType(TextInput).props.onChangeText('Restart'));
  act(() =>
    tree.root
      .findByProps({ testID: 'scenarios-lifecycle-card' })
      .props.onPress()
  );
  jest.useFakeTimers();
  act(() => {
    tree.root.findByProps({ testID: 'qa-preset-lifecycle-3' }).props.onPress();
  });
  const lifecycleTestIDs = [
    'qa-preset-lifecycle-2',
    'qa-preset-lifecycle-3',
    'lifecycle-restart-button',
  ];
  for (const testID of lifecycleTestIDs)
    expect(tree.root.findByProps({ testID }).props.disabled).toBe(true);
  await act(async () => {
    resolveStop();
    jest.advanceTimersByTime(300);
  });
  expect(
    tree.root.findByProps({ testID: 'lifecycle-restart-button' }).props.disabled
  ).toBe(false);
  act(() => tree.update(<ScenariosScreen {...props} isSdkInitializing />));
  for (const testID of lifecycleTestIDs)
    expect(tree.root.findByProps({ testID }).props.disabled).toBe(true);
  jest.useRealTimers();
  act(() => tree.unmount());
});

function scenarioProps(): ScenariosScreenProps {
  return {
    isDark: false,
    primaryColor: '#123456',
    effectiveApiKey: '',
    isInitialized: true,
    communitySessionNonce: 1,
    clientUserId: 'demo-user',
    isMockUserConnected: false,
    exposeClientUserIdOverride: null,
    onTopBarChange: jest.fn(),
    onExposeClientUserIdOverrideChange: jest.fn(),
    onVerifyInCommunity: jest.fn(),
    activeApiKeyId: null,
    activeCustomApiKey: null,
  } as unknown as ScenariosScreenProps;
}

it('runs contentOptions preset 7 with optional text and keeps the other flags enabled', async () => {
  jest.useFakeTimers();
  let tree!: ReactTestRenderer;
  try {
    await act(async () => {
      tree = create(<ScenariosScreen {...scenarioProps()} />);
    });
    act(() =>
      tree.root
        .findByProps({ testID: 'scenarios-search-input' })
        .props.onChangeText('debugOverrideContentOptions')
    );
    act(() =>
      tree.root
        .findByProps({ testID: 'scenarios-contentOptions-card' })
        .props.onPress()
    );
    act(() =>
      tree.root
        .findByProps({ testID: 'qa-param-contentOptions-post-text' })
        .props.onPress()
    );
    await act(async () => {
      tree.root
        .findByProps({ testID: 'qa-preset-contentOptions-7' })
        .props.onPress();
      await jest.advanceTimersByTimeAsync(300);
    });
    expect(Octopus.debugOverrideContentOptions).toHaveBeenLastCalledWith({
      post: { enablePictures: true, enablePolls: true, textRequired: false },
      comment: { enablePictures: true },
      reply: { enablePictures: true },
    });
    expect(
      tree.root.findByProps({ testID: 'contentOptions-result' })
    ).toBeDefined();
  } finally {
    if (tree) act(() => tree.unmount());
    jest.useRealTimers();
  }
});

it('runs the three nickname presets without changing profile lock or host-managed fields', async () => {
  jest.useFakeTimers();
  let tree!: ReactTestRenderer;
  try {
    await act(async () => {
      tree = create(<ScenariosScreen {...scenarioProps()} />);
    });
    act(() =>
      tree.root
        .findByProps({ testID: 'scenarios-search-input' })
        .props.onChangeText('debugOverrideForceNicknameChoice')
    );
    act(() =>
      tree.root
        .findByProps({ testID: 'scenarios-forceNicknameChoice-card' })
        .props.onPress()
    );
    expect(textOf(tree)).toContain(
      'locked, app-managed or already confirmed nickname'
    );
    for (const [key, id, value] of [
      ['on', 'qa-preset-forceNicknameChoice-1', true],
      ['off', 'qa-preset-forceNicknameChoice-2', false],
      ['clear', 'qa-preset-forceNicknameChoice-clear', null],
    ] as const) {
      act(() =>
        tree.root
          .findByProps({
            testID: `qa-param-forceNicknameChoice-enabled-${key}`,
          })
          .props.onPress()
      );
      await act(async () => {
        tree.root.findByProps({ testID: id }).props.onPress();
        await jest.advanceTimersByTimeAsync(300);
      });
      expect(Octopus.debugOverrideForceNicknameChoice).toHaveBeenLastCalledWith(
        value
      );
    }
    expect(
      tree.root.findByProps({ testID: 'forceNicknameChoice-result' })
    ).toBeDefined();
    expect(
      communityConfigRows(
        {
          exposeClientUserId: false,
          forceNicknameChoice: true,
          consentTexts: null,
          forceLoginOnStrongActions: false,
          displayAccountAge: false,
          termsAcceptanceMode: 'implicit',
        },
        ''
      ).find((row) => row.label === 'Force nickname choice')?.value
    ).toBe('✓ on');
  } finally {
    if (tree) act(() => tree.unmount());
    jest.useRealTimers();
  }
});

it('runs all eight consent presets mode-first, including blanks and mismatches, and clears both overrides', async () => {
  jest.useFakeTimers();
  let tree!: ReactTestRenderer;
  const mode = Octopus.debugOverrideTermsAcceptanceMode as jest.Mock;
  const texts = Octopus.debugOverrideConsentTexts as jest.Mock;
  try {
    await act(async () => {
      tree = create(<ScenariosScreen {...scenarioProps()} />);
    });
    act(() =>
      tree.root
        .findByProps({ testID: 'scenarios-search-input' })
        .props.onChangeText('debugOverrideConsentTexts')
    );
    act(() =>
      tree.root
        .findByProps({ testID: 'scenarios-consentTexts-card' })
        .props.onPress()
    );
    for (const preset of CONSENT_TEXTS_PRESETS) {
      mode.mockClear();
      texts.mockClear();
      act(() =>
        tree.root
          .findByProps({ testID: `qa-param-consentTexts-preset-${preset.id}` })
          .props.onPress()
      );
      await act(async () => {
        tree.root
          .findByProps({ testID: `qa-preset-consentTexts-${preset.id}` })
          .props.onPress();
        await jest.advanceTimersByTimeAsync(300);
      });
      expect(mode).toHaveBeenCalledWith(preset.termsMode);
      expect(texts).toHaveBeenCalledWith(preset.texts);
      expect(mode.mock.invocationCallOrder[0]).toBeLessThan(
        texts.mock.invocationCallOrder[0]!
      );
    }
    expect(CONSENT_TEXTS_PRESETS[6]!.texts).toEqual({
      mode: 'singleCheckbox',
      label: '',
      belowText: '   ',
    });
    expect(CONSENT_TEXTS_PRESETS[7]).toMatchObject({
      termsMode: 'explicitMultiCheckbox',
      texts: { mode: 'implicit' },
    });
    expect(JSON.stringify(CONSENT_TEXTS_PRESETS[5]!.texts)).toContain('\\n\\n');
    act(() =>
      tree.root
        .findByProps({ testID: 'qa-param-consentTexts-preset-clear' })
        .props.onPress()
    );
    await act(async () => {
      tree.root
        .findByProps({ testID: 'qa-preset-consentTexts-clear' })
        .props.onPress();
      await jest.advanceTimersByTimeAsync(300);
    });
    expect(mode).toHaveBeenLastCalledWith(null);
    expect(texts).toHaveBeenLastCalledWith(null);
    expect(
      tree.root.findByProps({ testID: 'consentTexts-result' })
    ).toBeDefined();
    const snapshot = {
      exposeClientUserId: false,
      forceNicknameChoice: false,
      consentTexts: CONSENT_TEXTS_PRESETS[0]!.texts,
      forceLoginOnStrongActions: false,
      displayAccountAge: false,
      termsAcceptanceMode: 'implicit',
    };
    expect(
      communityConfigRows(snapshot, '').find(
        (row) => row.label === 'Consent texts'
      )?.value
    ).toBe(JSON.stringify(snapshot.consentTexts, null, 2));
  } finally {
    if (tree) act(() => tree.unmount());
    jest.useRealTimers();
  }
});
