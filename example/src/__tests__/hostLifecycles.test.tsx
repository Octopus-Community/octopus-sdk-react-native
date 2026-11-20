// Model stack retention and transition events here; native detach/re-attach itself
// must be checked on a device with react-native-screens, never inferred from Jest.
const mockMount = jest.fn();
const mockUnmount = jest.fn();
const mockNavigationRef = {
  isReady: () => true,
  canGoBack: () => false,
  goBack: () => {},
};
let mockFinishPop: () => void;
let mockFinishPush: () => void;
let mockEmitTransitionEnd: (target: number, closing: boolean) => void;
let mockAppear: (name: string) => void;
let mockScreenOptions: Record<string, unknown>;

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Platform: { select: (v: { default: string }) => v.default },
  StyleSheet: { create: (v: unknown) => v, absoluteFill: {} },
}));
jest.mock('../components/PillButton', () => ({ PillButton: 'PillButton' }));
jest.mock('../components/PresetButton', () => ({
  PresetButton: 'PresetButton',
}));
jest.mock('../components/ScenarioDetailFrame', () => ({
  ScenarioDetailFrame: 'ScenarioDetailFrame',
}));
jest.mock(
  '@octopus-community/react-native',
  () => ({
    OctopusUIView: function MockCommunity() {
      const React = require('react');
      React.useEffect(() => {
        mockMount();
        return mockUnmount;
      }, []);
      return null;
    },
  }),
  { virtual: true }
);
jest.mock('@react-navigation/native', () => ({
  BaseNavigationContainer: 'BaseNavigationContainer',
  NavigationContainer: () => {
    throw new Error('Use the sample Back dispatcher, not a global BackHandler');
  },
  NavigationIndependentTree: 'NavigationIndependentTree',
  DefaultTheme: {},
  DarkTheme: {},
  useNavigationContainerRef: () => mockNavigationRef,
}));
jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  return {
    createNativeStackNavigator: () => ({
      Screen: () => null,
      Navigator: ({ children, screenOptions }: any) => {
        mockScreenOptions = screenOptions;
        const [routes, setRoutes] = React.useState([
          { name: 'Scenario', key: 0, params: undefined },
        ]);
        const nextKey = React.useRef(1);
        const screens = React.Children.toArray(children);
        // Match useNavigationBuilder: a Screen listener only receives events
        // targeting a route still present in the CURRENT navigation state.
        mockEmitTransitionEnd = (target, closing) => {
          const route = routes.find((r: any) => r.key === target);
          if (!route) return;
          const screen = screens.find((s: any) => s.props.name === route.name);
          screen.props.listeners?.transitionEnd?.({
            target,
            data: { closing },
          });
        };
        mockAppear = (name) => {
          const route = routes.find((r: any) => r.name === name);
          if (route) mockEmitTransitionEnd(route.key, false);
        };
        const stack = {
          push: (name: string, params: unknown) => {
            const previous = routes.at(-1);
            const next = { name, params, key: nextKey.current++ };
            mockFinishPush = () => {
              mockEmitTransitionEnd(previous.key, true);
              mockEmitTransitionEnd(next.key, false);
            };
            setRoutes([...routes, next]);
          },
          goBack: () => {
            const leaving = routes.at(-1);
            const returning = routes.at(-2);
            // JS pops remove the route before native transition events arrive.
            setRoutes(routes.slice(0, -1));
            mockFinishPop = () => {
              mockEmitTransitionEnd(leaving.key, true);
              mockEmitTransitionEnd(returning.key, false);
            };
          },
        };
        mockNavigationRef.canGoBack = () => routes.length > 1;
        mockNavigationRef.goBack = stack.goBack;
        return routes.map((route: any) => {
          const screen = screens.find((s: any) => s.props.name === route.name);
          return React.createElement(
            'RetainedScreen',
            { key: route.key, active: route === routes.at(-1) },
            screen.props.children({ navigation: stack, route })
          );
        });
      },
    }),
  };
});

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { OctopusUIView } from '@octopus-community/react-native';
import HostLifecyclesScenario from '../screens/HostLifecyclesScenario';
import { appBackDispatcher } from '../navigation/backDispatcher';
import { TabVisibility } from '../navigation/tabVisibility';
import { SCENARIO_SECTIONS, matchesQuery } from '../scenarios/catalog';

beforeEach(() => jest.clearAllMocks());

it('exposes the shared scenario through the host section and native-stack search', () => {
  expect(SCENARIO_SECTIONS.find((s) => s.id === 'host')?.scenarios).toContain(
    'hostLifecycles'
  );
  expect(matchesQuery('hostLifecycles', 'native-stack')).toBe(true);
});

