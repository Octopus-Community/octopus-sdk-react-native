import { registerPushNotificationToken } from '../registerPushNotificationToken';

const mockRegister = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    registerPushNotificationToken: (...args: unknown[]) =>
      mockRegister(...args),
  },
}));

beforeEach(() => {
  mockRegister.mockReset();
  mockRegister.mockResolvedValue(undefined);
});

describe('registerPushNotificationToken', () => {
  it('forwards the token to the native module', async () => {
    await registerPushNotificationToken('abc123');
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledWith('abc123');
  });

  it('resolves when native module resolves', async () => {
    await expect(registerPushNotificationToken('t')).resolves.toBeUndefined();
  });

  it('rejects when native module rejects', async () => {
    mockRegister.mockRejectedValue(new Error('REGISTER_TOKEN_ERROR'));
    await expect(registerPushNotificationToken('t')).rejects.toThrow(
      'REGISTER_TOKEN_ERROR'
    );
  });
});
