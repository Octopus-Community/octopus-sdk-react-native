import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { createPushInbox } from '../navigation/pushInbox';
import { useCommunityPushRouting } from '../navigation/useCommunityPushRouting';
import { mockStore } from '../testing/asyncStorageMock';

let inbox: ReturnType<typeof createPushInbox>;
let tree: ReactTestRenderer | undefined;
const openTarget = jest.fn();
const dismissPresentations = jest.fn(() => Promise.resolve());
function Harness({ ready }: { ready: boolean }) {
  useCommunityPushRouting({ ready, dismissPresentations, openTarget, inbox });
  return null;
}
const tap = (id: string, path = '/post/demo') => ({
  id,
  notification: {
    title: '',
    body: '',
    linkPath: path,
    rawPayload: { message_id: id },
  },
});
beforeEach(() => {
  mockStore.reset();
  inbox = createPushInbox();
  jest.clearAllMocks();
});
afterEach(() => {
  if (tree) act(() => tree!.unmount());
  tree = undefined;
});

it.each(['post', 'group', 'member', 'profile'])(
  'consumes a cold %s push once after restart, with duplicate warm/initial delivery',
  async (target) => {
    await inbox.enqueue(tap(target, `/${target}/demo`));
    inbox = createPushInbox(); // New process reloads the headless tap from disk.
    await act(async () => {
      tree = create(<Harness ready={false} />);
    });
    expect(openTarget).not.toHaveBeenCalled();
    await act(async () => {
      tree!.update(<Harness ready />);
    });
    expect(openTarget).toHaveBeenCalledTimes(1);
    expect(openTarget.mock.calls[0]![0].linkPath).toBe(`/${target}/demo`);
    await act(async () => {
      await inbox.enqueue(tap(target, `/${target}/demo`));
    });
    expect(openTarget).toHaveBeenCalledTimes(1);
    expect(inbox.snapshot()).toHaveLength(0);
    const restarted = createPushInbox();
    await restarted.enqueue(tap(target));
    expect(restarted.snapshot()).toHaveLength(0);
  }
);
it('waits for modal/sheet dismissal and keeps a push pending through SDK initialization', async () => {
  let dismissed!: () => void;
  dismissPresentations.mockReturnValueOnce(
    new Promise<void>((done) => {
      dismissed = done;
    })
  );
  await act(async () => {
    tree = create(<Harness ready />);
    await inbox.enqueue(tap('pending'));
  });
  expect(dismissPresentations).toHaveBeenCalledTimes(1);
  expect(openTarget).not.toHaveBeenCalled();
  await act(async () => {
    tree!.update(<Harness ready={false} />);
  });
  await act(async () => {
    dismissed();
  });
  expect(inbox.snapshot()).toHaveLength(1);
  expect(openTarget).not.toHaveBeenCalled();
  await act(async () => {
    tree!.update(<Harness ready />);
  });
  expect(openTarget).toHaveBeenCalledTimes(1);
});
it('serializes distinct warm pushes while a sheet leaves and ignores duplicates arriving in flight', async () => {
  let dismissed!: () => void;
  dismissPresentations.mockReturnValueOnce(
    new Promise<void>((done) => {
      dismissed = done;
    })
  );
  await act(async () => {
    tree = create(<Harness ready />);
    await inbox.enqueue(tap('first'));
  });
  await act(async () => {
    await inbox.enqueue(tap('first'));
    await inbox.enqueue(tap('second'));
  });
  expect(openTarget).not.toHaveBeenCalled();
  await act(async () => {
    dismissed();
  });
  expect(
    openTarget.mock.calls.map(
      ([notification]) => notification.rawPayload.message_id
    )
  ).toEqual(['first', 'second']);
});
it('does not lose a tap when persisting the consumption fails', async () => {
  await inbox.enqueue(tap('storage-failure'));
  mockStore.failNextCall('setItem');
  await expect(inbox.take('storage-failure')).rejects.toThrow('storage full');
  expect(inbox.snapshot()).toHaveLength(1);
  expect(await inbox.take('storage-failure')).not.toBeNull();
  expect(await inbox.take('storage-failure')).toBeNull();
});

it('retains a tap if the surface becomes unavailable while storage commits consumption', async () => {
  await inbox.enqueue(tap('init-during-write'));
  const reject = jest.fn(() => false);
  expect(await inbox.take('init-during-write', reject)).toBeNull();
  expect(inbox.snapshot()).toHaveLength(1);
  const restarted = createPushInbox();
  await restarted.hydrate();
  expect(restarted.snapshot()).toHaveLength(1);
  expect(await inbox.take('init-during-write', () => true)).not.toBeNull();
});
