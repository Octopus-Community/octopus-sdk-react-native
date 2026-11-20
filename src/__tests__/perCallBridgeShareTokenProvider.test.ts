import { addBridgeShareTokenRequestListener } from '../addBridgeShareTokenRequestListener';
import { fetchOrCreateClientObjectRelatedPost } from '../fetchOrCreateClientObjectRelatedPost';
import type { OctopusPost } from '../types/octopusPost';

type TokenRequest = {
  requestId: string;
  bridgeFingerprint: string;
  tokenProviderId?: string;
};
type Handler = (event: TokenRequest) => Promise<void>;

const mockHandlers = new Set<Handler>();
const mockFetch = jest.fn();
const mockComplete = jest.fn();
const mockRegister = jest.fn();
const mockUnregister = jest.fn();
const mockRemove = jest.fn();
const mockLog = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    fetchOrCreateClientObjectRelatedPost: (...args: unknown[]) =>
      mockFetch(...args),
    completeBridgeShareTokenRequest: (...args: unknown[]) =>
      mockComplete(...args),
    registerBridgeShareTokenProvider: () => mockRegister(),
    unregisterBridgeShareTokenProvider: () => mockUnregister(),
  },
}));
jest.mock('../internals/eventEmitter', () => ({
  eventEmitter: {
    addListener: (_name: string, handler: Handler) => {
      mockHandlers.add(handler);
      return {
        remove: () => {
          mockRemove();
          mockHandlers.delete(handler);
        },
      };
    },
  },
}));
jest.mock('../internals/logger', () => ({
  log: (...args: unknown[]) => mockLog(...args),
}));

const clientPost = { objectId: 'object-1', text: 'Discussion' };
const post: OctopusPost = {
  id: 'post-1',
  reactions: [],
  commentCount: 0,
  viewCount: 0,
  userReactionKind: null,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const providerId = (index = 0): string => mockFetch.mock.calls[index]?.[1];
const request = (tokenProviderId?: string, requestId = 'request-1') => ({
  requestId,
  bridgeFingerprint: `fingerprint-${requestId}`,
  ...(tokenProviderId == null ? {} : { tokenProviderId }),
});
const emit = async (event: TokenRequest) => {
  await Promise.all([...mockHandlers].map((handler) => handler(event)));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset().mockResolvedValue(post);
  mockComplete.mockReset().mockResolvedValue(undefined);
  mockRegister.mockResolvedValue(undefined);
  mockUnregister.mockResolvedValue(undefined);
});
afterEach(() => {
  expect(mockHandlers.size).toBe(0);
  jest.useRealTimers();
});

it('registers before native can request a token, without registering a global signer', async () => {
  const provider = jest.fn().mockResolvedValue('per-call-token');
  mockFetch.mockImplementation(async (_content, id: string) => {
    await emit(request(id));
    return post;
  });

  await expect(
    fetchOrCreateClientObjectRelatedPost(clientPost, provider)
  ).resolves.toBe(post);

  expect(providerId()).toEqual(expect.any(String));
  expect(provider).toHaveBeenCalledWith('fingerprint-request-1');
  expect(mockComplete).toHaveBeenCalledWith('request-1', 'per-call-token');
  expect(mockRegister).not.toHaveBeenCalled();
  expect(mockUnregister).not.toHaveBeenCalled();
  expect(mockRemove).toHaveBeenCalledTimes(1);
});

it('routes concurrent calls to different providers, including out-of-order replies', async () => {
  const firstNative = deferred<OctopusPost>();
  const secondNative = deferred<OctopusPost>();
  const firstToken = deferred<string>();
  const secondToken = deferred<string>();
  const firstProvider = jest.fn(() => firstToken.promise);
  const secondProvider = jest.fn(() => secondToken.promise);
  mockFetch
    .mockReturnValueOnce(firstNative.promise)
    .mockReturnValueOnce(secondNative.promise);
  const first = fetchOrCreateClientObjectRelatedPost(clientPost, firstProvider);
  const second = fetchOrCreateClientObjectRelatedPost(
    { ...clientPost, objectId: 'object-2' },
    secondProvider
  );
  expect(providerId(0)).not.toBe(providerId(1));

  const firstReply = emit(request(providerId(0), 'first'));
  const secondReply = emit(request(providerId(1), 'second'));
  expect(firstProvider.mock.calls).toEqual([['fingerprint-first']]);
  expect(secondProvider.mock.calls).toEqual([['fingerprint-second']]);
  secondToken.resolve('second-token');
  await secondReply;
  secondNative.resolve(post);
  await second;
  expect(mockRemove).not.toHaveBeenCalled();
  firstToken.resolve('first-token');
  await firstReply;
  firstNative.resolve(post);
  await first;

  expect(mockComplete.mock.calls).toEqual([
    ['second', 'second-token'],
    ['first', 'first-token'],
  ]);
  expect(mockRemove).toHaveBeenCalledTimes(1);
});

