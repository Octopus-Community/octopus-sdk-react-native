const mockGetApps = jest.fn();
const mockUnsubscribe = jest.fn();
const mockFcm = {
  setBackgroundMessageHandler: jest.fn(),
  onTokenRefresh: jest.fn<() => void, [(token: string) => void]>(
    () => mockUnsubscribe
  ),
  onMessage: jest.fn(() => mockUnsubscribe),
  onNotificationOpenedApp: jest.fn(() => mockUnsubscribe),
  getInitialNotification: jest.fn(async () => null),
  requestPermission: jest.fn(async () => {}),
  getToken: jest.fn(async () => 'test-push-token'),
};
const mockMessaging = jest.fn(() => mockFcm);
const mockNotifee = {
  onBackgroundEvent: jest.fn(),
  onForegroundEvent: jest.fn(() => mockUnsubscribe),
  getInitialNotification: jest.fn(async () => null),
  requestPermission: jest.fn(async () => {}),
  createChannel: jest.fn(async () => {}),
};

jest.mock('@react-native-firebase/app', () => ({
  getApps: () => mockGetApps(),
}));
jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => mockMessaging(),
}));
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: mockNotifee,
  AndroidImportance: { DEFAULT: 3 },
  EventType: { PRESS: 1 },
}));
jest.mock('@octopus-community/react-native', () => ({}), { virtual: true });
jest.mock('../navigation/pushInbox', () => ({}));

let push: typeof import('../push');
let warn: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.isolateModules(() => {
    push = require('../push.ts');
  });
});

afterEach(() => {
  warn.mockRestore();
});

it.each([{ apps: [] }, { apps: [{ name: 'secondary' }] }])(
  'skips background and foreground push without a default Firebase app (%j)',
  async ({ apps }) => {
    mockGetApps.mockReturnValue(apps);
    const onToken = jest.fn();

    expect(() => push.registerOctopusFcmBackground()).not.toThrow();
    const cleanup = await push.setupOctopusPush({ onToken });
    expect(() => cleanup()).not.toThrow();
    await push.setupOctopusPush({ onToken });

    expect(mockMessaging).not.toHaveBeenCalled();
    for (const method of Object.values(mockNotifee)) {
      expect(method).not.toHaveBeenCalled();
    }
    expect(onToken).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'Octopus push disabled: no default Firebase app configured.'
    );
  }
);

it('registers handlers, delivers tokens and cleans up when Firebase is configured', async () => {
  mockGetApps.mockReturnValue([{ name: '[DEFAULT]' }]);
  const onToken = jest.fn();

  push.registerOctopusFcmBackground();
  const cleanup = await push.setupOctopusPush({ onToken });

  expect(mockFcm.setBackgroundMessageHandler).toHaveBeenCalledTimes(1);
  expect(mockNotifee.onBackgroundEvent).toHaveBeenCalledTimes(1);
  expect(mockFcm.onMessage).toHaveBeenCalledTimes(1);
  expect(mockFcm.onNotificationOpenedApp).toHaveBeenCalledTimes(1);
  expect(mockNotifee.onForegroundEvent).toHaveBeenCalledTimes(1);
  expect(mockFcm.requestPermission).toHaveBeenCalledTimes(1);
  expect(mockNotifee.requestPermission).toHaveBeenCalledTimes(1);
  expect(mockNotifee.createChannel).toHaveBeenCalledTimes(1);
  expect(onToken).toHaveBeenCalledWith('test-push-token');
  mockFcm.onTokenRefresh.mock.calls[0]![0]('refreshed-push-token');
  expect(onToken).toHaveBeenCalledWith('refreshed-push-token');
  expect(warn).not.toHaveBeenCalled();

  cleanup();
  expect(mockUnsubscribe).toHaveBeenCalledTimes(4);
});
