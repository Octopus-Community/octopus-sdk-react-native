import { isOctopusNotification } from '../isOctopusNotification';

describe('isOctopusNotification', () => {
  it('returns true for flat FCM Octopus payload', () => {
    expect(
      isOctopusNotification({
        is_octopus_notification: 'true',
        link_path: 'post/1',
      })
    ).toBe(true);
  });

  it('returns true for nested APNs Octopus payload', () => {
    expect(
      isOctopusNotification({
        aps: { alert: { title: 't', body: 'b' } },
        data: { is_octopus_notification: 'true', link_path: 'post/1' },
      })
    ).toBe(true);
  });

  it('returns false when not an Octopus payload', () => {
    expect(isOctopusNotification({ title: 'hi', body: 'hello' })).toBe(false);
  });
});