it('uses the global fallback only for calls without a provider', async () => {
  const native = deferred<OctopusPost>();
  mockFetch.mockReturnValue(native.promise);
  const globalProvider = jest.fn().mockResolvedValue('global-token');
  const perCallProvider = jest.fn().mockResolvedValue('per-call-token');
  const global = addBridgeShareTokenRequestListener(globalProvider);
  const perCall = fetchOrCreateClientObjectRelatedPost(
    clientPost,
    perCallProvider
  );
  const fallback = fetchOrCreateClientObjectRelatedPost(clientPost);
  expect(mockFetch.mock.calls[1]?.[1]).toBeNull();

  await emit(request(providerId(0), 'per-call'));
  await emit(request(undefined, 'global'));
  await emit(request('unknown-provider', 'stale'));

  expect(globalProvider.mock.calls).toEqual([['fingerprint-global']]);
  expect(perCallProvider.mock.calls).toEqual([['fingerprint-per-call']]);
  expect(mockComplete.mock.calls).toEqual([
    ['per-call', 'per-call-token'],
    ['global', 'global-token'],
    // A request for an unknown (already released) id is declined, never signed by anyone.
    ['stale', null],
  ]);
  native.resolve(post);
  await Promise.all([perCall, fallback]);
  global.remove();
});

it('ignores Array.map indices 0, 1 and 2 and lets the global listener sign', async () => {
  const items = [0, 1, 2].map((index) => ({
    ...clientPost,
    objectId: `object-${index}`,
  }));
  const globalProvider = jest.fn().mockResolvedValue('global-token');
  const global = addBridgeShareTokenRequestListener(globalProvider);
  mockFetch.mockImplementation(async (content, id: string | null) => {
    await emit(request(id ?? undefined, content.objectId));
    return post;
  });

  try {
    // @ts-expect-error Exercise plain JS callers: map passes its numeric index as tokenProvider.
    const calls = items.map(fetchOrCreateClientObjectRelatedPost);
    const activeListeners = mockHandlers.size;
    await expect(Promise.all(calls)).resolves.toEqual([post, post, post]);

    expect(mockFetch.mock.calls.map((call) => call[1])).toEqual([
      null,
      null,
      null,
    ]);
    expect(activeListeners).toBe(1); // Only the global listener, no per-call registration.
    expect(globalProvider.mock.calls).toEqual(
      items.map((item) => [`fingerprint-${item.objectId}`])
    );
    expect(mockComplete.mock.calls).toEqual(
      items.map((item) => [item.objectId, 'global-token'])
    );
  } finally {
    global.remove();
  }
});

it.each([undefined, null, true, 42, 'invalid', {}])(
  'ignores a non-function tokenProvider (%p)',
  async (value) => {
    await expect(
      fetchOrCreateClientObjectRelatedPost(
        clientPost,
        // Simulate untyped JS callers without widening the public TypeScript API.
        value as Parameters<typeof fetchOrCreateClientObjectRelatedPost>[1]
      )
    ).resolves.toBe(post);

    expect(providerId()).toBeNull();
    expect(mockRemove).not.toHaveBeenCalled();
  }
);

