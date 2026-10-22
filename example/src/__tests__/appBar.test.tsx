jest.mock('react-native', () => ({
  Platform: { select: (values: { default: string }) => values.default },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
  MaterialIcons: 'MaterialIcons',
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ScrollView } from 'react-native';
import { AppBar } from '../components/AppBar';
import { ScenarioDetailFrame } from '../components/ScenarioDetailFrame';
import { useAppBarScroll } from '../navigation/useAppBarScroll';

const scroll = (y: number) =>
  ({
    nativeEvent: { contentOffset: { y } },
  }) as NativeSyntheticEvent<NativeScrollEvent>;
it.each(['medium', 'large'] as const)(
  'collapses the %s bar on scroll and expands only at the top',
  (size) => {
    let state!: ReturnType<typeof useAppBarScroll>;
    function Harness() {
      state = useAppBarScroll();
      return (
        <AppBar
          title="Settings"
          isDark
          size={size}
          collapsed={state.collapsed}
        />
      );
    }
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<Harness />);
    });
    try {
      expect(state.collapsed).toBe(false);
      const expandedHeight = tree.toJSON();
      act(() => state.onScroll(scroll(49)));
      expect(state.collapsed).toBe(true);
      expect(tree.toJSON()).not.toEqual(expandedHeight);
      // Resizing the bar or scrolling slightly upward must not reopen it mid-list.
      act(() => state.onScroll(scroll(24)));
      expect(state.collapsed).toBe(true);
      act(() => state.onScroll(scroll(0)));
      expect(state.collapsed).toBe(false);
      expect(tree.toJSON()).toEqual(expandedHeight);
    } finally {
      act(() => tree.unmount());
    }
  }
);

it('wires scenario detail scrolling to its own medium app bar', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ScenarioDetailFrame
        title="Theme"
        isDark={false}
        onBack={jest.fn()}
        onOpenDebug={jest.fn()}
      >
        {null}
      </ScenarioDetailFrame>
    );
  });
  try {
    expect(tree.root.findByType(AppBar).props.collapsed).toBe(false);
    act(() => tree.root.findByType(ScrollView).props.onScroll(scroll(100)));
    expect(tree.root.findByType(AppBar).props.collapsed).toBe(true);
    expect(tree.root.findByType(AppBar).props.showPlatformBadge).toBe(false);
  } finally {
    act(() => tree.unmount());
  }
});
