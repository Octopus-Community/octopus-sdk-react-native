jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Platform: {
    OS: 'ios',
    select: (value: { default: unknown }) => value.default,
  },
  StyleSheet: {
    create: (value: unknown) => value,
    absoluteFill: {},
    absoluteFillObject: {},
  },
}));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));
import { useEffect, useState } from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import * as Octopus from '@octopus-community/react-native';
import { ShellTabs } from '../navigation/ShellTabs';
import { CommunityScreen } from '../screens/CommunityScreen';
import { communityNavigationReducer as reduce } from '../navigation/communityNavigation';
import type { CommunityNavigationState } from '../navigation/communityNavigation';
import type { TabId } from '../components/TabBar';

jest.mock(
  '@octopus-community/react-native',
  () => ({ OctopusUIView: jest.fn() }),
  { virtual: true }
);
const mounts = jest.fn();
const unmounts = jest.fn();
const close = jest.fn();
jest.mocked(Octopus.OctopusUIView).mockImplementation(() => {
  const [screen, setScreen] = useState('feed');
  useEffect(() => {
    mounts();
    return () => {
      unmounts();
    };
  }, []);
  return (
    <TouchableOpacity testID="sdk-post" onPress={() => setScreen('post')}>
      <Text>{screen}</Text>
    </TouchableOpacity>
  );
});
function surface(state: CommunityNavigationState, activeTab: TabId) {
  return (
    <ShellTabs
      activeTab={activeTab}
      settings={null}
      scenarios={null}
      community={
        <CommunityScreen
          interceptUrls
          interceptProfileTaps
          isDark={false}
          initError={null}
          onRetryInit={jest.fn()}
          isUserConnected
          onConnectUser={jest.fn()}
          communitySessionNonce={state.generation}
          notification={state.target}
          mode={state.mode}
          onBackRequested={close}
        />
      }
    />
  );
}
it.each(['embed', 'fullscreen'] as const)(
  'retains the post across tab switches and host covers, resets only on retap/session/mode (%s)',
  (mode) => {
    mounts.mockClear();
    unmounts.mockClear();
    let state: CommunityNavigationState = {
      mode,
      session: 1,
      generation: 0,
      target: null,
    };
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(surface(state, 'community'));
    });
    act(() => tree.root.findByProps({ testID: 'sdk-post' }).props.onPress());
    for (const tab of ['settings', 'scenarios', 'community'] as TabId[]) {
      act(() => tree.update(surface(state, tab)));
      expect(tree.root.findByType(Text).props.children).toBe('post');
      expect(
        jest.mocked(Octopus.OctopusUIView).mock.calls.at(-1)![0].isVisible
      ).toBe(tab === 'community');
    }
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(unmounts).not.toHaveBeenCalled();
    const sdkProps = jest.mocked(Octopus.OctopusUIView).mock.calls.at(-1)![0];
    expect(sdkProps.showBackButton).toBe(mode === 'fullscreen');
    sdkProps.onBackRequested!();
    expect(close).toHaveBeenCalled();
    for (const action of [
      { type: 'retap' } as const,
      { type: 'session', session: 2 } as const,
      {
        type: 'mode',
        mode: mode === 'embed' ? 'fullscreen' : 'embed',
      } as const,
    ]) {
      state = reduce(state, action);
      act(() => tree.update(surface(state, 'community')));
      expect(tree.root.findByType(Text).props.children).toBe('feed');
    }
    expect(mounts).toHaveBeenCalledTimes(4);
    expect(unmounts).toHaveBeenCalledTimes(3);
    act(() => tree.unmount());
  }
);
