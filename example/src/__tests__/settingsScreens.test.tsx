jest.mock('react-native', () => ({
  Modal: 'Modal',
  Clipboard: { setString: jest.fn() },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  TextInput: 'TextInput',
  Switch: 'Switch',
  ActivityIndicator: 'ActivityIndicator',
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn(async () => {}) },
  StyleSheet: { create: (styles: unknown) => styles },
  Platform: {
    OS: 'android',
    select: (values: { default: string }) => values.default,
  },
}));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
jest.mock('../components/PillButton', () => ({ PillButton: 'PillButton' }));
jest.mock('../components/AppSection', () => ({ AppSection: 'AppSection' }));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Text, Modal, Platform, Linking, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { DebugConsoleSheet } from '../components/DebugConsoleSheet';
import { useModalDismissal } from '../navigation/useModalDismissal';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ConfigScreen } from '../screens/ConfigScreen';
import type { ConfigScreenProps } from '../screens/ConfigScreen';
import { maskApiKey } from '../config/apiKeyMask';
import { octopusApiServer } from '../config/demoConfig';
import * as sampleSupport from '../config/sampleSupport';

const settingsProps = {
  hasSsoUser: true,
  onReconfigure: jest.fn(),
  onOpenConfigSection: jest.fn(),
  onOpenScenariosSection: jest.fn(),
  onOpenDebug: jest.fn(),
  isConnectingUser: false,
  isMockUserConnected: true,
  isUserConnected: true,
  isGuest: false,
  clientUserId: 'sample-user',
  entitlements: [],
  communityLocaleOverride: 'system',
  onConnectUser: jest.fn(),
  onDisconnectUser: jest.fn(),
  onRefreshEntitlements: jest.fn(),
  appearance: 'system' as const,
  themeSet: 'octopusNavy' as const,
  communitySummary: 'Demo community',
  onResetData: jest.fn(),
  isDark: false,
  primaryColor: '#123456',
  userCallbackMessage: null,
};

it('opens feedback through the shell only when an internal sheet is installed', () => {
  const support = sampleSupport.sampleSupport;
  const previousSheet = support.FeedbackSheet;
  const onOpenFeedback = jest.fn();
  let tree!: ReactTestRenderer;
  try {
    support.FeedbackSheet = () => null;
    act(() => {
      tree = create(
        <SettingsScreen {...settingsProps} onOpenFeedback={onOpenFeedback} />
      );
    });
    act(() =>
      tree.root
        .findAllByProps({ testID: 'settings-feedback-row' })[0]!
        .props.onPress()
    );
    expect(onOpenFeedback).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByType(support.FeedbackSheet)).toHaveLength(0);
    delete support.FeedbackSheet;
    act(() =>
      tree.update(
        <SettingsScreen {...settingsProps} onOpenFeedback={onOpenFeedback} />
      )
    );
    expect(
      tree.root.findAllByProps({ testID: 'settings-feedback-row' })
    ).toHaveLength(0);
  } finally {
    if (tree) act(() => tree.unmount());
    support.FeedbackSheet = previousSheet;
  }
});
const defaultConfigProps: ConfigScreenProps = {
  isDark: false,
  primaryColor: '#123456',
  onPrimaryColor: '#ffffff',
  mode: 'revisit',
  onStart: jest.fn(),
  initialConfig: {
    apiKeySource: 'custom',
    customApiKey: 'fixture-value-123456',
    selectedKeyId: null,
    userId: 'sample-user',
    theme: 'system',
    serverEnv: 'custom',
  },
  themeSet: 'octopusNavy',
  urlOpeningMode: 'sampleRule',
  onUrlOpeningModeChange: jest.fn(),
  profileTapMode: 'sdkScreens',
  onProfileTapModeChange: jest.fn(),
  displayMode: 'embed',
  onDisplayModeChange: jest.fn(),
  isAuthRequiredCallbackEnabled: true,
  onAuthRequiredCallbackEnabledChange: jest.fn(),
  isUnreadCountCallbackEnabled: true,
  onUnreadCountCallbackEnabledChange: jest.fn(),
  isEventCallbackEnabled: true,
  onEventCallbackEnabledChange: jest.fn(),
};

