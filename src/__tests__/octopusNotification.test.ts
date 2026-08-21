import {
  fromMap,
  isOctopusFlag,
  type OctopusNotification,
} from '../types/octopusNotification';

describe('OctopusNotification.fromMap', () => {
  it('parses a flat FCM payload', () => {
    const n = fromMap({
      is_octopus_notification: 'true',
      title: 'Hello',
      body: 'World',
      link_path: 'post/123',
      post_id: '123',
    });
    expect(n).not.toBeNull();
    expect(n!.title).toBe('Hello');
    expect(n!.body).toBe('World');
    expect(n!.linkPath).toBe('post/123');
    expect(n!.postId).toBe('123');
    expect(n!.commentId).toBeUndefined();
    expect(n!.replyId).toBeUndefined();
    expect(n!.rawPayload).toEqual(
      expect.objectContaining({
        is_octopus_notification: 'true',
        link_path: 'post/123',
        post_id: '123',
        title: 'Hello',
        body: 'World',
      })
    );
  });

  it('parses a nested APNs payload with aps.alert fallback', () => {
    const n = fromMap({
      aps: { alert: { title: 'A', body: 'B' } },
      data: {
        is_octopus_notification: 'true',
        link_path: 'comment/9',
        comment_id: '9',
      },
    });
    expect(n).not.toBeNull();
    expect(n!.title).toBe('A');
    expect(n!.body).toBe('B');
    expect(n!.linkPath).toBe('comment/9');
    expect(n!.commentId).toBe('9');
  });

  it('returns null when link_path is missing', () => {
    expect(fromMap({ is_octopus_notification: 'true', title: 't' })).toBeNull();
  });

  it('retains unknown keys in rawPayload', () => {
    const n = fromMap({
      is_octopus_notification: 'true',
      link_path: 'x',
      future_field: 'future_value',
    });
    expect(n!.rawPayload.future_field).toBe('future_value');
  });

  it('rawPayload is frozen (callers cannot mutate)', () => {
    const n = fromMap({ is_octopus_notification: 'true', link_path: 'x' });
    expect(Object.isFrozen(n!.rawPayload)).toBe(true);
  });
});

describe('isOctopusFlag', () => {
  it('accepts string "true"', () => {
    expect(isOctopusFlag({ is_octopus_notification: 'true' })).toBe(true);
  });
  it('accepts boolean true', () => {
    expect(isOctopusFlag({ is_octopus_notification: true })).toBe(true);
  });
  it('reads from nested data envelope', () => {
    expect(isOctopusFlag({ data: { is_octopus_notification: 'true' } })).toBe(
      true
    );
  });
  it('returns false when flag is missing', () => {
    expect(isOctopusFlag({})).toBe(false);
  });
  it('returns false when flag is "false"', () => {
    expect(isOctopusFlag({ is_octopus_notification: 'false' })).toBe(false);
  });
});

// Type satisfaction (compile-time only)
const _check: OctopusNotification = {
  title: '',
  body: '',
  linkPath: '',
  rawPayload: {},
};
_check;
