import { openUI } from '../openUI';

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

/** The last payload openUI sent across the bridge. */
function sentPayload(): Record<string, unknown> {
  expect(mockOpenUI).toHaveBeenCalledTimes(1);
  return mockOpenUI.mock.calls[0][0];
}

describe('openUI initialScreen marshalling', () => {
  it('sends no initialScreen when the option is omitted', async () => {
    await openUI();
    expect(sentPayload().initialScreen).toBeUndefined();
  });

  it('marshals mainFeed as a bare type', async () => {
    await openUI({ initialScreen: { type: 'mainFeed' } });
    expect(sentPayload().initialScreen).toEqual({ type: 'mainFeed' });
  });

  it('marshals post and trims the id', async () => {
    await openUI({ initialScreen: { type: 'post', postId: ' post-1 ' } });
    expect(sentPayload().initialScreen).toEqual({
      type: 'post',
      postId: 'post-1',
    });
  });

  it('throws synchronously on a blank postId, before any native call', () => {
    expect(() =>
      openUI({ initialScreen: { type: 'post', postId: '   ' } })
    ).toThrow();
    expect(mockOpenUI).not.toHaveBeenCalled();
  });

  it('marshals group and trims the id', async () => {
    await openUI({ initialScreen: { type: 'group', groupId: ' g-1 ' } });
    expect(sentPayload().initialScreen).toEqual({
      type: 'group',
      groupId: 'g-1',
    });
  });

  it('throws synchronously on a blank groupId, before any native call', () => {
    expect(() =>
      openUI({ initialScreen: { type: 'group', groupId: '' } })
    ).toThrow();
    expect(mockOpenUI).not.toHaveBeenCalled();
  });

  it('marshals activity by clientUserId with a null profileId', async () => {
    await openUI({
      initialScreen: { type: 'activity', member: { clientUserId: ' cu-1 ' } },
    });
    expect(sentPayload().initialScreen).toEqual({
      type: 'activity',
      profileId: null,
      clientUserId: 'cu-1',
    });
  });

  it('marshals activity by profileId with a null clientUserId', async () => {
    await openUI({
      initialScreen: { type: 'activity', member: { profileId: ' p-1 ' } },
    });
    expect(sentPayload().initialScreen).toEqual({
      type: 'activity',
      profileId: 'p-1',
      clientUserId: null,
    });
  });

  it('throws synchronously when activity gets both member ids', () => {
    expect(() =>
      openUI({
        initialScreen: {
          type: 'activity',
          member: { profileId: 'p-1', clientUserId: 'cu-1' },
        },
      })
    ).toThrow();
    expect(mockOpenUI).not.toHaveBeenCalled();
  });

  it('throws synchronously when activity gets neither member id', () => {
    expect(() =>
      openUI({ initialScreen: { type: 'activity', member: {} } })
    ).toThrow();
    expect(mockOpenUI).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only activity member id as absent', () => {
    // Trimming happens before the exactly-one check, so '  ' must not count
    // as a provided id.
    expect(() =>
      openUI({
        initialScreen: { type: 'activity', member: { clientUserId: '  ' } },
      })
    ).toThrow();
    expect(mockOpenUI).not.toHaveBeenCalled();
  });

  it('marshals profile with a trimmed clientUserId', async () => {
    await openUI({
      initialScreen: { type: 'profile', clientUserId: ' cu-1 ' },
    });
    expect(sentPayload().initialScreen).toEqual({
      type: 'profile',
      clientUserId: 'cu-1',
    });
  });

  it('normalizes an omitted or blank profile clientUserId to null (own profile)', async () => {
    await openUI({ initialScreen: { type: 'profile', clientUserId: '  ' } });
    expect(sentPayload().initialScreen).toEqual({
      type: 'profile',
      clientUserId: null,
    });
  });

  it('flattens createPost prefill fields with nulls for the absent ones', async () => {
    await openUI({
      initialScreen: {
        type: 'createPost',
        prefilledPost: {
          text: 'hello',
          cta: { url: 'https://example.com', label: 'Open' },
        },
      },
    });
    expect(sentPayload().initialScreen).toEqual({
      type: 'createPost',
      text: 'hello',
      imageUri: null,
      topicId: null,
      ctaUrl: 'https://example.com',
      ctaLabel: 'Open',
    });
  });

  it('marshals a bare createPost (blank draft) with all fields null', async () => {
    await openUI({ initialScreen: { type: 'createPost' } });
    expect(sentPayload().initialScreen).toEqual({
      type: 'createPost',
      text: null,
      imageUri: null,
      topicId: null,
      ctaUrl: null,
      ctaLabel: null,
    });
  });

  it('drops initialScreen when a notification is also provided (deep link wins)', async () => {
    await openUI({
      notification: {
        title: 't',
        body: 'b',
        linkPath: '/post/1',
        rawPayload: {},
      },
      initialScreen: { type: 'post', postId: 'post-1' },
    });
    const payload = sentPayload();
    expect(payload.initialScreen).toBeUndefined();
    expect(payload.notification).toEqual({
      linkPath: '/post/1',
      rawPayload: {},
    });
  });

  it('does not validate a dropped initialScreen (notification present)', async () => {
    // Precedence applies before normalization: an invalid screen must not
    // throw when the notification wins anyway.
    await expect(
      openUI({
        notification: {
          title: 't',
          body: 'b',
          linkPath: '/post/1',
          rawPayload: {},
        },
        initialScreen: { type: 'post', postId: '   ' },
      })
    ).resolves.toBeUndefined();
    expect(sentPayload().initialScreen).toBeUndefined();
  });
});
