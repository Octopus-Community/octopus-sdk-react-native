import { reset } from '../reset';

const mockReset = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    reset: (...args: unknown[]) => mockReset(...args),
  },
}));

beforeEach(() => {
  mockReset.mockReset();
  mockReset.mockResolvedValue(undefined);
});

describe('reset', () => {
  it('calls the native module with no arguments', async () => {
    await reset();
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith();
  });

  it('returns a promise that resolves when native module resolves', async () => {
    const result = reset();
    await expect(result).resolves.toBeUndefined();
  });

  it('returns a promise that rejects when native module rejects', async () => {
    const error = new Error('RESET_ERROR');
    mockReset.mockRejectedValue(error);
    await expect(reset()).rejects.toThrow('RESET_ERROR');
  });
});
