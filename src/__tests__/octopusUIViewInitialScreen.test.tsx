import type { ReactElement } from 'react';
import { OctopusUIView, type OctopusUIViewProps } from '../OctopusUIView';
import { LogLevel } from '../enums/LogLevel.enum';
import { setLogLevel, setLogger, resetLogger } from '../internals/logger';

/**
 * The props `OctopusUIView` hands the native component.
 *
 * `OctopusUIView` is a plain function component, so calling it returns the
 * element it would render — enough to assert the marshalled native props
 * without a renderer (the repo ships none).
 */
function nativeProps(props: OctopusUIViewProps): Record<string, unknown> {
  const element = OctopusUIView(props) as ReactElement<Record<string, unknown>>;
  return element.props;
}

const notification = {
  title: 't',
  body: 'b',
  linkPath: '/post/1',
  rawPayload: {},
};

afterEach(() => {
  resetLogger();
  setLogLevel(LogLevel.WARN);
});

describe('OctopusUIView initialScreen marshalling', () => {
  it('sends no initialScreen when the prop is omitted', () => {
    expect(nativeProps({}).initialScreen).toBeUndefined();
  });

  it('marshals mainFeed as a bare type', () => {
    expect(
      nativeProps({ initialScreen: { type: 'mainFeed' } }).initialScreen
    ).toEqual({ type: 'mainFeed' });
  });

  it('marshals post and trims the id', () => {
    expect(
      nativeProps({ initialScreen: { type: 'post', postId: ' post-1 ' } })
        .initialScreen
    ).toEqual({ type: 'post', postId: 'post-1' });
  });

  it('throws on a blank postId', () => {
    expect(() =>
      nativeProps({ initialScreen: { type: 'post', postId: '   ' } })
    ).toThrow();
  });

  it('marshals group and trims the id', () => {
    expect(
      nativeProps({ initialScreen: { type: 'group', groupId: ' g-1 ' } })
        .initialScreen
    ).toEqual({ type: 'group', groupId: 'g-1' });
  });

  it('throws on a blank groupId', () => {
    expect(() =>
      nativeProps({ initialScreen: { type: 'group', groupId: '' } })
    ).toThrow();
  });

  it('marshals activity by clientUserId with a null profileId', () => {
    expect(
      nativeProps({
        initialScreen: { type: 'activity', member: { clientUserId: ' cu-1 ' } },
      }).initialScreen
    ).toEqual({ type: 'activity', profileId: null, clientUserId: 'cu-1' });
  });

  it('marshals activity by profileId with a null clientUserId', () => {
    expect(
      nativeProps({
        initialScreen: { type: 'activity', member: { profileId: ' p-1 ' } },
      }).initialScreen
    ).toEqual({ type: 'activity', profileId: 'p-1', clientUserId: null });
  });

  it('throws when activity gets both member ids', () => {
    expect(() =>
      nativeProps({
        initialScreen: {
          type: 'activity',
          member: { profileId: 'p-1', clientUserId: 'cu-1' },
        },
      })
    ).toThrow();
  });

  it('throws when activity gets neither member id', () => {
    expect(() =>
      nativeProps({ initialScreen: { type: 'activity', member: {} } })
    ).toThrow();
  });

  it('marshals profile with a trimmed clientUserId', () => {
    expect(
      nativeProps({
        initialScreen: { type: 'profile', clientUserId: ' cu-1 ' },
      }).initialScreen
    ).toEqual({ type: 'profile', clientUserId: 'cu-1' });
  });

  it('normalizes a blank profile clientUserId to null (own profile)', () => {
    expect(
      nativeProps({ initialScreen: { type: 'profile', clientUserId: '  ' } })
        .initialScreen
    ).toEqual({ type: 'profile', clientUserId: null });
  });

  it('flattens createPost prefill fields with nulls for the absent ones', () => {
    expect(
      nativeProps({
        initialScreen: {
          type: 'createPost',
          prefilledPost: {
            text: 'hello',
            cta: { url: 'https://example.com', label: 'Open' },
          },
        },
      }).initialScreen
    ).toEqual({
      type: 'createPost',
      text: 'hello',
      imageUri: null,
      topicId: null,
      ctaUrl: 'https://example.com',
      ctaLabel: 'Open',
    });
  });

  it('marshals a bare createPost (blank draft) with all fields null', () => {
    expect(
      nativeProps({ initialScreen: { type: 'createPost' } }).initialScreen
    ).toEqual({
      type: 'createPost',
      text: null,
      imageUri: null,
      topicId: null,
      ctaUrl: null,
      ctaLabel: null,
    });
  });

  it('produces the same wire payload as openUI for the same screen', async () => {
    // The two entry points share one producer; this pins that they cannot drift.
    const mockOpenUI = jest.fn().mockResolvedValue(undefined);
    jest.doMock('../internals/nativeModule', () => ({
      OctopusReactNativeSdk: { openUI: mockOpenUI },
    }));
    const { openUI } = require('../openUI');
    const screen = {
      type: 'activity' as const,
      member: { clientUserId: ' cu-1 ' },
    };
    await openUI({ initialScreen: screen });
    expect(nativeProps({ initialScreen: screen }).initialScreen).toEqual(
      mockOpenUI.mock.calls[0][0].initialScreen
    );
  });
});

describe('OctopusUIView notification precedence', () => {
  it('drops initialScreen when a notification is also provided', () => {
    const props = nativeProps({
      notification,
      initialScreen: { type: 'post', postId: 'post-1' },
    });
    expect(props.initialScreen).toBeUndefined();
    expect(props.notification).toEqual({
      linkPath: '/post/1',
      rawPayload: {},
    });
  });

  it('warns when it drops the initial screen', () => {
    const logger = jest.fn();
    setLogger(logger);
    nativeProps({
      notification,
      initialScreen: { type: 'post', postId: 'post-1' },
    });
    expect(logger).toHaveBeenCalledWith(
      LogLevel.WARN,
      expect.stringContaining('OctopusUIView'),
      undefined
    );
  });

  it('does not validate a dropped initialScreen', () => {
    // Precedence applies before normalization, exactly as in openUI: an invalid
    // screen the notification wins over must not throw.
    expect(() =>
      nativeProps({
        notification,
        initialScreen: { type: 'post', postId: '   ' },
      })
    ).not.toThrow();
  });
});
