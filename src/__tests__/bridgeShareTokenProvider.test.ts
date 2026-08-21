import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addBridgeShareTokenRequestListener } from '../addBridgeShareTokenRequestListener';

const mockComplete = jest.fn();
const mockRegister = jest.fn();
const mockUnregister = jest.fn();
const mockAddListener = jest.fn();
const mockRemoveSubscription = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    completeBridgeShareTokenRequest: (...args: unknown[]) =>
      mockComplete(...args),
    registerBridgeShareTokenProvider: (...args: unknown[]) =>
      mockRegister(...args),
    unregisterBridgeShareTokenProvider: (...args: unknown[]) =>
      mockUnregister(...args),
  },
}));

jest.mock('../internals/eventEmitter', () => ({
  eventEmitter: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
  },
}));

const mockLog = jest.fn();
jest.mock('../internals/logger', () => ({
  log: (...args: unknown[]) => mockLog(...args),
}));

/** The native event handler the listener registered, as the emitter would invoke it. */
type NativeHandler = (event: {
  requestId: string;
  bridgeFingerprint: string;
}) => Promise<void>;

const registeredHandler = (): NativeHandler =>
  mockAddListener.mock.calls[0]?.[1] as NativeHandler;

beforeEach(() => {
  mockComplete.mockReset().mockResolvedValue(undefined);
  mockRegister.mockReset().mockResolvedValue(undefined);
  mockUnregister.mockReset().mockResolvedValue(undefined);
  mockRemoveSubscription.mockReset();
  mockAddListener
    .mockReset()
    .mockReturnValue({ remove: mockRemoveSubscription });
  mockLog.mockReset();
});

describe('addBridgeShareTokenRequestListener', () => {
  it('subscribes to bridgeShareTokenRequest', () => {
    addBridgeShareTokenRequestListener(async () => 'jwt');

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener.mock.calls[0]?.[0]).toBe('bridgeShareTokenRequest');
  });

  it('announces the provider to the native side on subscribe', async () => {
    // The native side cannot infer this from the event subscription (see
    // nativeEventGate.test.ts), and on iOS it MUST know: the native signing hook has no
    // "publish unsigned" channel, so wiring it with nobody listening would break every
    // prefilled image publish.
    addBridgeShareTokenRequestListener(async () => 'jwt');

    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockUnregister).not.toHaveBeenCalled();
  });

  it('withdraws the provider and the event subscription on remove', () => {
    const subscription = addBridgeShareTokenRequestListener(async () => 'jwt');

    subscription.remove();

    expect(mockRemoveSubscription).toHaveBeenCalledTimes(1);
    expect(mockUnregister).toHaveBeenCalledTimes(1);
  });

  it('passes the fingerprint to the callback and the token back under the same requestId', async () => {
    const provider = jest.fn().mockResolvedValue('signed.jwt.value');
    addBridgeShareTokenRequestListener(provider);

    await registeredHandler()({
      requestId: 'req-1',
      bridgeFingerprint: 'fingerprint-1',
    });

    expect(provider).toHaveBeenCalledWith('fingerprint-1');
    expect(mockComplete).toHaveBeenCalledWith('req-1', 'signed.jwt.value');
  });

  it('correlates concurrent requests by requestId rather than by arrival order', async () => {
    const resolvers: Array<(token: string) => void> = [];
    addBridgeShareTokenRequestListener(
      () => new Promise<string>((resolve) => resolvers.push(resolve))
    );

    const first = registeredHandler()({
      requestId: 'req-1',
      bridgeFingerprint: 'f1',
    });
    const second = registeredHandler()({
      requestId: 'req-2',
      bridgeFingerprint: 'f2',
    });

    // Answered out of order on purpose: each reply must carry its own requestId.
    resolvers[1]?.('token-2');
    resolvers[0]?.('token-1');
    await Promise.all([first, second]);

    expect(mockComplete).toHaveBeenCalledWith('req-2', 'token-2');
    expect(mockComplete).toHaveBeenCalledWith('req-1', 'token-1');
  });

  it('forwards a declined signature as a null reply', async () => {
    addBridgeShareTokenRequestListener(async () => null);

    await registeredHandler()({ requestId: 'req-1', bridgeFingerprint: 'f1' });

    expect(mockComplete).toHaveBeenCalledWith('req-1', null);
  });

  it('normalizes an undefined reply to null', async () => {
    // A host writing `async () => { /* forgot to return */ }` must still answer: the native
    // side is holding a publish open on this reply.
    addBridgeShareTokenRequestListener((() =>
      Promise.resolve(undefined)) as unknown as () => Promise<string>);

    await registeredHandler()({ requestId: 'req-1', bridgeFingerprint: 'f1' });

    expect(mockComplete).toHaveBeenCalledWith('req-1', null);
  });

  it('answers with null when the callback throws, instead of leaving the request pending', async () => {
    addBridgeShareTokenRequestListener(async () => {
      throw new Error('backend unreachable');
    });

    await expect(
      registeredHandler()({ requestId: 'req-1', bridgeFingerprint: 'f1' })
    ).resolves.toBeUndefined();

    expect(mockComplete).toHaveBeenCalledWith('req-1', null);
    expect(mockLog).toHaveBeenCalled();
  });

  it('never logs the token or the fingerprint', async () => {
    addBridgeShareTokenRequestListener(async () => {
      throw new Error('backend unreachable');
    });

    await registeredHandler()({
      requestId: 'req-1',
      bridgeFingerprint: 'secret-fingerprint',
    });

    const logged = JSON.stringify(mockLog.mock.calls);
    expect(logged).not.toContain('secret-fingerprint');
  });

  it('swallows a failure of the native reply rather than surfacing an unhandled rejection', async () => {
    mockComplete.mockRejectedValue(new Error('bridge gone'));
    addBridgeShareTokenRequestListener(async () => 'jwt');

    await expect(
      registeredHandler()({ requestId: 'req-1', bridgeFingerprint: 'f1' })
    ).resolves.toBeUndefined();
    expect(mockLog).toHaveBeenCalled();
  });
});