const textOf = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join('\n');
it('opens editable Appearance and every Android language choice', async () => {
  const onAppearanceChange = jest.fn();
  const onLanguageChange = jest.fn(async () => {});
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SettingsScreen
        {...settingsProps}
        onAppearanceChange={onAppearanceChange}
        onLanguageChange={onLanguageChange}
      />
    );
  });
  act(() =>
    tree.root.findByProps({ testID: 'settings-appearance-row' }).props.onPress()
  );
  act(() =>
    tree.root
      .findByProps({ testID: 'settings-appearance-select-dark' })
      .props.onPress()
  );
  expect(onAppearanceChange).toHaveBeenCalledWith('dark');
  act(() =>
    tree.root.findByProps({ testID: 'settings-back-button' }).props.onPress()
  );
  act(() =>
    tree.root.findByProps({ testID: 'settings-language-row' }).props.onPress()
  );
  expect(
    tree.root.findAll((node) => node.props.accessibilityRole === 'radio')
  ).toHaveLength(10);
  await act(async () =>
    tree.root
      .findByProps({ testID: 'settings-language-select-tr' })
      .props.onPress()
  );
  expect(onLanguageChange).toHaveBeenCalledWith('tr');
  act(() => tree.unmount());
});
it('offers all four developer destinations and dependency notices', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<SettingsScreen {...settingsProps} />);
  });
  act(() =>
    tree.root.findByProps({ testID: 'settings-developer-row' }).props.onPress()
  );
  for (const title of [
    'Host app integration',
    'Events log',
    'Debug info',
    'Debug console',
  ])
    expect(textOf(tree)).toContain(title);
  act(() =>
    tree.root.findByProps({ testID: 'settings-back-button' }).props.onPress()
  );
  act(() =>
    tree.root.findByProps({ testID: 'settings-about-row' }).props.onPress()
  );
  expect(textOf(tree)).toContain('React / React Native');
  expect(textOf(tree)).toContain('MIT');
  act(() => tree.unmount());
});
it('keeps configuration edits staged until Apply and masks a session key', () => {
  const onStart = jest.fn();
  const configProps = { ...defaultConfigProps, onStart };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<ConfigScreen {...configProps} />);
  });
  const apply = tree.root.findByProps({ testID: 'config-start-button' });
  let ancestor = apply.parent;
  while (ancestor) {
    expect(ancestor.type).not.toBe('ScrollView');
    ancestor = ancestor.parent;
  }
  expect(
    Object.assign({}, ...apply.props.style({ pressed: false }))
  ).toMatchObject({ minHeight: 56 });

  act(() =>
    tree.root.findByProps({ testID: 'config-toggle-community' }).props.onPress()
  );
  expect(textOf(tree)).toContain(maskApiKey('fixture-value-123456'));
  expect(textOf(tree)).not.toContain('fixture-value-123456');
  expect(
    tree.root.findByProps({ testID: 'config-customApiKey-input' }).props
  ).toMatchObject({
    secureTextEntry: true,
    importantForAutofill: 'no',
    autoComplete: 'off',
    textContentType: 'none',
  });
  act(() =>
    tree.root.findByProps({ testID: 'config-toggle-theme' }).props.onPress()
  );
  act(() =>
    tree.root
      .findByProps({ testID: 'config-theme-select-dark' })
      .props.onPress()
  );
  act(() =>
    tree.root
      .findByProps({ testID: 'config-themePreset-select-none' })
      .props.onPress()
  );
  expect(onStart).not.toHaveBeenCalled();
  act(() =>
    tree.root.findByProps({ testID: 'config-start-button' }).props.onPress()
  );
  expect(onStart).toHaveBeenCalledWith(
    expect.objectContaining({
      theme: 'dark',
      apiServer: { host: 'api-demo2.8pus.io' },
    }),
    'none'
  );
  act(() => tree.unmount());
});

it('unblocks an iOS notification only after the console native dismissal', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  let dismissal!: ReturnType<typeof useModalDismissal>;
  function Harness() {
    const [visible, setVisible] = useState(true);
    const hide = () => setVisible(false);
    dismissal = useModalDismissal(visible, hide);
    return (
      <DebugConsoleSheet
        visible={visible}
        onClose={hide}
        onDismiss={dismissal.onDismiss}
        isDark={false}
      />
    );
  }
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<Harness />);
  });
  let finished = false;
  let pending!: Promise<void>;
  await act(async () => {
    pending = dismissal.dismiss().then(() => {
      finished = true;
    });
    await Promise.resolve();
  });
  expect(finished).toBe(false);
  await act(async () => {
    tree.root.findByType(Modal).props.onDismiss();
    await pending;
  });
  expect(finished).toBe(true);
  await expect(dismissal.dismiss()).resolves.toBeUndefined();
  act(() => tree.unmount());
  Object.defineProperty(Platform, 'OS', {
    value: 'android',
    configurable: true,
  });
});

it.each([
  [{ host: 'api.8pus.io' }, 'prod'],
  [{ host: 'demo.example', port: 8443 }, 'custom'],
] as const)(
  'seeds and applies the build endpoint %j',
  (buildServer, choice) => {
    const previous = { ...octopusApiServer };
    Object.assign(octopusApiServer, buildServer);
    const onStart = jest.fn();
    let tree!: ReactTestRenderer;
    try {
      act(() => {
        tree = create(
          <ConfigScreen {...defaultConfigProps} onStart={onStart} />
        );
      });
      act(() =>
        tree.root
          .findByProps({ testID: 'config-toggle-server' })
          .props.onPress()
      );
      expect(
        tree.root.findByProps({ testID: `config-serverEnv-select-${choice}` })
          .props.accessibilityState.checked
      ).toBe(true);
      act(() =>
        tree.root.findByProps({ testID: 'config-start-button' }).props.onPress()
      );
      expect(onStart).toHaveBeenCalledWith(
        expect.objectContaining({ apiServer: buildServer }),
        'octopusNavy'
      );
    } finally {
      if (tree) act(() => tree.unmount());
      delete octopusApiServer.port;
      Object.assign(octopusApiServer, previous);
    }
  }
);

it.each(['', 'https://example.com/design'])(
  'keeps the About design reference conditional on its build URL (%s)',
  (url) => {
    const replaced = jest.replaceProperty(
      sampleSupport,
      'sampleDesignReferenceUrl',
      url
    );
    let tree!: ReactTestRenderer;
    try {
      act(() => {
        tree = create(
          <SettingsScreen
            {...settingsProps}
            pageRequest={{ target: 'about', nonce: 1 }}
          />
        );
      });
      const rows = tree.root.findAll(
        (node) =>
          node.type === TouchableOpacity &&
          node.props.testID === 'settings-design-reference-row'
      );
      expect(rows).toHaveLength(url ? 1 : 0);
      if (url) {
        act(() => rows[0]!.props.onPress());
        expect(Linking.openURL).toHaveBeenCalledWith(url);
      }
    } finally {
      if (tree) act(() => tree.unmount());
      replaced.restore();
    }
  }
);
