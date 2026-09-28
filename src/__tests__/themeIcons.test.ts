import { initialize } from '../initialize';
import {
  flattenIconOverrides,
  ICON_ON_OFF_PATHS,
  ICON_SLOT_PATHS,
} from '../internals/iconOverrides';
import { setLogger } from '../internals/logger';
import { LogLevel } from '../enums/LogLevel.enum';
import type { OctopusIcons, OctopusIconSource } from '../types/octopusIcons';

const mockInitialize = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
  },
}));

const logger = jest.fn();

beforeEach(() => {
  mockInitialize.mockReset();
  mockInitialize.mockResolvedValue(undefined);
  logger.mockReset();
  setLogger(logger);
});

const img = (name: string): OctopusIconSource => ({
  uri: `asset_${name}`,
  width: 24,
  height: 24,
  scale: 1,
});

const warnings = (): string[] =>
  logger.mock.calls
    .filter(([level]) => level === LogLevel.WARN)
    .map(([, message]) => message as string);

/** Makes every optional key required, recursively: a fixture typed with it must name every slot. */
type DeepRequired<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends OctopusIconSource
    ? OctopusIconSource
    : DeepRequired<NonNullable<T[K]>>;
};

/**
 * Every slot of the public type. Typed `DeepRequired`, so adding a slot to `OctopusIcons`
 * without adding it here fails `yarn test:types`, and the test below then fails until the slot
 * is on the wire list too.
 */
const EVERY_SLOT: DeepRequired<OctopusIcons> = {
  groups: {
    openList: img('1'),
    selected: img('2'),
    viewGroup: img('3'),
  },
  content: {
    post: {
      creation: {
        open: img('4'),
        topicSelection: img('5'),
        addPicture: img('6'),
        deletePicture: img('7'),
        addPoll: img('8'),
        addPollOption: img('9'),
        deletePoll: img('10'),
        deletePollOption: img('11'),
      },
      emptyFeedInGroups: img('12'),
      emptyFeedInCurrentUserProfile: img('13'),
      emptyFeedInOtherUserProfile: img('14'),
      notAvailable: img('15'),
      commentCount: img('16'),
      viewCount: img('17'),
      moreReactions: img('18'),
      likeNotSelected: img('19'),
      moderated: img('20'),
    },
    comment: {
      creation: {
        open: img('21'),
        create: img('22'),
        addPicture: img('23'),
        deletePicture: img('24'),
      },
      emptyFeed: img('25'),
      notAvailable: img('26'),
      seeReply: img('27'),
      likeNotSelected: img('28'),
    },
    reply: {
      creation: {
        open: img('29'),
        create: img('30'),
        addPicture: img('31'),
        deletePicture: img('32'),
      },
      likeNotSelected: img('33'),
    },
    video: {
      muted: img('34'),
      notMuted: img('35'),
      pause: img('36'),
      play: img('37'),
      replay: img('38'),
    },
    poll: { selectedOption: img('39') },
    reaction: {
      heart: img('40'),
      joy: img('41'),
      mouthOpen: img('42'),
      clap: img('43'),
      cry: img('44'),
      rage: img('45'),
    },
    delete: img('46'),
    report: img('47'),
  },
  gamification: {
    badge: img('48'),
    info: img('49'),
    rulesHeader: img('50'),
  },
  settings: {
    account: img('51'),
    help: img('52'),
    info: img('53'),
    logout: img('54'),
    deleteAccountWarning: img('55'),
  },
  profile: {
    addPicture: img('56'),
    editPicture: img('57'),
    addBio: img('58'),
    emptyNotifications: img('59'),
    report: img('60'),
    notConnected: img('61'),
    blockUser: img('62'),
  },
  common: {
    radio: { on: img('63'), off: img('64') },
    checkbox: { on: img('65'), off: img('66') },
    toggle: { on: img('67'), off: img('68') },
    moreActions: img('69'),
    activityButton: img('70'),
    listCellNavIndicator: img('71'),
  },
  screenStates: {
    emptyContent: img('72'),
    emptyNotifications: img('73'),
    networkError: img('74'),
    error: img('75'),
  },
};