it('keeps the same community mounted for three pushes/pops and counts only completed returns', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <HostLifecyclesScenario
        isDark={false}
        isInitialized
        onBack={jest.fn()}
        onOpenDebug={jest.fn()}
      />
    );
  });
  const press = (id: string) =>
    act(() => tree.root.findByProps({ testID: id }).props.onPress());
  const result = () =>
    tree.root.findByProps({ testID: 'hostLifecycles-result' }).props.children;
  try {
    act(() =>
      tree.root
        .findByProps({ testID: 'hostLifecycles-post-edit' })
        .props.onChangeText(' demo-post ')
    );
    expect(result()).toBe('Not run yet');
    press('qa-preset-hostLifecycles-3');
    act(() => mockFinishPush());
    expect(result()).toBe('Running…');
    act(() => mockAppear('Community'));
    expect(result()).toBe('Running…');
    const community = tree.root.findByType(OctopusUIView);
    expect(community.props.initialScreen).toEqual({
      type: 'post',
      postId: 'demo-post',
    });
    expect(mockScreenOptions).toMatchObject({
      presentation: 'card',
      freezeOnBlur: false,
    });
    for (let cycle = 1; cycle <= 3; cycle++) {
      press('hostLifecycles-push-button');
      act(() => mockFinishPush());
      expect(result()).toBe('Running…');
      expect(
        tree.root.findAllByProps({ testID: 'hostLifecycles-result' })
      ).toHaveLength(1);
      if (cycle === 2) {
        // Exercise the sample's hardware Back dispatcher as well as the button.
        act(() => {
          expect(appBackDispatcher.dispatch()).toBe(true);
        });
      } else press('hostLifecycles-pop-button');
      expect(result()).toBe('Running…');
      act(() => mockFinishPop());
      expect(result()).toContain(`Returned ${cycle} time(s)`);
      expect(result()).toContain('not a PASS');
      // Re-appearing without another cover push must not increment again.
      act(() => mockAppear('Community'));
      expect(result()).toContain(`Returned ${cycle} time(s)`);
      expect(tree.root.findByType(OctopusUIView)).toBe(community);
      expect(mockMount).toHaveBeenCalledTimes(1);
      expect(mockUnmount).not.toHaveBeenCalled();
    }
    press('hostLifecycles-back-button');
    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(result()).toContain('Returned 3 time(s)');
    press('qa-preset-hostLifecycles-3');
    expect(result()).toBe('Running…');
    expect(mockMount).toHaveBeenCalledTimes(2);
    act(() => mockFinishPush());
    expect(result()).toBe('Running…');
    press('hostLifecycles-push-button');
    act(() => mockFinishPush());
    press('hostLifecycles-pop-button');
    act(() => mockFinishPop());
    expect(result()).toContain('Returned 1 time(s)');
  } finally {
    act(() => tree.unmount());
  }
});

it.each([false, true])(
  'guards a missing SDK or blank post (initialized=%s)',
  (initialized) => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <HostLifecyclesScenario
          isDark
          isInitialized={initialized}
          onBack={jest.fn()}
          onOpenDebug={jest.fn()}
        />
      );
    });
    try {
      const preset = () =>
        tree.root.findByProps({ testID: 'qa-preset-hostLifecycles-3' });
      expect(preset().props.disabled).toBe(!initialized);
      act(() =>
        tree.root
          .findByProps({ testID: 'hostLifecycles-post-edit' })
          .props.onChangeText('   ')
      );
      expect(preset().props.disabled).toBe(true);
      expect(tree.root.findAllByType(OctopusUIView)).toHaveLength(0);
    } finally {
      act(() => tree.unmount());
    }
  }
);

it('leaves Back to the visible tab while the native stack is retained in a hidden tab', () => {
  let tree!: ReactTestRenderer;
  const onBack = jest.fn();
  const render = (visible: boolean) => (
    <TabVisibility.Provider value={visible}>
      <HostLifecyclesScenario
        isDark={false}
        isInitialized
        onBack={onBack}
        onOpenDebug={jest.fn()}
      />
    </TabVisibility.Provider>
  );
  act(() => {
    tree = create(render(true));
  });
  const press = (id: string) =>
    act(() => tree.root.findByProps({ testID: id }).props.onPress());
  const settingsBack = jest.fn(() => true);
  let unregister = () => {};
  try {
    press('qa-preset-hostLifecycles-3');
    press('hostLifecycles-push-button');
    act(() => tree.update(render(false)));
    unregister = appBackDispatcher.register('screen', settingsBack);
    act(() => {
      expect(appBackDispatcher.dispatch()).toBe(true);
    });
    expect(settingsBack).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findAllByProps({ testID: 'hostLifecycles-pop-button' })
    ).toHaveLength(1);
    expect(onBack).not.toHaveBeenCalled();
    act(() => tree.update(render(true)));
    act(() => {
      expect(appBackDispatcher.dispatch()).toBe(true);
    });
    expect(settingsBack).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findAllByProps({ testID: 'hostLifecycles-pop-button' })
    ).toHaveLength(0);
    expect(mockMount).toHaveBeenCalledTimes(1);
  } finally {
    unregister();
    act(() => tree.unmount());
  }
});
