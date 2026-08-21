import { addClientObjectRelatedPostListener } from '../addClientObjectRelatedPostListener';
import { fetchOrCreateClientObjectRelatedPost } from '../fetchOrCreateClientObjectRelatedPost';
import { setNavigateToClientObjectCallback } from '../setNavigateToClientObjectCallback';
import { isClientPostError } from '../types/clientPostError';
import type { OctopusPost } from '../types/octopusPost';

const mockFetchOrCreate = jest.fn();
const mockStartObserving = jest.fn();
const mockStopObserving = jest.fn();
const mockRegisterNavigate = jest.fn();
const mockUnregisterNavigate = jest.fn();
const mockAddListener = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    fetchOrCreateClientObjectRelatedPost: (...args: unknown[]) =>
      mockFetchOrCreate(...args),
    startObservingClientObjectRelatedPost: (...args: unknown[]) =>
      mockStartObserving(...args),
    stopObservingClientObjectRelatedPost: (...args: unknown[]) =>
      mockStopObserving(...args),
    registerNavigateToClientObjectCallback: (...args: unknown[]) =>
      mockRegisterNavigate(...args),
    unregisterNavigateToClientObjectCallback: (...args: unknown[]) =>
      mockUnregisterNavigate(...args),
  },
}));

jest.mock('../internals/eventEmitter', () => ({
  eventEmitter: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
  },
}));

const post: OctopusPost = {
  id: 'post-1',
  reactions: [{ reactionKind: 'heart', count: 3 }],
  commentCount: 12,
  viewCount: 340,
  userReactionKind: null,
};

/** Hands back the callback the SDK registered on the emitter for the nth `addListener` call. */
function registeredHandler(index = 0): (event: unknown) => void {
  return mockAddListener.mock.calls[index]?.[1] as (event: unknown) => void;
}

beforeEach(() => {
  for (const mock of [
    mockFetchOrCreate,
    mockStartObserving,
    mockStopObserving,
    mockRegisterNavigate,
    mockUnregisterNavigate,
    mockAddListener,
  ]) {
    mock.mockReset();
  }
  mockFetchOrCreate.mockResolvedValue(post);
  mockStartObserving.mockResolvedValue(undefined);
  mockStopObserving.mockResolvedValue(undefined);
  mockRegisterNavigate.mockResolvedValue(undefined);
  mockUnregisterNavigate.mockResolvedValue(undefined);
  mockAddListener.mockReturnValue({ remove: jest.fn() });
  // Module-level state in setNavigateToClientObjectCallback: clear it so ordering between
  // tests cannot matter. Registering a throwaway and immediately calling its handle wins the
  // identity guard whatever the previous test left behind. Done before the mocks are asserted
  // on, hence the extra reset after.
  setNavigateToClientObjectCallback(() => {})();
  mockRegisterNavigate.mockClear();
  mockUnregisterNavigate.mockClear();
  mockAddListener.mockClear();
});

afterAll(() => {
  setNavigateToClientObjectCallback(() => {})();
});