it.each(['success', 'failure', 'synchronous failure', 'invalid argument'])(
  'releases the provider after %s while another call remains active',
  async (outcome) => {
    const native = deferred<OctopusPost>();
    const activeNative = deferred<OctopusPost>();
    const error = new Error('Native failure');
    mockFetch.mockReturnValueOnce(activeNative.promise);
    const active = fetchOrCreateClientObjectRelatedPost(
      clientPost,
      async () => 'active'
    );
    const handler = [...mockHandlers][0]!;
    const provider = jest.fn().mockResolvedValue('expired');
    if (outcome === 'synchronous failure') {
      mockFetch.mockImplementationOnce(() => {
        throw error;
      });
    } else {
      mockFetch.mockReturnValueOnce(native.promise);
    }
    const call = fetchOrCreateClientObjectRelatedPost(
      outcome === 'invalid argument' ? null! : clientPost,
      provider
    );
    const id = outcome === 'invalid argument' ? 'unused' : providerId(1);
    if (outcome === 'success') {
      native.resolve(post);
      await call;
    } else {
      if (outcome === 'failure') native.reject(error);
      await expect(call).rejects.toBeInstanceOf(Error);
    }

    await handler(request(id));
    expect(provider).not.toHaveBeenCalled();
    expect(mockComplete.mock.calls).toEqual([['request-1', null]]);
    expect(mockRemove).not.toHaveBeenCalled();
    activeNative.resolve(post);
    await active;
    expect(mockRemove).toHaveBeenCalledTimes(1);
  }
);

it('releases a provider that never answers once the native timeout ends the call', async () => {
  jest.useFakeTimers();
  const token = deferred<string | null>();
  const provider = jest.fn(() => token.promise);
  mockFetch.mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(post), 60_000);
      })
  );
  const call = fetchOrCreateClientObjectRelatedPost(clientPost, provider);
  const id = providerId();
  const handler = [...mockHandlers][0]!;
  const reply = emit(request(id));
  expect(provider).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(60_000);
  await expect(call).resolves.toBe(post);
  expect(mockRemove).toHaveBeenCalledTimes(1);
  await handler(request(id, 'late'));
  expect(provider).toHaveBeenCalledTimes(1);
  token.resolve(null);
  await reply;
});

it.each(['null', 'undefined', 'throw', 'reject'])(
  'declines with a null token on %s without invoking the global fallback',
  async (outcome) => {
    const native = deferred<OctopusPost>();
    mockFetch.mockReturnValue(native.promise);
    const globalProvider = jest.fn().mockResolvedValue('global-token');
    const global = addBridgeShareTokenRequestListener(globalProvider);
    const provider = jest.fn().mockImplementation(() => {
      if (outcome === 'throw') throw new Error('Signer failed');
      if (outcome === 'reject')
        return Promise.reject(new Error('Signer failed'));
      return Promise.resolve(outcome === 'null' ? null : undefined);
    });
    const call = fetchOrCreateClientObjectRelatedPost(clientPost, provider);
    await emit(request(providerId()));
    expect(mockComplete).toHaveBeenCalledWith('request-1', null);
    expect(globalProvider).not.toHaveBeenCalled();
    native.resolve(post);
    await call;
    global.remove();
  }
);

it('logs a failed token handback without leaking an unhandled rejection', async () => {
  const native = deferred<OctopusPost>();
  mockFetch.mockReturnValue(native.promise);
  mockComplete.mockRejectedValueOnce(new Error('Bridge unavailable'));
  const call = fetchOrCreateClientObjectRelatedPost(
    clientPost,
    async () => 'token'
  );
  await expect(emit(request(providerId()))).resolves.toBeUndefined();
  expect(mockLog).toHaveBeenCalledWith(
    expect.anything(),
    'Failed to hand the bridge share token back to Octopus',
    { name: 'Error', message: 'Bridge unavailable' }
  );
  native.resolve(post);
  await call;
});

it('logs a failing provider as a summary, never the raw error', async () => {
  const native = deferred<OctopusPost>();
  mockFetch.mockReturnValue(native.promise);
  const failure = Object.assign(new Error('Signer failed'), {
    request: { headers: { Authorization: 'Bearer secret' } },
  });
  const call = fetchOrCreateClientObjectRelatedPost(clientPost, async () => {
    throw failure;
  });
  await emit(request(providerId()));
  expect(mockLog).toHaveBeenCalledWith(
    expect.anything(),
    'Failed to provide a bridge share token to Octopus',
    { name: 'Error', message: 'Signer failed' }
  );
  expect(mockComplete).toHaveBeenCalledWith('request-1', null);
  native.resolve(post);
  await call;
});
