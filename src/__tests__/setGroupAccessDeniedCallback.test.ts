import type { setGroupAccessDeniedCallback as SetGroupAccessDeniedCallback } from '../setGroupAccessDeniedCallback';

const mockAddListener = jest.fn();

jest.mock('../internals/eventEmitter', () => ({
  eventEmitter: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
  },
}));

/** The native event handler the listener registered, as the emitter would invoke it. */
type NativeHandler = (event: { groupId: string }) => void;

const registeredHandler = (): NativeHandler =>
  mockAddListener.mock.calls[0]?.[1] as NativeHandler;

/**
 * `setGroupAccessDeniedCallback` keeps its subscribed-once state in module-level variables (see
 * its own doc comment), so each test needs a fresh module instance rather than the one every
 * other test already subscribed.
 */
const freshModule = (): {
  setGroupAccessDeniedCallback: typeof SetGroupAccessDeniedCallback;
} => {
  jest.resetModules();
  return require('../setGroupAccessDeniedCallback');
};

beforeEach(() => {
  mockAddListener.mockReset();
});

describe('setGroupAccessDeniedCallback', () => {
  it('subscribes to groupAccessDenied exactly once, even across repeated calls', () => {
    // Unlike an `add*Listener` API, this is a plain last-write-wins setter: it must not stack up
    // a new native subscription on every call, or the same event would be forwarded N times.
    const { setGroupAccessDeniedCallback } = freshModule();
    setGroupAccessDeniedCallback(() => {});
    setGroupAccessDeniedCallback(() => {});
    setGroupAccessDeniedCallback(() => {});

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener.mock.calls[0]?.[0]).toBe('groupAccessDenied');
  });

  it('forwards the emitted event to the currently set callback', () => {
    const { setGroupAccessDeniedCallback } = freshModule();
    const callback = jest.fn();
    setGroupAccessDeniedCallback(callback);

    registeredHandler()({ groupId: 'group-1' });

    expect(callback).toHaveBeenCalledWith('group-1');
  });

  it('replaces the previous callback rather than calling both', () => {
    const { setGroupAccessDeniedCallback } = freshModule();
    const first = jest.fn();
    const second = jest.fn();

    setGroupAccessDeniedCallback(first);
    setGroupAccessDeniedCallback(second);
    registeredHandler()({ groupId: 'group-1' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('group-1');
  });

  it('returns a handle that unregisters the callback', () => {
    const { setGroupAccessDeniedCallback } = freshModule();
    const callback = jest.fn();

    const unregister = setGroupAccessDeniedCallback(callback);
    unregister();
    registeredHandler()({ groupId: 'group-1' });

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not unregister a newer callback set after an older handle', () => {
    // Identity-guarded, matching the Flutter reference: a late unregister of a stale handle
    // must not clobber whichever callback is current by the time it runs.
    const { setGroupAccessDeniedCallback } = freshModule();
    const first = jest.fn();
    const second = jest.fn();

    const unregisterFirst = setGroupAccessDeniedCallback(first);
    setGroupAccessDeniedCallback(second);
    unregisterFirst();
    registeredHandler()({ groupId: 'group-1' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('group-1');
  });

  it('is a no-op when called a second time', () => {
    const { setGroupAccessDeniedCallback } = freshModule();
    const callback = jest.fn();

    const unregister = setGroupAccessDeniedCallback(callback);
    unregister();
    unregister();
    registeredHandler()({ groupId: 'group-1' });

    expect(callback).not.toHaveBeenCalled();
  });
});