describe('fetchOrCreateClientObjectRelatedPost', () => {
  it('forwards the post and normalizes every absent optional to null', async () => {
    await fetchOrCreateClientObjectRelatedPost({
      objectId: 'article-1',
      text: 'A long enough post text.',
    });

    expect(mockFetchOrCreate).toHaveBeenCalledWith({
      objectId: 'article-1',
      text: 'A long enough post text.',
      attachment: null,
      catchPhrase: null,
      viewObjectButtonText: null,
      groupId: null,
    });
  });

  it('forwards a remote-image attachment unchanged', async () => {
    await fetchOrCreateClientObjectRelatedPost({
      objectId: 'article-1',
      text: 'A long enough post text.',
      attachment: { type: 'remoteImage', url: 'https://example.com/a.jpg' },
      catchPhrase: 'What do you think?',
      viewObjectButtonText: 'Read it',
      groupId: 'group-7',
    });

    expect(mockFetchOrCreate).toHaveBeenCalledWith({
      objectId: 'article-1',
      text: 'A long enough post text.',
      attachment: { type: 'remoteImage', url: 'https://example.com/a.jpg' },
      catchPhrase: 'What do you think?',
      viewObjectButtonText: 'Read it',
      groupId: 'group-7',
    });
  });

  it('resolves with the native post as-is', async () => {
    await expect(
      fetchOrCreateClientObjectRelatedPost({ objectId: 'a', text: 't' })
    ).resolves.toBe(post);
  });

  it('rejects with an error the type guard recognizes', async () => {
    const nativeError = Object.assign(new Error('No network'), {
      code: 'NO_NETWORK',
    });
    mockFetchOrCreate.mockRejectedValue(nativeError);

    await expect(
      fetchOrCreateClientObjectRelatedPost({ objectId: 'a', text: 't' })
    ).rejects.toBe(nativeError);
    expect(isClientPostError(nativeError)).toBe(true);
  });

  it('rejects rather than throwing when the native call throws synchronously', async () => {
    // What an unlinked native module does. A synchronous throw would bypass the `catch` the
    // TSDoc tells callers to write and land as an uncaught exception instead.
    const linkingError = new Error('Native module not linked');
    mockFetchOrCreate.mockImplementationOnce(() => {
      throw linkingError;
    });

    let returned: unknown;
    expect(() => {
      returned = fetchOrCreateClientObjectRelatedPost({
        objectId: 'a',
        text: 't',
      });
    }).not.toThrow();
    await expect(returned).rejects.toBe(linkingError);
  });

  it('rejects rather than throwing when the argument itself is unusable', async () => {
    await expect(
      fetchOrCreateClientObjectRelatedPost(
        undefined as unknown as Parameters<
          typeof fetchOrCreateClientObjectRelatedPost
        >[0]
      )
    ).rejects.toBeInstanceOf(TypeError);
  });
});

