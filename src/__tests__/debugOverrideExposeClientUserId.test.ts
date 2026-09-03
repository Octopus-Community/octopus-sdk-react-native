import { debugOverrideExposeClientUserId } from '../debugOverrideExposeClientUserId';

const mockDebugOverrideExposeClientUserId = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    debugOverrideExposeClientUserId: (...args: unknown[]) =>
      mockDebugOverrideExposeClientUserId(...args),
  },
}));

beforeEach(() => {
  mockDebugOverrideExposeClientUserId.mockReset();
  mockDebugOverrideExposeClientUserId.mockResolvedValue(undefined);
});

// The tri-state travels as `{ value } | null` because a primitive boolean cannot
// carry the "clear the override" case across the bridge on both platforms — these
// tests pin that wire encoding.
describe('debugOverrideExposeClientUserId', () => {
  it('wraps true as { value: true }', async () => {
    await debugOverrideExposeClientUserId(true);
    expect(mockDebugOverrideExposeClientUserId).toHaveBeenCalledTimes(1);
    expect(mockDebugOverrideExposeClientUserId).toHaveBeenCalledWith({
      value: true,
    });
  });

  it('wraps false as { value: false }, distinct from clearing', async () => {
    await debugOverrideExposeClientUserId(false);
    expect(mockDebugOverrideExposeClientUserId).toHaveBeenCalledWith({
      value: false,
    });
  });

  it('sends null verbatim to clear the override', async () => {
    await debugOverrideExposeClientUserId(null);
    expect(mockDebugOverrideExposeClientUserId).toHaveBeenCalledWith(null);
  });

  it('rejects when the native module rejects', async () => {
    const error = new Error('OVERRIDE_ERROR');
    mockDebugOverrideExposeClientUserId.mockRejectedValue(error);
    await expect(debugOverrideExposeClientUserId(true)).rejects.toThrow(
      'OVERRIDE_ERROR'
    );
  });
});
