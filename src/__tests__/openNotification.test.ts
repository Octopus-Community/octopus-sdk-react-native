import { openNotification } from '../openNotification';
import type { OctopusNotification } from '../types/octopusNotification';

const mockOpenUI = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    openUI: (...args: unknown[]) => mockOpenUI(...args),
  },
}));

beforeEach(() => {
  mockOpenUI.mockReset();
  mockOpenUI.mockResolvedValue(undefined);
});

const sample: OctopusNotification = {
  title: 'T',
  body: 'B',
  linkPath: 'post/1',
  rawPayload: {
    is_octopus_notification: 'true',
    link_path: 'post/1',
    post_id: '1',
  },
};

describe('openNotification', () => {
  it('forwards linkPath and rawPayload via openUI', async () => {
    await openNotification(sample);
    expect(mockOpenUI).toHaveBeenCalledTimes(1);
    expect(mockOpenUI).toHaveBeenCalledWith({
      interceptUrls: false,
      interceptProfileTaps: false,
      initialScreen: undefined,
      // RN's own policy default (issue #36) — always emitted, unlike the
      // other new options below. See `OpenUIOptions.navigationMode`'s TSDoc.
      navigationMode: 'navigationStack',
      navBarLeadingAction: undefined,
      notification: {
        linkPath: 'post/1',
        rawPayload: sample.rawPayload,
      },
    });
  });

  it('rejects when native module rejects', async () => {
    mockOpenUI.mockRejectedValue(new Error('OPEN_UI_ERROR'));
    await expect(openNotification(sample)).rejects.toThrow('OPEN_UI_ERROR');
  });
});