describe('addClientObjectRelatedPostListener', () => {
  it('subscribes to the shared channel and starts a native observation', () => {
    addClientObjectRelatedPostListener('article-1', jest.fn());

    expect(mockAddListener).toHaveBeenCalledWith(
      'clientObjectPostChanged',
      expect.any(Function)
    );
    expect(mockStartObserving).toHaveBeenCalledTimes(1);
    const [observationId, clientObjectId] = mockStartObserving.mock
      .calls[0] as [string, string];
    expect(typeof observationId).toBe('string');
    expect(clientObjectId).toBe('article-1');
  });

  it('mints a distinct observation id per subscription', () => {
    addClientObjectRelatedPostListener('article-1', jest.fn());
    addClientObjectRelatedPostListener('article-1', jest.fn());

    const first = mockStartObserving.mock.calls[0]?.[0];
    const second = mockStartObserving.mock.calls[1]?.[0];
    expect(first).not.toBe(second);
  });

  it('delivers only the emissions tagged with its own observation id', () => {
    // The point of the per-subscription contract: two listeners on the same object must not
    // see each other's emissions. A single global channel (the shape
    // `startObservingCommunityData` uses) would fail this.
    const first = jest.fn();
    const second = jest.fn();
    addClientObjectRelatedPostListener('article-1', first);
    addClientObjectRelatedPostListener('article-1', second);

    const firstId = mockStartObserving.mock.calls[0]?.[0] as string;
    registeredHandler(0)({ observationId: firstId, post });
    registeredHandler(1)({ observationId: firstId, post });

    expect(first).toHaveBeenCalledWith(post);
    expect(second).not.toHaveBeenCalled();
  });

  it('delivers null when no post exists yet for the object', () => {
    const callback = jest.fn();
    addClientObjectRelatedPostListener('article-1', callback);
    const id = mockStartObserving.mock.calls[0]?.[0] as string;

    registeredHandler()({ observationId: id, post: null });
    expect(callback).toHaveBeenCalledWith(null);

    // The native side sends `post: null`; a bridge that dropped the key must not turn the
    // emission into `undefined` for the host.
    registeredHandler()({ observationId: id });
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  it('ignores a malformed emission instead of throwing', () => {
    const callback = jest.fn();
    addClientObjectRelatedPostListener('article-1', callback);

    expect(() => registeredHandler()(undefined)).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('removes the emitter subscription and stops the native observation once', () => {
    const emitterSubscription = { remove: jest.fn() };
    mockAddListener.mockReturnValue(emitterSubscription);
    const subscription = addClientObjectRelatedPostListener(
      'article-1',
      jest.fn()
    );
    const id = mockStartObserving.mock.calls[0]?.[0] as string;

    subscription.remove();
    subscription.remove();

    expect(emitterSubscription.remove).toHaveBeenCalledTimes(1);
    expect(mockStopObserving).toHaveBeenCalledTimes(1);
    expect(mockStopObserving).toHaveBeenCalledWith(id);
  });

  it('swallows a native start failure instead of leaving an unhandled rejection', async () => {
    mockStartObserving.mockRejectedValue(new Error('boom'));
    expect(() =>
      addClientObjectRelatedPostListener('article-1', jest.fn())
    ).not.toThrow();
    await Promise.resolve();
  });
});

describe('setNavigateToClientObjectCallback', () => {
  it('registers natively and subscribes to the event', () => {
    setNavigateToClientObjectCallback(jest.fn());

    expect(mockRegisterNavigate).toHaveBeenCalledTimes(1);
    expect(mockAddListener).toHaveBeenCalledWith(
      'navigateToClientObject',
      expect.any(Function)
    );
  });

  it('delivers the objectId to the callback', () => {
    const callback = jest.fn();
    setNavigateToClientObjectCallback(callback);

    registeredHandler()({ objectId: 'article-1' });
    expect(callback).toHaveBeenCalledWith('article-1');
  });

  it('is last-write-wins, without re-subscribing or re-registering', () => {
    const first = jest.fn();
    const second = jest.fn();
    setNavigateToClientObjectCallback(first);
    setNavigateToClientObjectCallback(second);

    registeredHandler()({ objectId: 'article-1' });

    expect(second).toHaveBeenCalledWith('article-1');
    expect(first).not.toHaveBeenCalled();
    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockRegisterNavigate).toHaveBeenCalledTimes(1);
  });

  it('clears the registration through the returned handle', () => {
    const callback = jest.fn();
    const unregister = setNavigateToClientObjectCallback(callback);
    const handler = registeredHandler();

    unregister();

    expect(mockUnregisterNavigate).toHaveBeenCalledTimes(1);
    // A tap already in flight when the host cleared the callback must not reach it.
    handler({ objectId: 'article-1' });
    expect(callback).not.toHaveBeenCalled();
  });

  it('makes the handle idempotent', () => {
    const unregister = setNavigateToClientObjectCallback(jest.fn());

    unregister();
    unregister();

    expect(mockUnregisterNavigate).toHaveBeenCalledTimes(1);
  });

  it('guards the handle on identity: a stale cleanup leaves a newer registration alone', () => {
    const first = jest.fn();
    const second = jest.fn();
    const unregisterFirst = setNavigateToClientObjectCallback(first);
    setNavigateToClientObjectCallback(second);

    // The late cleanup of an unmounted component, or a hot reload: it must not wipe the
    // registration someone else made in between.
    unregisterFirst();

    expect(mockUnregisterNavigate).not.toHaveBeenCalled();
    registeredHandler()({ objectId: 'article-1' });
    expect(second).toHaveBeenCalledWith('article-1');
    expect(first).not.toHaveBeenCalled();
  });

  it('re-subscribes after a clear', () => {
    setNavigateToClientObjectCallback(jest.fn())();
    const callback = jest.fn();
    setNavigateToClientObjectCallback(callback);

    expect(mockAddListener).toHaveBeenCalledTimes(2);
    expect(mockRegisterNavigate).toHaveBeenCalledTimes(2);
    registeredHandler(1)({ objectId: 'article-2' });
    expect(callback).toHaveBeenCalledWith('article-2');
  });

  it('contains a throwing callback rather than letting it escape the emitter', () => {
    setNavigateToClientObjectCallback(() => {
      throw new Error('navigation blew up');
    });

    expect(() => registeredHandler()({ objectId: 'article-1' })).not.toThrow();
  });
});
