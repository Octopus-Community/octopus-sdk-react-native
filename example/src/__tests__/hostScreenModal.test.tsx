jest.mock('react-native', () => ({
  Modal: 'Modal',
  Platform: { OS: 'android' },
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { BackHandler, Modal, Platform } from 'react-native';
import { HostScreenModal } from '../components/HostScreenModal';
import { createBackDispatcher } from '../navigation/backDispatcher';
import {
  useHardwareBack,
  useHardwareBackListener,
} from '../navigation/useHardwareBack';

it('routes modal Back to dismissal, then sends the next non-modal Back through the covered screen dispatcher', () => {
  const dispatcher = createBackDispatcher();
  const coveredBack = jest.fn(() => true);
  const dismiss = jest.fn();
  const onShow = jest.fn();
  const onDismiss = jest.fn();
  function Harness({ visible }: { visible: boolean }) {
    useHardwareBackListener(dispatcher);
    useHardwareBack('screen', coveredBack, dispatcher);
    return (
      <HostScreenModal
        visible={visible}
        onShow={onShow}
        onRequestClose={dismiss}
        onDismiss={onDismiss}
        overlays={null}
      >
        Host screen
      </HostScreenModal>
    );
  }
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<Harness visible />);
  });
  act(() => tree.root.findByType(Modal).props.onShow());
  expect(onShow).toHaveBeenCalledTimes(1);
  // Android Modal owns a window: it receives onRequestClose instead of hardwareBackPress.
  act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(coveredBack).not.toHaveBeenCalled();
  expect(dispatcher.size()).toBe(1); // No host overlay registration competing with native Back.
  act(() => {
    tree.update(<Harness visible={false} />);
  });
  expect(onDismiss).toHaveBeenCalledTimes(1);
  const hardwareBack = jest.mocked(BackHandler.addEventListener).mock
    .calls[0]![1];
  act(() => {
    expect(hardwareBack()).toBe(true);
  });
  expect(coveredBack).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  expect(dispatcher.size()).toBe(0);
});

it('waits for iOS native dismissal and nests the auxiliary modals above the host', () => {
  Platform.OS = 'ios';
  const onDismiss = jest.fn();
  const overlays = (
    <>
      <Modal visible testID="debug-modal" />
      <Modal visible testID="webview-modal" />
    </>
  );
  const render = (visible: boolean) => (
    <HostScreenModal
      visible={visible}
      onShow={jest.fn()}
      onRequestClose={jest.fn()}
      onDismiss={onDismiss}
      overlays={overlays}
    >
      Host screen
    </HostScreenModal>
  );
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(render(true));
  });
  const host = () => tree.root.findAllByType(Modal)[0]!;
  expect(host().findAllByType(Modal)).toHaveLength(3);
  expect(host().findByProps({ testID: 'debug-modal' })).toBeDefined();
  expect(host().findByProps({ testID: 'webview-modal' })).toBeDefined();
  act(() => {
    tree.update(render(false));
  });
  expect(onDismiss).not.toHaveBeenCalled();
  expect(host().findAllByType(Modal)).toHaveLength(1);
  expect(tree.root.findByProps({ testID: 'debug-modal' })).toBeDefined();
  act(() => host().props.onDismiss());
  expect(onDismiss).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  Platform.OS = 'android';
});
