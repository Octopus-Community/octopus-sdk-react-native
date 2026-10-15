import {
  communityNavigationReducer as reduce,
  loadCommunityMode,
  persistCommunityMode,
  COMMUNITY_MODE_KEY,
  communityPushTarget,
} from '../navigation/communityNavigation';
import type { CommunityNavigationState } from '../navigation/communityNavigation';
import { mockStore } from '../testing/asyncStorageMock';

const root: CommunityNavigationState = {
  mode: 'embed',
  session: 1,
  generation: 0,
  target: null,
};
const notification = {
  title: '',
  body: '',
  linkPath: '/post/demo-post',
  rawPayload: {},
};
beforeEach(() => mockStore.reset());

it('restores the separately persisted mode and survives absent/corrupt/unavailable storage', async () => {
  expect(await loadCommunityMode()).toBe('embed');
  await persistCommunityMode('fullscreen');
  expect(mockStore.get(COMMUNITY_MODE_KEY)).toBe('fullscreen');
  expect(await loadCommunityMode()).toBe('fullscreen');
  mockStore.set('octopus_demo_config_v1', '{}');
  expect(await loadCommunityMode()).toBe('fullscreen');
  mockStore.set(COMMUNITY_MODE_KEY, 'sheet');
  expect(await loadCommunityMode()).toBe('embed');
  mockStore.failNextCall('getItem');
  expect(await loadCommunityMode()).toBe('embed');
});
it('orders rapid preference changes and treats write failures as non-fatal', async () => {
  await Promise.all([
    persistCommunityMode('fullscreen'),
    persistCommunityMode('embed'),
  ]);
  expect(await loadCommunityMode()).toBe('embed');
  mockStore.failNextCall('setItem');
  await expect(persistCommunityMode('fullscreen')).resolves.toBeUndefined();
});
it('retap resets a linked screen to feed, but unchanged mode/session preserve it', () => {
  const post = reduce(root, { type: 'push', notification });
  expect(post.target).toBe(notification);
  expect(reduce(post, { type: 'mode', mode: 'embed' })).toBe(post);
  expect(reduce(post, { type: 'session', session: 1 })).toBe(post);
  expect(reduce(post, { type: 'retap' })).toEqual({
    ...post,
    generation: 2,
    target: null,
  });
});
it.each([
  { type: 'mode', mode: 'fullscreen' } as const,
  { type: 'session', session: 2 } as const,
])(
  'invalidates a stale stack on %j without replaying a consumed target',
  (action) => {
    const post = reduce(root, { type: 'push', notification });
    const invalidated = reduce(post, action);
    expect(invalidated.generation).toBe(2);
    expect(invalidated.target).toBeNull();
  }
);
it.each([
  ['/post/demo', { notification: { ...notification, linkPath: '/post/demo' } }],
  [
    '/profile/demo',
    { notification: { ...notification, linkPath: '/profile/demo' } },
  ],
  ['/group/demo', { initialScreen: { type: 'group', groupId: 'demo' } }],
  [
    '/member/demo',
    { initialScreen: { type: 'activity', member: { profileId: 'demo' } } },
  ],
])(
  'routes %s through the entry point supported on both platforms',
  (linkPath, expected) => {
    expect(
      communityPushTarget({ ...notification, linkPath: linkPath as string })
    ).toEqual(expected);
  }
);

it('refreshes native presentation props without dropping the notification destination or session', () => {
  const post = reduce(root, { type: 'push', notification });
  expect(reduce(post, { type: 'refreshPresentation' })).toEqual({
    ...post,
    generation: post.generation + 1,
  });
  expect(reduce(root, { type: 'refreshPresentation' })).toEqual({
    ...root,
    generation: 1,
  });
});
