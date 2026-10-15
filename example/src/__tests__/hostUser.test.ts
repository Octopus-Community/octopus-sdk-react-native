import {
  buildHostUserConnection,
  canSaveHostProfile,
  DEFAULT_APP_MANAGED_FIELDS,
  type HostUser,
} from '../auth/hostUser';

const previous: HostUser = {
  userId: 'demo',
  profile: {
    username: 'Demo',
    profilePicture: 'https://example.com/old.png',
    biography: 'Existing bio',
  },
};

it('keeps the sample default app-managed fields unchanged', () => {
  expect(DEFAULT_APP_MANAGED_FIELDS).toEqual(['profilePicture']);
});

it('submits configured nickname and bio edits, including an empty bio, while ignoring unmanaged avatar edits', () => {
  const result = buildHostUserConnection(
    'demo',
    previous,
    {
      profile: {
        username: 'Updated name',
        biography: '',
        profilePicture: 'https://example.com/ignored.png',
      },
    },
    ['username', 'biography']
  );
  expect(result.payload).toEqual({
    userId: 'demo',
    profile: { ...previous.profile, username: 'Updated name', biography: '' },
  });
  expect(result.connectedUser.profile).toEqual({
    ...previous.profile,
    username: 'Updated name',
    biography: '',
  });
  expect(previous.profile?.biography).toBe('Existing bio');
});

it('keeps omitted fields during a targeted profile edit so native SDKs do not clear them', () => {
  expect(
    buildHostUserConnection(
      'demo',
      previous,
      {
        profile: { biography: 'New bio' },
      },
      ['username', 'biography', 'profilePicture']
    ).payload
  ).toEqual({
    userId: 'demo',
    profile: { ...previous.profile, biography: 'New bio' },
  });
});

it('keeps the managed avatar when only biography is edited', () => {
  const result = buildHostUserConnection(
    'demo',
    previous,
    { profile: { biography: 'New bio' } },
    ['biography', 'profilePicture']
  );
  expect(result.payload.profile).toEqual({
    ...previous.profile,
    biography: 'New bio',
  });
  expect(result.connectedUser).toEqual(result.payload);
  expect(previous.profile?.biography).toBe('Existing bio');
});

it('never retains another account profile in an edited host snapshot', () => {
  expect(
    buildHostUserConnection(
      'demo',
      previous,
      {
        userId: 'another-demo',
        profile: { username: 'Client A' },
      },
      ['username']
    ).connectedUser
  ).toEqual({
    userId: 'another-demo',
    profile: { username: 'Client A' },
  });
});

it('updates only the app-managed avatar while retaining the previous profile in the payload and snapshot', () => {
  const result = buildHostUserConnection('demo', previous, {
    profile: {
      profilePicture: 'https://example.com/new.png',
      username: 'Ignored',
      biography: 'Ignored bio',
    },
  });
  expect(result.payload).toEqual({
    userId: 'demo',
    profile: {
      ...previous.profile,
      profilePicture: 'https://example.com/new.png',
    },
  });
  expect(result.connectedUser).toEqual({
    userId: 'demo',
    profile: {
      ...previous.profile,
      profilePicture: 'https://example.com/new.png',
    },
  });
  expect(previous.profile?.profilePicture).toBe('https://example.com/old.png');
});

it('reuses the current account values on reconnect and accepts a scenario nickname override', () => {
  const { payload } = buildHostUserConnection('demo', previous, {
    nickname: 'Scenario name',
  });
  expect(payload).toEqual({
    userId: 'demo',
    profile: {
      ...previous.profile,
      username: 'Scenario name',
    },
  });
});

it.each([null, previous])(
  'never merges a different or cleared account into a new connection (previous=%j)',
  (user) => {
    const result = buildHostUserConnection('demo', user, {
      userId: 'another-demo',
    });
    expect(result.payload).toEqual({
      userId: 'another-demo',
      profile: {
        username: 'John Doe',
        profilePicture: 'https://i.pravatar.cc/150',
      },
    });
    expect(result.connectedUser).toEqual(result.payload);
  }
);

it('does not resurrect old fields after the host snapshot was cleared', () => {
  expect(
    buildHostUserConnection('demo', null, {
      profile: { profilePicture: 'https://example.com/new.png' },
    }).connectedUser
  ).toEqual({
    userId: 'demo',
    profile: { profilePicture: 'https://example.com/new.png' },
  });
});

it.each([
  {
    isConnected: true,
    user: previous,
    hasToken: true,
    expected: true,
  },
  {
    isConnected: false,
    user: previous,
    hasToken: true,
    expected: false,
  },
  {
    isConnected: true,
    user: null,
    hasToken: true,
    expected: false,
  },
  {
    isConnected: true,
    user: previous,
    hasToken: false,
    expected: false,
  },
])(
  'allows Save only for a connected host SSO user with a token (%j)',
  ({ expected, ...state }) => {
    expect(canSaveHostProfile(state)).toBe(expected);
  }
);
