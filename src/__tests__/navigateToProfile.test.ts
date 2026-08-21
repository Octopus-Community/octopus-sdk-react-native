import { addNavigateToProfileListener } from '../addNavigateToProfileListener';
import { openUI } from '../openUI';

const mockAddListener = jest.fn();
const mockOpenUI = jest.fn();

jest.mock('../internals/eventEmitter', () => ({
  eventEmitter: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
  },
}));

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    openUI: (...args: unknown[]) => mockOpenUI(...args),
  },
}));

beforeEach(() => {
  mockAddListener.mockReset();
  mockOpenUI.mockReset();
  mockOpenUI.mockResolvedValue(undefined);
});

describe('addNavigateToProfileListener', () => {
  it('subscribes to the navigateToProfile event', () => {
    const subscription = { remove: jest.fn() };
    mockAddListener.mockReturnValue(subscription);
    const callback = jest.fn();

    expect(addNavigateToProfileListener(callback)).toBe(subscription);
    expect(mockAddListener).toHaveBeenCalledWith('navigateToProfile', callback);
  });

  it('hands the payload through unwrapped, so clientUserId survives', () => {
    const callback = jest.fn();
    mockAddListener.mockReturnValue({ remove: jest.fn() });
    addNavigateToProfileListener(callback);

    const registered = mockAddListener.mock.calls[0]?.[1] as (
      params: unknown
    ) => void;
    registered({ clientUserId: 'user-42' });

    expect(callback).toHaveBeenCalledWith({ clientUserId: 'user-42' });
  });
});

describe('openUI interceptProfileTaps', () => {
  it('defaults to false, so Unified Profile stays off for existing hosts', async () => {
    await openUI();
    expect(mockOpenUI).toHaveBeenCalledWith({
      interceptUrls: false,
      interceptProfileTaps: false,
      initialScreen: undefined,
      navigationMode: 'navigationStack',
      navBarLeadingAction: undefined,
      notification: undefined,
    });
  });

  it('forwards the opt-in when the host asks for it', async () => {
    await openUI({ interceptProfileTaps: true });
    expect(mockOpenUI).toHaveBeenCalledWith({
      interceptUrls: false,
      interceptProfileTaps: true,
      initialScreen: undefined,
      navigationMode: 'navigationStack',
      navBarLeadingAction: undefined,
      notification: undefined,
    });
  });

  it('normalizes a non-boolean opt-in to false', async () => {
    // The native side keys Unified Profile activation on this flag, so anything
    // other than a literal `true` must not switch the feature on.
    await openUI({
      // @ts-expect-error untyped JS callers can pass anything
      interceptProfileTaps: 'yes',
    });
    expect(mockOpenUI).toHaveBeenCalledWith({
      interceptUrls: false,
      interceptProfileTaps: false,
      initialScreen: undefined,
      navigationMode: 'navigationStack',
      navBarLeadingAction: undefined,
      notification: undefined,
    });
  });

  it('is independent of interceptUrls', async () => {
    await openUI({ interceptUrls: true });
    expect(mockOpenUI).toHaveBeenCalledWith({
      interceptUrls: true,
      interceptProfileTaps: false,
      initialScreen: undefined,
      navigationMode: 'navigationStack',
      navBarLeadingAction: undefined,
      notification: undefined,
    });
  });
});
