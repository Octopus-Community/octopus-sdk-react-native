import { getOctopusNotification } from '../getOctopusNotification';

describe('getOctopusNotification', () => {
  it('parses a valid flat payload', () => {
    const n = getOctopusNotification({
      is_octopus_notification: 'true',
      title: 'Hi',
      body: 'There',
      link_path: 'post/1',
      post_id: '1',
    });
    expect(n).not.toBeNull();
    expect(n!.linkPath).toBe('post/1');
    expect(n!.postId).toBe('1');
  });

  it('returns null when link_path is missing', () => {
    expect(
      getOctopusNotification({ is_octopus_notification: 'true', title: 't' })
    ).toBeNull();
  });
});
