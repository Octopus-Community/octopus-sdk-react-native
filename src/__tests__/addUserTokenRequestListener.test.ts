import { addUserTokenRequestListener } from '../addUserTokenRequestListener';
import { LogLevel } from '../enums/LogLevel.enum';

const mockComplete = jest.fn();
const mockCancel = jest.fn();
const mockAddListener = jest.fn();
const mockLog = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    completeUserTokenRequest: (...args: unknown[]) => mockComplete(...args),
    cancelUserTokenRequest: (...args: unknown[]) => mockCancel(...args),
  },
}));
jest.mock('../internals/eventEmitter', () => ({
  eventEmitter: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
  },
}));
jest.mock('../internals/logger', () => ({
  log: (...args: unknown[]) => mockLog(...args),
}));

const requestToken = async () => {
  const handler = mockAddListener.mock.calls[0]?.[1] as (event: {
    requestId: string;
  }) => Promise<void>;
  await handler({ requestId: 'req-1' });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockComplete.mockReset().mockResolvedValue(undefined);
  mockCancel.mockReset().mockResolvedValue(undefined);
});

it('completes the request without logging the returned token', async () => {
  addUserTokenRequestListener(async () => 'test.jwt.value');

  await requestToken();

  expect(mockAddListener).toHaveBeenCalledWith(
    'userTokenRequest',
    expect.any(Function)
  );
  expect(mockComplete).toHaveBeenCalledWith('req-1', 'test.jwt.value');
  expect(mockCancel).not.toHaveBeenCalled();
  expect(mockLog).not.toHaveBeenCalled();
});

it.each([
  Object.assign(new Error('backend unreachable'), {
    config: { headers: { Authorization: 'test-token' } },
    cause: { token: 'test-token' },
  }),
  {
    name: 'Error',
    message: 'backend unreachable',
    response: { token: 'test-token' },
  },
])(
  'logs only the host error name/message and cancels the request',
  async (error) => {
    addUserTokenRequestListener(async () => {
      throw error;
    });

    await requestToken();

    expect(mockCancel).toHaveBeenCalledWith('req-1');
    expect(mockComplete).not.toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      LogLevel.ERROR,
      'Failed to provide user token to Octopus',
      { name: 'Error', message: 'backend unreachable' }
    );
  }
);

it.each([null, undefined, 'test-token', { message: { token: 'test-token' } }])(
  'does not dump an arbitrary rejection value: %p',
  async (error) => {
    addUserTokenRequestListener(async () => {
      throw error;
    });

    await requestToken();

    expect(mockCancel).toHaveBeenCalledWith('req-1');
    expect(JSON.stringify(mockLog.mock.calls)).not.toContain('test-token');
  }
);

it('still cancels when an error property cannot be read', async () => {
  addUserTokenRequestListener(async () => {
    throw Object.defineProperty({}, 'message', {
      get() {
        throw new Error('test-token');
      },
    });
  });

  await requestToken();

  expect(mockCancel).toHaveBeenCalledWith('req-1');
  expect(mockLog.mock.calls[0]?.[2]).toEqual({
    name: 'UnknownError',
    message: 'Unreadable error',
  });
});

it('sanitizes native completion errors before cancelling', async () => {
  mockComplete.mockRejectedValue(
    Object.assign(new Error('bridge gone'), { token: 'test.jwt.value' })
  );
  addUserTokenRequestListener(async () => 'test.jwt.value');

  await requestToken();

  expect(mockCancel).toHaveBeenCalledWith('req-1');
  expect(mockLog.mock.calls[0]?.[2]).toEqual({
    name: 'Error',
    message: 'bridge gone',
  });
});