describe('the two native brokers agree on the request timeout', () => {
  /**
   * The wait for a `bridgeShareTokenRequest` is bounded on both platforms so a JS side that
   * never answers cannot hang a publish. Nothing at build time links the two constants — this
   * is the only place a drift shows up. Mirrors the equivalent check in
   * `connectUserErrorParity.test.ts`.
   */
  const ROOT = join(__dirname, '..', '..');
  const read = (relativePath: string): string =>
    readFileSync(join(ROOT, relativePath), 'utf8');

  const ANDROID_BROKER =
    'android/src/main/java/com/octopuscommunity/octopusreactnativesdk/BridgeShareTokenBroker.kt';
  const IOS_BROKER = 'ios/OctopusBridgeShareTokenBroker.swift';

  const extract = (source: string, pattern: RegExp): number => {
    const match = pattern.exec(source);
    if (match?.[1] == null) {
      throw new Error(`Could not read the timeout with ${pattern}.`);
    }
    return Number(match[1].replace(/_/g, ''));
  };

  it('declares the same value in the same unit on both sides', () => {
    const android = extract(
      read(ANDROID_BROKER),
      /TOKEN_REQUEST_TIMEOUT_MS\s*=\s*([0-9_]+)L?/
    );
    const ios = extract(
      read(IOS_BROKER),
      /tokenRequestTimeoutMilliseconds[^=\n]*=\s*([0-9_]+)/
    );

    expect(android).toBe(ios);
  });

  it('emits the event name JS subscribes to, on both sides', () => {
    // A rename on one native side only would compile fine and starve the listener silently.
    expect(read(ANDROID_BROKER) + read(IOS_BROKER)).toBeTruthy();
    expect(
      read(
        'android/src/main/java/com/octopuscommunity/octopusreactnativesdk/OctopusEventEmitter.kt'
      )
    ).toContain('"bridgeShareTokenRequest"');
    expect(read('ios/OctopusEventManager.swift')).toContain(
      '"bridgeShareTokenRequest"'
    );
  });
});
