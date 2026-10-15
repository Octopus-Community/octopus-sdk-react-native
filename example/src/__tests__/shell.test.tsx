jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (value: unknown) => value,
    absoluteFillObject: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    flatten: (value: unknown[]) => Object.assign({}, ...value),
  },
  Platform: { select: (value: { default: string }) => value.default },
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 34 }),
}));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));

import { useEffect, useState } from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { ShellTabs } from '../navigation/ShellTabs';
import { useHardwareBack } from '../navigation/useHardwareBack';
import { createBackDispatcher } from '../navigation/backDispatcher';
import { TabBar, START_TAB, TABS, type TabId } from '../components/TabBar';
import { chromeColors } from '../theme/branding';

it('offers exactly Scenarios / Community / Settings and starts on Scenarios', () => {
  expect(TABS.map((tab) => tab.id)).toEqual([
    'scenarios',
    'community',
    'settings',
  ]);
  expect(START_TAB).toBe('scenarios');
});

it('keeps tab state and native instances across switches; only visible Back and accessibility are active', () => {
  const dispatcher = createBackDispatcher();
  const mounts = jest.fn();
  const unmounts = jest.fn();
  const back = jest.fn((_id: string) => true);
  function NativeSurface({ id }: { id: string }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
      mounts(id);
      return () => {
        unmounts(id);
      };
    }, [id]);
    useHardwareBack('screen', () => back(id), dispatcher);
    return (
      <TouchableOpacity testID={id} onPress={() => setCount(count + 1)}>
        <Text>{count}</Text>
      </TouchableOpacity>
    );
  }
  const render = (activeTab: TabId) => (
    <ShellTabs
      activeTab={activeTab}
      scenarios={<NativeSurface id="scenario-preview" />}
      community={<NativeSurface id="native-community" />}
      settings={<NativeSurface id="settings-page" />}
    />
  );
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(render(START_TAB));
  });
  act(() =>
    tree.root.findByProps({ testID: 'scenario-preview' }).props.onPress()
  );
  for (const tab of ['community', 'settings', 'scenarios'] as TabId[]) {
    act(() => tree.update(render(tab)));
    for (const id of TABS.map((item) => item.id)) {
      const surface = tree.root
        .findAllByType(View)
        .find((node) => node.props.testID === `${id}-surface`)!;
      const visible = id === tab;
      expect(surface.props.pointerEvents).toBe(visible ? 'auto' : 'none');
      expect(surface.props.accessibilityElementsHidden).toBe(!visible);
      expect(surface.props.importantForAccessibility).toBe(
        visible ? 'auto' : 'no-hide-descendants'
      );
      expect(StyleSheet.flatten(surface.props.style).display).toBeUndefined();
      expect(StyleSheet.flatten(surface.props.style).opacity).toBe(
        visible ? 1 : 0
      );
      expect(surface.props.active).toBe(visible);
    }
    act(() => {
      expect(dispatcher.dispatch()).toBe(true);
    });
    expect(back).toHaveBeenLastCalledWith(
      tab === 'scenarios'
        ? 'scenario-preview'
        : tab === 'community'
          ? 'native-community'
          : 'settings-page'
    );
    expect(dispatcher.size()).toBe(1);
  }
  expect(
    tree.root.findByProps({ testID: 'scenario-preview' }).findByType(Text).props
      .children
  ).toBe(1);
  expect(mounts).toHaveBeenCalledTimes(3);
  expect(unmounts).not.toHaveBeenCalled();
  act(() => tree.unmount());
  expect(unmounts).toHaveBeenCalledTimes(3);
  expect(dispatcher.size()).toBe(0);
});

it('never reorders the retained surfaces, since Fabric mounts siblings in zIndex order', () => {
  // Fabric stable-sorts siblings by zIndex before diffing them, and a surface whose rank
  // changes is removed and re-inserted. On Android that detaches the SDK's ComposeView,
  // which disposes its composition: the Community stack restarted on the feed after every
  // tab switch (PR #342 device QA).
  const render = (activeTab: TabId) => (
    <ShellTabs
      activeTab={activeTab}
      scenarios={null}
      community={null}
      settings={null}
    />
  );
  const mountOrder = (tree: ReactTestRenderer) =>
    tree.root
      .findAllByType(View)
      .filter((node) => String(node.props.testID).endsWith('-surface'))
      .map((node, index) => ({
        id: String(node.props.testID),
        index,
        zIndex: StyleSheet.flatten(node.props.style).zIndex ?? 0,
      }))
      .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index)
      .map((surface) => surface.id);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(render(START_TAB));
  });
  const initial = mountOrder(tree);
  expect(initial).toHaveLength(TABS.length);
  for (const tab of [
    'community',
    'settings',
    'community',
    'scenarios',
  ] as TabId[]) {
    act(() => tree.update(render(tab)));
    expect(mountOrder(tree)).toEqual(initial);
  }
  act(() => tree.unmount());
});

it('shows both badges, selection and the bottom safe area in the actual tab bar', () => {
  const c = chromeColors(false);
  const change = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <TabBar
        activeTab={START_TAB}
        onTabChange={change}
        isDark={false}
        badgeRingColor={c.navSurface}
        activeColor={c.navActive}
        inactiveColor={c.navInactive}
        indicatorColor={c.navIndicator}
        notSeenNotificationsCount={120}
        updateAvailable
      />
    );
  });
  const tabs = tree.root.findAllByType(TouchableOpacity);
  expect(tabs).toHaveLength(3);
  expect(tabs[0]!.props.accessibilityState.selected).toBe(true);
  expect(tabs[1]!.props.accessibilityLabel).toContain('120 unread');
  expect(tabs[2]!.props.accessibilityLabel).toContain('update available');
  expect(
    tree.root.findAllByType(Text).map((node) => node.props.children)
  ).toEqual(expect.arrayContaining(['99+', '!']));
  expect(
    StyleSheet.flatten(tree.root.findAllByType(View)[0]!.props.style)
      .paddingBottom
  ).toBe(34);
  act(() => tabs[2]!.props.onPress());
  expect(change).toHaveBeenCalledWith('settings');
  act(() => tree.unmount());
});
