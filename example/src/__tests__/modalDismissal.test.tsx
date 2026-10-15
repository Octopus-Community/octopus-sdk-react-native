jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { useModalDismissal } from '../navigation/useModalDismissal';

let route: ReturnType<typeof useModalDismissal>;
const hide = jest.fn();
function Harness({ visible }: { visible: boolean }) {
  route = useModalDismissal(visible, hide);
  return null;
}
it('waits for iOS onDismiss even when a user already started closing the modal', async () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<Harness visible />);
  });
  act(() => {
    tree.update(<Harness visible={false} />);
  });
  let finished = false;
  const leaving = route.dismiss().then(() => {
    finished = true;
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(finished).toBe(false);
  await act(async () => {
    route.onDismiss();
    await leaving;
  });
  expect(finished).toBe(true);
  act(() => tree.unmount());
});