describe('flattenIconOverrides', () => {
  it('returns undefined when there is nothing to override', () => {
    expect(flattenIconOverrides(undefined)).toBeUndefined();
    expect(flattenIconOverrides(null)).toBeUndefined();
    expect(flattenIconOverrides({})).toBeUndefined();
    expect(flattenIconOverrides({ content: { post: {} } })).toBeUndefined();
    expect(warnings()).toEqual([]);
  });

  it('puts every slot of the public type on the wire, and nothing else', () => {
    const flat = flattenIconOverrides(EVERY_SLOT)!;
    const expectedKeys = [
      ...ICON_SLOT_PATHS,
      ...ICON_ON_OFF_PATHS.flatMap((p) => [`${p}.on`, `${p}.off`]),
    ];
    expect(Object.keys(flat).sort()).toEqual([...expectedKeys].sort());
    expect(expectedKeys).toHaveLength(75);
    expect(new Set(Object.values(flat)).size).toBe(75);
    expect(warnings()).toEqual([]);
  });

  it('keys slots by their iOS dotted path and carries only the uri', () => {
    expect(
      flattenIconOverrides({
        content: {
          post: { commentCount: img('a'), creation: { open: img('b') } },
        },
        common: { moreActions: img('c') },
      })
    ).toEqual({
      'content.post.commentCount': 'asset_a',
      'content.post.creation.open': 'asset_b',
      'common.moreActions': 'asset_c',
    });
  });

  it('splits an on/off pair into two wire keys', () => {
    expect(
      flattenIconOverrides({
        common: { toggle: { on: img('on'), off: img('off') } },
      })
    ).toEqual({
      'common.toggle.on': 'asset_on',
      'common.toggle.off': 'asset_off',
    });
  });

  it('drops a pair missing one side, with a warning', () => {
    const icons = {
      common: { radio: { on: img('on') }, moreActions: img('m') },
    } as unknown as OctopusIcons;
    expect(flattenIconOverrides(icons)).toEqual({
      'common.moreActions': 'asset_m',
    });
    expect(warnings()).toEqual([
      expect.stringContaining('theme.icons.common.radio needs both'),
    ]);
  });

  it('drops a value without a string uri, keeping the valid siblings', () => {
    const icons = {
      settings: { logout: { uri: 42 }, help: 'help.png', info: img('i') },
    } as unknown as OctopusIcons;
    expect(flattenIconOverrides(icons)).toEqual({
      'settings.info': 'asset_i',
    });
    expect(warnings()).toEqual([
      expect.stringContaining('theme.icons.settings.logout'),
      expect.stringContaining('theme.icons.settings.help'),
    ]);
  });

  it('drops unknown keys, including the iOS-only and Android-only slots', () => {
    const icons = {
      common: { close: img('x') },
      content: { views: img('v'), like: img('l'), delete: img('d') },
      profile: { defaultAvatar: img('a') },
      screenStates: { emptyFeed: img('e') },
    } as unknown as OctopusIcons;
    expect(flattenIconOverrides(icons)).toEqual({
      'content.delete': 'asset_d',
    });
    expect(warnings()).toEqual([
      expect.stringContaining('theme.icons.common.close'),
      expect.stringContaining('theme.icons.content.views'),
      expect.stringContaining('theme.icons.content.like'),
      expect.stringContaining('theme.icons.profile.defaultAvatar'),
      expect.stringContaining('theme.icons.screenStates.emptyFeed'),
    ]);
  });

  it('ignores a group that is not an object, and a non-object icons value', () => {
    expect(
      flattenIconOverrides({ groups: 'nope' } as unknown as OctopusIcons)
    ).toBeUndefined();
    expect(
      flattenIconOverrides('nope' as unknown as OctopusIcons)
    ).toBeUndefined();
    expect(warnings()).toHaveLength(2);
  });

  it('treats null and undefined slots as absent, silently', () => {
    const icons = {
      content: { report: null, delete: undefined },
    } as unknown as OctopusIcons;
    expect(flattenIconOverrides(icons)).toBeUndefined();
    expect(warnings()).toEqual([]);
  });
});

describe('initialize forwards theme.icons as iconOverrides', () => {
  it('sends the flat map and never the nested icons object', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { icons: { content: { report: img('r') } } },
    });
    const { theme } = mockInitialize.mock.calls[0][0];
    expect(theme.iconOverrides).toEqual({ 'content.report': 'asset_r' });
    expect(theme).not.toHaveProperty('icons');
  });

  it('forwards each screen-state illustration without changing its key or URI', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { icons: { screenStates: EVERY_SLOT.screenStates } },
    });
    expect(mockInitialize.mock.calls[0][0].theme.iconOverrides).toEqual({
      'screenStates.emptyContent': 'asset_72',
      'screenStates.emptyNotifications': 'asset_73',
      'screenStates.networkError': 'asset_74',
      'screenStates.error': 'asset_75',
    });
    expect(warnings()).toEqual([]);
  });

  it('sends no iconOverrides key when the theme has no icons', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: { colors: { primary: '#123456' } },
    });
    const { theme } = mockInitialize.mock.calls[0][0];
    expect(theme).not.toHaveProperty('iconOverrides');
    expect(theme).not.toHaveProperty('icons');
    expect(theme.colors).toEqual({ primary: '#123456' });
  });

  it('sends no iconOverrides key when every override is invalid', async () => {
    await initialize({
      apiKey: 'k',
      connectionMode: { type: 'octopus' },
      theme: {
        logo: { image: img('logo') },
        icons: { bogus: img('b') } as unknown as OctopusIcons,
      },
    });
    const { theme } = mockInitialize.mock.calls[0][0];
    expect(theme).not.toHaveProperty('iconOverrides');
    expect(theme.logo).toEqual({ image: img('logo') });
  });
});
