jest.mock('../../../node_modules/react-native', () => ({
  Platform: { OS: 'android' },
  requireNativeComponent: () => 'NativeOctopusUIView',
  StyleSheet: {
    create: (value: unknown) => value,
    flatten: (value: unknown) => value,
  },
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { OctopusUIView } from '../../../src/OctopusUIView';

// The host supplies route focus (useIsFocused in the README integration).
function CommunityScreen({ isFocused }: { isFocused: boolean }) {
  return <OctopusUIView isVisible={isFocused} style={{ flex: 1 }} />;
}

it('forwards retained route focus changes without remounting the native view', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<CommunityScreen isFocused />);
  });
  const nativeView = tree.root.findByProps({
    navigationMode: 'navigationStack',
  });
  expect(nativeView.props.isVisible).toBe(true);

  // Another tab, return, covering stack route, return. Both routes stay mounted.
  for (const isFocused of [false, true, false, true]) {
    act(() => tree.update(<CommunityScreen isFocused={isFocused} />));
    expect(tree.root.findByProps({ navigationMode: 'navigationStack' })).toBe(
      nativeView
    );
    expect(nativeView.props.isVisible).toBe(isFocused);
  }
  act(() => tree.unmount());
});
