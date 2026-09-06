/**
 * Golden wire-contract round-trips.
 *
 * The bug class this guards is **field drift**: a native SDK adds, renames or drops a field on a
 * payload and nothing in this package notices, because almost nothing on the JS side parses
 * those payloads — `addSDKEventListener`, `fetchCommunityData` and
 * `fetchOrCreateClientObjectRelatedPost` hand the native map straight to the caller under a
 * TypeScript cast. A cast checks nothing at runtime, so a dropped field reaches the host app as
 * `undefined` and only a real device reveals it.
 *
 * Three forcing functions do the work, and it is worth knowing which one catches what:
 *
 * 1. **`Record<Union['type'], …>` on every golden table** — a new event or screen does not
 *    compile until it has a golden.
 * 2. **Exhaustive destructuring inside each `…ToWire`** — every field is pulled out by name and
 *    the `...rest` is typed `Record<string, never>`, so adding a field to an interface without
 *    handling it here fails `tsc`. This is what makes the round-trips non-vacuous field by
 *    field: the inverse cannot silently ignore what it does not know about.
 * 3. **The native-anchor block at the bottom** — the golden tables are checked against the wire
 *    tags the Kotlin and Swift serializers actually emit, read out of their source. Without it
 *    the file would only prove that this test agrees with itself, and a native SDK bump adding
 *    an event would leave every assertion above green.
 *
 * **What the anchor does and does not reach.** It pins the event and screen *catalogs* — the set
 * of `type` tags each serializer emits — so a renamed tag, a deleted branch, or an event added on
 * one platform and forgotten on the other is red here. It does **not** read field names out of
 * native source: field-level shape is asserted against the TypeScript union only, by forcing
 * functions 1 and 2 above. A native rename of a *field* (not a tag) therefore still reaches the
 * host app before anything here notices. Extending the anchor to slice each branch body and
 * compare its key set to the golden's is the obvious next step; `functionBodyRange` already
 * provides the machinery.
 *
 * Every value comparison is `toStrictEqual`, never `toEqual`: `toEqual` treats an absent key and a
 * key whose value is `undefined` as equal, which is exactly the difference a dropped field
 * produces — under `toEqual` the non-vacuity check below would itself be vacuous. The same reason
 * is why the outbound-wire block asserts `mock.mock.calls[0][0]` rather than using
 * `toHaveBeenCalledWith`, which has `toEqual` semantics.
 *
 * This file asserts full-field happy-path fidelity; it complements rather than replaces the
 * per-model tests, which cover defensive and edge parsing (`stateChannels.test.ts`,
 * `octopusNotification.test.ts`, `openUIInitialScreen.test.ts`, `syncFollowGroups.test.ts`).
 */

import { readFileSync } from 'fs';
import path from 'path';
import type { DeviceEventEmitterStatic } from 'react-native';
import {
  functionBodyRange,
  maskComments,
  maskCommentsAndStrings,
} from './helpers/sourceLexer';
import type { SDKEvent, ScreenInfo, ScreenType } from '../types/sdkEvents';
import type { OctopusPost, OctopusReactionCount } from '../types/octopusPost';
import type {
  OctopusCommunityData,
  OctopusGamification,
} from '../types/octopusCommunityData';
import type { OctopusGroup } from '../types/octopusGroup';
import type { OctopusProfile } from '../types/octopusProfile';
import type { OctopusConnectionState } from '../types/octopusConnectionState';
import type { OctopusReactionKind } from '../types/octopusReactionKind';
import { isClientPostError } from '../types/clientPostError';
import { isConnectUserError } from '../types/connectUserError';
import { isSetReactionError } from '../types/setReactionError';
import { isRefreshEntitlementsError } from '../types/refreshEntitlementsError';
import { isGroupFollowUnfollowError } from '../types/groupFollowUnfollowError';
import { isNavigateToOctopusCreatePostError } from '../types/navigateToOctopusCreatePostError';
import { isOverrideCommunityAccessError } from '../types/overrideCommunityAccessError';
import { fetchOrCreateClientObjectRelatedPost } from '../fetchOrCreateClientObjectRelatedPost';
import { navigateToOctopusCreatePost } from '../navigateToOctopusCreatePost';

const mockFetchOrCreate = jest.fn();
const mockNavigateToCreatePost = jest.fn();

jest.mock('../internals/nativeModule', () => ({
  OctopusReactNativeSdk: {
    // `NativeEventEmitter` calls these on every add/remove.
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    requestStateSnapshot: jest.fn(),
    fetchOrCreateClientObjectRelatedPost: (...args: unknown[]) =>
      mockFetchOrCreate(...args),
    navigateToOctopusCreatePost: (...args: unknown[]) =>
      mockNavigateToCreatePost(...args),
  },
}));

/** A wire payload as it crosses the bridge. */
type Wire = Record<string, unknown>;

/**
 * Compile-time proof that a `…ToWire` destructuring left nothing behind.
 *
 * `Record<string, never>` only accepts an empty rest: the moment an interface grows a field the
 * inverse does not name, `rest` carries it and `tsc` refuses the call. Runtime is a no-op — the
 * assertion lives entirely in the type.
 */
const noUnhandledFields = (_rest: Record<string, never>): void => {};

/** Thrown for a union member no branch handled — the runtime half of exhaustiveness. */
const unhandled = (value: never): never => {
  throw new Error(`Unhandled union member: ${JSON.stringify(value)}`);
};

/**
 * Drops the keys whose value is nullish, reproducing what both native serializers do with an
 * absent optional: Kotlin guards them behind `?.let { … }` and Swift behind `if let …`, so the
 * key is **missing** from the payload rather than present and null.
 */
const withoutNullish = (wire: Wire): Wire =>
  Object.fromEntries(Object.entries(wire).filter(([, value]) => value != null));

// ---------------------------------------------------------------------------------------------
// SDK events — inbound (native → JS)
// ---------------------------------------------------------------------------------------------

/** Inverse of `serializeScreen` on both platforms. */
const screenToWire = (screen: ScreenInfo): Wire => {
  const {
    type,
    feedId,
    relatedTopicId,
    groupId,
    postId,
    commentId,
    profileId,
    ...rest
  } = screen;
  noUnhandledFields(rest);
  switch (type) {
    case 'postsFeed':
      // Both natives write `feedId` unconditionally and only guard
      // `relatedTopicId`, so only the latter may be absent from the wire.
      return { type, feedId, ...withoutNullish({ relatedTopicId }) };
    case 'mainFeed':
      // `MainFeedContext` carries `feedId` alone — no `relatedTopicId` on either side.
      return { type, feedId };
    case 'groupDetail':
      // The native `source` (BRIDGE/COMMUNITY on Android, clientApp/community on iOS) is
      // deliberately not bridged, so `groupId` is the whole payload.
      return { type, groupId };
    case 'postDetail':
      return { type, postId };
    case 'commentDetail':
      return { type, commentId };
    case 'otherUserProfile':
    case 'otherUserPosts':
      return { type, profileId };
    case 'groups':
    case 'createPost':
    case 'profile':
    case 'activity':
    case 'editProfile':
    case 'reportContent':
    case 'reportProfile':
    case 'validateNickname':
    case 'settingsList':
    case 'settingsAccount':
    case 'reportExplanation':
    case 'deleteAccount':
    case 'unknown':
      return { type };
    default:
      return unhandled(type);
  }
};

/**
 * The inverse of the native event serializers, written here rather than in `src/` on purpose:
 * production code never parses these payloads, so an inverse living there would be dead code.
 * Every branch destructures its event exhaustively (see {@link noUnhandledFields}).
 */
const eventToWire = (event: SDKEvent): Wire => {
  switch (event.type) {
    case 'postCreated': {
      const { type, postId, content, topicId, textLength, ...rest } = event;
      noUnhandledFields(rest);
      return { type, postId, content, topicId, textLength };
    }
    case 'commentCreated': {
      const { type, commentId, postId, textLength, ...rest } = event;
      noUnhandledFields(rest);
      return { type, commentId, postId, textLength };
    }
    case 'replyCreated': {
      const { type, replyId, commentId, textLength, ...rest } = event;
      noUnhandledFields(rest);
      return { type, replyId, commentId, textLength };
    }
    case 'contentDeleted': {
      const { type, contentId, contentKind, ...rest } = event;
      noUnhandledFields(rest);
      return { type, contentId, contentKind };
    }
    case 'reactionModified': {
      const {
        type,
        contentId,
        contentKind,
        previousReaction,
        newReaction,
        ...rest
      } = event;
      noUnhandledFields(rest);
      return withoutNullish({
        type,
        contentId,
        contentKind,
        previousReaction,
        newReaction,
      });
    }
    case 'pollVoted': {
      const { type, contentId, optionId, ...rest } = event;
      noUnhandledFields(rest);
      return { type, contentId, optionId };
    }
    case 'contentReported': {
      const { type, contentId, reasons, ...rest } = event;
      noUnhandledFields(rest);
      return { type, contentId, reasons };
    }
    case 'profileReported': {
      const { type, profileId, reasons, ...rest } = event;
      noUnhandledFields(rest);
      return { type, profileId, reasons };
    }
    case 'gamificationPointsGained': {
      const { type, points, action, ...rest } = event;
      noUnhandledFields(rest);
      return { type, points, action };
    }
    case 'gamificationPointsRemoved': {
      const { type, points, action, ...rest } = event;
      noUnhandledFields(rest);
      return { type, points, action };
    }
    case 'screenDisplayed': {
      const { type, screen, ...rest } = event;
      noUnhandledFields(rest);
      return { type, screen: screenToWire(screen) };
    }
    case 'notificationClicked': {
      const { type, notificationId, contentId, ...rest } = event;
      noUnhandledFields(rest);
      return withoutNullish({ type, notificationId, contentId });
    }
    case 'postClicked': {
      const { type, postId, source, ...rest } = event;
      noUnhandledFields(rest);
      return { type, postId, source };
    }
    case 'translationButtonClicked': {
      const { type, contentId, viewTranslated, contentKind, ...rest } = event;
      noUnhandledFields(rest);
      return { type, contentId, viewTranslated, contentKind };
    }
    case 'commentButtonClicked': {
      const { type, postId, ...rest } = event;
      noUnhandledFields(rest);
      return { type, postId };
    }
    case 'replyButtonClicked': {
      const { type, commentId, ...rest } = event;
      noUnhandledFields(rest);
      return { type, commentId };
    }
    case 'seeRepliesButtonClicked': {
      const { type, commentId, ...rest } = event;
      noUnhandledFields(rest);
      return { type, commentId };
    }
    case 'profileModified': {
      const {
        type,
        nicknameUpdated,
        bioUpdated,
        bioLength,
        pictureUpdated,
        hasPicture,
        ...rest
      } = event;
      noUnhandledFields(rest);
      // `bioLength` / `hasPicture` ride along only when their sibling `…Updated` flag is set:
      // both serializers emit them inside that branch, so an unchanged bio carries no length.
      return withoutNullish({
        type,
        nicknameUpdated,
        bioUpdated,
        bioLength,
        pictureUpdated,
        hasPicture,
      });
    }
    case 'groupFollowingChanged': {
      const { type, groupId, followed, ...rest } = event;
      noUnhandledFields(rest);
      return { type, groupId, followed };
    }
    case 'sessionStarted': {
      const { type, sessionId, ...rest } = event;
      noUnhandledFields(rest);
      return { type, sessionId };
    }
    case 'sessionStopped': {
      const { type, sessionId, ...rest } = event;
      noUnhandledFields(rest);
      return { type, sessionId };
    }
    default:
      return unhandled(event);
  }
};

/**
 * One fully-populated golden per event type, transcribed from the native serializers
 * (`android/…/OctopusEventSerializer.kt`, `ios/OctopusEventSerializer.swift`). Typing the table
 * `Record<SDKEvent['type'], Wire>` is what makes a new event fail to compile without a golden.
 */
const EVENT_GOLDENS: Record<SDKEvent['type'], Wire> = {
  postCreated: {
    type: 'postCreated',
    postId: 'post-1',
    content: ['text', 'image', 'poll'],
    topicId: 'topic-1',
    textLength: 42,
  },
  commentCreated: {
    type: 'commentCreated',
    commentId: 'comment-1',
    postId: 'post-1',
    textLength: 12,
  },
  replyCreated: {
    type: 'replyCreated',
    replyId: 'reply-1',
    commentId: 'comment-1',
    textLength: 7,
  },
  contentDeleted: {
    type: 'contentDeleted',
    contentId: 'post-1',
    contentKind: 'post',
  },
  reactionModified: {
    type: 'reactionModified',
    contentId: 'post-1',
    contentKind: 'comment',
    previousReaction: 'heart',
    newReaction: 'rage',
  },
  pollVoted: { type: 'pollVoted', contentId: 'post-1', optionId: 'option-2' },
  contentReported: {
    type: 'contentReported',
    contentId: 'post-1',
    reasons: ['hateSpeech', 'spam', 'other'],
  },
  profileReported: {
    type: 'profileReported',
    profileId: 'profile-1',
    reasons: ['fakeProfile'],
  },
  gamificationPointsGained: {
    type: 'gamificationPointsGained',
    points: 10,
    action: 'dailySession',
  },
  gamificationPointsRemoved: {
    type: 'gamificationPointsRemoved',
    points: 3,
    action: 'reactionDeleted',
  },
  screenDisplayed: {
    type: 'screenDisplayed',
    screen: { type: 'postsFeed', feedId: 'feed-1', relatedTopicId: 'topic-1' },
  },
  notificationClicked: {
    type: 'notificationClicked',
    notificationId: 'notif-1',
    contentId: 'post-1',
  },
  postClicked: { type: 'postClicked', postId: 'post-1', source: 'feed' },
  translationButtonClicked: {
    type: 'translationButtonClicked',
    contentId: 'comment-1',
    viewTranslated: true,
    contentKind: 'comment',
  },
  commentButtonClicked: { type: 'commentButtonClicked', postId: 'post-1' },
  replyButtonClicked: { type: 'replyButtonClicked', commentId: 'comment-1' },
  seeRepliesButtonClicked: {
    type: 'seeRepliesButtonClicked',
    commentId: 'comment-1',
  },
  profileModified: {
    type: 'profileModified',
    nicknameUpdated: true,
    bioUpdated: true,
    bioLength: 120,
    pictureUpdated: true,
    hasPicture: true,
  },
  groupFollowingChanged: {
    type: 'groupFollowingChanged',
    groupId: 'group-1',
    followed: true,
  },
  sessionStarted: { type: 'sessionStarted', sessionId: 'session-1' },
  sessionStopped: { type: 'sessionStopped', sessionId: 'session-1' },
};

/** One golden per screen type, likewise transcribed from `serializeScreen`. */
const SCREEN_GOLDENS: Record<ScreenType, Wire> = {
  postsFeed: { type: 'postsFeed', feedId: 'feed-1', relatedTopicId: 'topic-1' },
  mainFeed: { type: 'mainFeed', feedId: 'feed-1' },
  groups: { type: 'groups' },
  groupDetail: { type: 'groupDetail', groupId: 'group-1' },
  postDetail: { type: 'postDetail', postId: 'post-1' },
  commentDetail: { type: 'commentDetail', commentId: 'comment-1' },
  createPost: { type: 'createPost' },
  profile: { type: 'profile' },
  activity: { type: 'activity' },
  otherUserProfile: { type: 'otherUserProfile', profileId: 'profile-1' },
  otherUserPosts: { type: 'otherUserPosts', profileId: 'profile-1' },
  editProfile: { type: 'editProfile' },
  reportContent: { type: 'reportContent' },
  reportProfile: { type: 'reportProfile' },
  validateNickname: { type: 'validateNickname' },
  settingsList: { type: 'settingsList' },
  settingsAccount: { type: 'settingsAccount' },
  reportExplanation: { type: 'reportExplanation' },
  deleteAccount: { type: 'deleteAccount' },
  unknown: { type: 'unknown' },
};

describe('SDK events — golden round-trip', () => {
  it.each(Object.entries(EVENT_GOLDENS))(
    're-serializes %s to its golden wire map',
    (_type, golden) => {
      expect(eventToWire(golden as unknown as SDKEvent)).toStrictEqual(golden);
    }
  );

  it.each(Object.entries(SCREEN_GOLDENS))(
    're-serializes the %s screen to its golden wire map',
    (_type, golden) => {
      expect(screenToWire(golden as unknown as ScreenInfo)).toStrictEqual(
        golden
      );
    }
  );

  /**
   * The keys both serializers omit rather than send as null. Worth pinning separately from the
   * fully-populated goldens above: the TypeScript interfaces declare these fields **required**
   * and nullable (`previousReaction: ReactionKind | null`), yet the wire simply has no key, so a
   * host reading `event.previousReaction` gets `undefined`, never `null`. The round-trip has to
   * preserve the omission or it would be asserting a shape neither platform emits.
   */
  it.each([
    [
      'a reaction added from nothing',
      { type: 'reactionModified', contentId: 'post-1', contentKind: 'post' },
    ],
    [
      'a notification with no content',
      { type: 'notificationClicked', notificationId: 'notif-1' },
    ],
    [
      'a profile whose bio and picture did not change',
      {
        type: 'profileModified',
        nicknameUpdated: true,
        bioUpdated: false,
        pictureUpdated: false,
      },
    ],
    [
      'a feed with no related topic',
      {
        type: 'screenDisplayed',
        screen: { type: 'postsFeed', feedId: 'feed-1' },
      },
    ],
  ])(
    'keeps the omitted keys of %s absent rather than null',
    (_case, golden) => {
      expect(eventToWire(golden as unknown as SDKEvent)).toStrictEqual(golden);
    }
  );

  it('refuses an event type no branch handles', () => {
    expect(() =>
      eventToWire({ type: 'notAnEvent' } as unknown as SDKEvent)
    ).toThrow(/Unhandled union member/);
  });

  /**
   * Non-vacuity. Dropping a field from a golden must break the round-trip — otherwise every
   * assertion above could be satisfied by an inverse that merely returns its own input.
   */
  it.each([
    ['postCreated', 'textLength'],
    ['postClicked', 'source'],
    ['groupFollowingChanged', 'followed'],
  ] as const)('fails when the %s golden loses its %s', (type, field) => {
    const { [field]: dropped, ...truncated } = EVENT_GOLDENS[type];
    expect(dropped).toBeDefined();
    expect(eventToWire(truncated as unknown as SDKEvent)).not.toStrictEqual(
      truncated
    );
  });

  /** Same non-vacuity check for the screens that carry a payload. */
  it.each([
    ['mainFeed', 'feedId'],
    ['groupDetail', 'groupId'],
    ['otherUserPosts', 'profileId'],
  ] as const)('fails when the %s screen golden loses its %s', (type, field) => {
    const { [field]: dropped, ...truncated } = SCREEN_GOLDENS[type];
    expect(dropped).toBeDefined();
    expect(screenToWire(truncated as unknown as ScreenInfo)).not.toStrictEqual(
      truncated
    );
  });
});

// ---------------------------------------------------------------------------------------------
// Read models — inbound (native → JS)
// ---------------------------------------------------------------------------------------------

const reactionCountToWire = (reaction: OctopusReactionCount): Wire => {
  const { reactionKind, count, ...rest } = reaction;
  noUnhandledFields(rest);
  return { reactionKind, count };
};

const postToWire = (post: OctopusPost): Wire => {
  const { id, reactions, commentCount, viewCount, userReactionKind, ...rest } =
    post;
  noUnhandledFields(rest);
  // `userReactionKind` goes through `putString` with a nullable argument on Android and sits in
  // the dictionary literal on iOS: unlike the event payloads above, the key is always present.
  return {
    id,
    commentCount,
    viewCount,
    reactions: reactions.map(reactionCountToWire),
    userReactionKind,
  };
};

const gamificationToWire = (gamification: OctopusGamification): Wire => {
  const { level, score, ...rest } = gamification;
  noUnhandledFields(rest);
  return { level, score };
};

const communityDataToWire = (data: OctopusCommunityData): Wire => {
  const { profileId, messageCount, gamification, ...rest } = data;
  noUnhandledFields(rest);
  return {
    profileId,
    messageCount,
    gamification:
      gamification == null ? null : gamificationToWire(gamification),
  };
};

const groupToWire = (group: OctopusGroup): Wire => {
  const {
    id,
    name,
    isFollowed,
    canChangeFollowStatus,
    canAccess,
    canCreateChildren,
    ...rest
  } = group;
  noUnhandledFields(rest);
  return {
    id,
    name,
    isFollowed,
    canChangeFollowStatus,
    canAccess,
    canCreateChildren,
  };
};

const profileToWire = (profile: OctopusProfile): Wire => {
  const { entitlements, clientUserId, ...rest } = profile;
  noUnhandledFields(rest);
  return { entitlements, clientUserId };
};

const connectionStateToWire = (state: OctopusConnectionState): Wire => {
  if (!state.connected) {
    const { connected, ...rest } = state;
    noUnhandledFields(rest);
    return { connected };
  }
  const { connected, isGuest, ...rest } = state;
  noUnhandledFields(rest);
  return { connected, isGuest };
};

const GROUP_GOLDEN: Wire = {
  id: 'group-1',
  name: 'Announcements',
  isFollowed: true,
  canChangeFollowStatus: false,
  canAccess: true,
  canCreateChildren: false,
};

const PROFILE_GOLDEN: Wire = {
  entitlements: ['premium', 'beta'],
  clientUserId: 'client-user-1',
};

describe('read models — golden round-trip', () => {
  it('re-serializes a post with every reaction kind it can carry', () => {
    const golden: Wire = {
      id: 'post-1',
      commentCount: 12,
      viewCount: 340,
      reactions: [
        { reactionKind: 'heart', count: 3 },
        { reactionKind: 'joy', count: 1 },
        { reactionKind: 'mouthOpen', count: 1 },
        { reactionKind: 'clap', count: 2 },
        { reactionKind: 'cry', count: 1 },
        { reactionKind: 'rage', count: 1 },
        // A kind this wrapper version does not model reaches JS as the raw server value:
        // `reactionKindToWire` in `ClientObjectBridge.kt` forwards `unicode`, falling back to
        // the literal `"unknown"` only when it is blank.
        { reactionKind: '🫠', count: 4 },
        { reactionKind: 'unknown', count: 1 },
      ],
      userReactionKind: 'heart',
    };

    expect(postToWire(golden as unknown as OctopusPost)).toStrictEqual(golden);
  });

  it('keeps a post on which the user has no reaction', () => {
    const golden: Wire = {
      id: 'post-1',
      commentCount: 0,
      viewCount: 0,
      reactions: [],
      userReactionKind: null,
    };

    expect(postToWire(golden as unknown as OctopusPost)).toStrictEqual(golden);
  });

  it.each<OctopusReactionKind>([
    'heart',
    'joy',
    'mouthOpen',
    'clap',
    'cry',
    'rage',
  ])('re-serializes the %s reaction kind', (kind) => {
    expect(reactionCountToWire({ reactionKind: kind, count: 1 })).toStrictEqual(
      {
        reactionKind: kind,
        count: 1,
      }
    );
  });

  it('re-serializes community data, gamification included', () => {
    const golden: Wire = {
      profileId: 'profile-1',
      messageCount: 27,
      gamification: { level: 4, score: 1200 },
    };

    expect(
      communityDataToWire(golden as unknown as OctopusCommunityData)
    ).toStrictEqual(golden);
  });

  it('keeps the null branches community data sends explicitly', () => {
    // `CommunityDataMapper` calls `putNull` rather than skipping the key, so unlike the event
    // payloads above these arrive as a real null.
    const withoutGamification: Wire = {
      profileId: 'profile-1',
      messageCount: null,
      gamification: null,
    };
    const withoutScore: Wire = {
      profileId: 'profile-1',
      messageCount: 0,
      gamification: { level: 1, score: null },
    };

    expect(
      communityDataToWire(
        withoutGamification as unknown as OctopusCommunityData
      )
    ).toStrictEqual(withoutGamification);
    expect(
      communityDataToWire(withoutScore as unknown as OctopusCommunityData)
    ).toStrictEqual(withoutScore);
  });

  it('re-serializes a group', () => {
    expect(groupToWire(GROUP_GOLDEN as unknown as OctopusGroup)).toStrictEqual(
      GROUP_GOLDEN
    );
  });

  it('re-serializes a profile', () => {
    expect(
      profileToWire(PROFILE_GOLDEN as unknown as OctopusProfile)
    ).toStrictEqual(PROFILE_GOLDEN);
  });

  it.each([
    { connected: false },
    { connected: true, isGuest: false },
    { connected: true, isGuest: true },
  ])('re-serializes the connection state %j', (golden) => {
    expect(
      connectionStateToWire(golden as unknown as OctopusConnectionState)
    ).toStrictEqual(golden);
  });

  /**
   * These three models are the only inbound payloads with a real decoder in production code
   * (`internals/stateChannels.ts`), so their loop can be closed through it rather than through a
   * local inverse alone: golden in on the native event, decoded value out of the listener,
   * re-serialized, compared. A strictly stronger claim than the assertions above, which only
   * pin this file's own inverse.
   */
  it('closes the group / profile / connection-state loop through the real decoders', () => {
    // A fresh module registry: the channels are module-level singletons holding a value cache,
    // and `react-native` is re-instantiated with them, so the emitter they subscribe to is the
    // one taken from *inside* the isolate — not what an outer import would resolve to.
    let deviceEvents!: DeviceEventEmitterStatic;
    let api!: typeof import('../addGroupsListener') &
      typeof import('../addProfileListener') &
      typeof import('../addConnectionStateListener');

    jest.isolateModules(() => {
      deviceEvents = require('react-native').DeviceEventEmitter;
      api = {
        ...require('../addGroupsListener'),
        ...require('../addProfileListener'),
        ...require('../addConnectionStateListener'),
      };
    });

    const connectionGolden: Wire = { connected: true, isGuest: false };
    const groups: OctopusGroup[][] = [];
    const profiles: (OctopusProfile | null)[] = [];
    const states: OctopusConnectionState[] = [];

    const subscriptions = [
      api.addGroupsListener((value) => groups.push(value)),
      api.addProfileListener((value) => profiles.push(value)),
      api.addConnectionStateListener((value) => states.push(value)),
    ];

    deviceEvents.emit('groupsChanged', { groups: [GROUP_GOLDEN] });
    deviceEvents.emit('profileChanged', { profile: PROFILE_GOLDEN });
    deviceEvents.emit('connectionStateChanged', connectionGolden);

    expect(groups.at(-1)?.map(groupToWire)).toStrictEqual([GROUP_GOLDEN]);
    expect(profileToWire(profiles.at(-1) as OctopusProfile)).toStrictEqual(
      PROFILE_GOLDEN
    );
    expect(
      connectionStateToWire(states.at(-1) as OctopusConnectionState)
    ).toStrictEqual(connectionGolden);

    subscriptions.forEach((subscription) => subscription.remove());
  });
});

// ---------------------------------------------------------------------------------------------
// Write models — outbound (JS → native)
// ---------------------------------------------------------------------------------------------

describe('write models — outbound wire key-set', () => {
  beforeEach(() => {
    mockFetchOrCreate.mockReset();
    mockFetchOrCreate.mockResolvedValue({});
    mockNavigateToCreatePost.mockReset();
    mockNavigateToCreatePost.mockResolvedValue(undefined);
  });

  it('sends every ClientPost field, local attachment included', async () => {
    await fetchOrCreateClientObjectRelatedPost({
      objectId: 'article-1',
      text: 'A text long enough to pass native validation.',
      attachment: { type: 'localImage', uri: 'file:///tmp/cover.png' },
      catchPhrase: 'What do you think?',
      viewObjectButtonText: 'Read the article',
      groupId: 'group-1',
    });

    expect(mockFetchOrCreate.mock.calls[0][0]).toStrictEqual({
      objectId: 'article-1',
      text: 'A text long enough to pass native validation.',
      attachment: { type: 'localImage', uri: 'file:///tmp/cover.png' },
      catchPhrase: 'What do you think?',
      viewObjectButtonText: 'Read the article',
      groupId: 'group-1',
    });
  });

  it('normalises every omitted ClientPost field to an explicit null', async () => {
    await fetchOrCreateClientObjectRelatedPost({
      objectId: 'article-1',
      text: 'A text long enough to pass native validation.',
    });

    // Explicit nulls rather than absent keys: the bridge drops `undefined` on Android but
    // carries it on iOS, so only an explicit null reads the same to both native decoders.
    expect(mockFetchOrCreate.mock.calls[0][0]).toStrictEqual({
      objectId: 'article-1',
      text: 'A text long enough to pass native validation.',
      attachment: null,
      catchPhrase: null,
      viewObjectButtonText: null,
      groupId: null,
    });
  });

  it('sends a remote attachment under its own discriminant', async () => {
    await fetchOrCreateClientObjectRelatedPost({
      objectId: 'article-1',
      text: 'A text long enough to pass native validation.',
      attachment: { type: 'remoteImage', url: 'https://example.com/cover.png' },
    });

    expect(mockFetchOrCreate.mock.calls[0][0].attachment).toStrictEqual({
      type: 'remoteImage',
      url: 'https://example.com/cover.png',
    });
  });

  it('flattens the prefilled post CTA into two wire keys', async () => {
    await navigateToOctopusCreatePost({
      text: 'Draft text',
      imageUri: 'file:///tmp/cover.png',
      topicId: 'topic-1',
      cta: { url: 'https://example.com', label: 'Read more' },
    });

    expect(mockNavigateToCreatePost.mock.calls[0][0]).toStrictEqual({
      text: 'Draft text',
      imageUri: 'file:///tmp/cover.png',
      topicId: 'topic-1',
      ctaUrl: 'https://example.com',
      ctaLabel: 'Read more',
    });
  });

  it('nulls every prefilled post field the caller omitted', async () => {
    await navigateToOctopusCreatePost({});

    expect(mockNavigateToCreatePost.mock.calls[0][0]).toStrictEqual({
      text: null,
      imageUri: null,
      topicId: null,
      ctaUrl: null,
      ctaLabel: null,
    });
  });

  it('sends no prefilled post at all when the caller passes none', async () => {
    await navigateToOctopusCreatePost();

    expect(mockNavigateToCreatePost.mock.calls[0][0]).toStrictEqual(null);
  });
});

// ---------------------------------------------------------------------------------------------
// Typed errors — wire fidelity
// ---------------------------------------------------------------------------------------------

/**
 * Every typed error crosses as the `{code, message}` pair React Native builds from the native
 * `promise.reject(code, message)`. The guards are duck-typed, so what needs pinning is that a
 * well-formed native rejection is recognised and survives the crossing unchanged, and that a
 * malformed one is not silently accepted as typed.
 */
describe('typed errors — wire fidelity', () => {
  const guards: Array<[string, (error: unknown) => boolean, string]> = [
    ['ClientPostError', isClientPostError, 'FILE_TOO_LARGE'],
    ['ConnectUserError', isConnectUserError, 'TOKEN_REQUEST_TIMEOUT'],
    ['SetReactionError', isSetReactionError, 'UNKNOWN_REACTION'],
    ['RefreshEntitlementsError', isRefreshEntitlementsError, 'USER_BANNED'],
    ['GroupFollowUnfollowError', isGroupFollowUnfollowError, 'MISSING_GROUP'],
    [
      'NavigateToOctopusCreatePostError',
      isNavigateToOctopusCreatePostError,
      'IMAGE_RATIO_TOO_LARGE',
    ],
    [
      'OverrideCommunityAccessError',
      isOverrideCommunityAccessError,
      'OVERRIDE_ERROR',
    ],
  ];

  it.each(guards)(
    '%s round-trips its native rejection',
    (_name, guard, code) => {
      const golden = { code, message: 'Native failure message.' };
      // A real RN rejection is an Error carrying the two fields, not a bare object.
      const rejection = Object.assign(new Error(golden.message), { code });

      expect(guard(rejection)).toBe(true);
      expect({
        code: rejection.code,
        message: rejection.message,
      }).toStrictEqual(golden);
    }
  );

  it.each(guards)('%s rejects a malformed rejection', (_name, guard) => {
    expect(guard({ code: 'SOME_CODE' })).toBe(false);
    expect(guard({ message: 'no code' })).toBe(false);
    expect(guard({ code: 42, message: 'code is not a string' })).toBe(false);
    expect(guard(null)).toBe(false);
    expect(guard('SOME_CODE')).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Native anchor — the goldens above must describe what the serializers actually emit
// ---------------------------------------------------------------------------------------------

const readNative = (relativePath: string): string =>
  readFileSync(path.join(__dirname, '..', '..', relativePath), 'utf8');

/**
 * The wire tags emitted inside one native function.
 *
 * Two masked copies of the same source are used, and they have to be two: the range is computed
 * over the fully-masked text, where brace balance is trustworthy because no `{` inside a string
 * can skew it, and the slice is taken from the comments-only mask, where the literals — the very
 * thing being read — survive. Both preserve byte offsets, so the range transfers between them.
 */
const wireTagsIn = (
  source: string,
  signature: RegExp,
  pattern: RegExp
): Set<string> => {
  const [start, end] = functionBodyRange(
    maskCommentsAndStrings(source),
    signature
  );
  const body = maskComments(source).slice(start, end);
  const tags = [...body.matchAll(pattern)].map((match) => match[1] as string);
  if (tags.length === 0) {
    throw new Error(
      `No wire tag matched ${pattern} inside ${signature} — vacuous guard.`
    );
  }
  return new Set(tags);
};

const KOTLIN_TAG = /putString\("type",\s*"([^"]+)"\)/g;
const SWIFT_TAG = /"type":\s*"([^"]+)"/g;

/**
 * Wire tags Android emits and iOS does not.
 *
 * Not a licence to skip a golden — every tag listed here still has one, because JS must handle
 * whatever *either* platform sends. The table records a measured parity gap so a **new** one
 * fails this guard instead of blending into the diff.
 *
 * Only the iOS assertion consults it, which is deliberate: Android is the reference for the
 * event catalog, so a tag iOS emits and Android does not has no excuse and should fail loud.
 */
const KNOWN_PLATFORM_GAPS: Record<string, string> = {
  profileReported:
    'Android emits it from OctopusEvent.ProfileReported; the iOS serializer has no matching ' +
    'case, so the event never reaches JS on iOS. Not yet reported upstream — a gap in the ' +
    'native iOS SDK, not something to work around here.',
};

/**
 * Screen wire tags one platform emits and the other does not, with the platform that does.
 *
 * The event-side table above only excuses iOS, because Android is the reference for the event
 * catalog. The screen catalogs are genuinely asymmetric in both directions, so this one is
 * two-sided — but it is no more a licence to skip a golden than the other: JS must handle
 * whatever *either* platform sends, so every tag here still has a golden and still round-trips.
 * A **new** gap fails the anchor instead of blending into the diff.
 */
const KNOWN_SCREEN_PLATFORM_GAPS: Record<
  string,
  { emittedBy: 'android' | 'ios'; reason: string }
> = {
  activity: {
    emittedBy: 'android',
    reason:
      'Android has OctopusEvent.ScreenDisplayed.Activity for the connected user own ' +
      'Unified Profile activity screen. The native iOS SDK models no separate screen for ' +
      'it and reports .profile instead, so the same user action is "activity" on Android ' +
      'and "profile" on iOS — recorded in the ScreenType TSDoc for hosts.',
  },
  // 'unknown' used to live here as an iOS-only gap: the iOS @unknown default catches a
  // screen case a future native SDK adds, while the Kotlin when has no else on purpose —
  // OctopusEvent.ScreenDisplayed is sealed, so a new subtype broke the Android build
  // instead of being swallowed, and Android never emitted "unknown" itself. It is no
  // longer a gap: serializeScreen now also seeds "unknown" as a defense-in-depth default
  // ahead of that exhaustive `when`, for the one case the compiler cannot catch — a
  // native dependency bump paired with a wrapper build that does not pick up the
  // matching Kotlin subtype. Both platforms textually emit "unknown" now, so the tag is
  // expected on both and needs no entry here.
};

describe('native anchor', () => {
  const kotlinEvents = readNative(
    'android/src/main/java/com/octopuscommunity/octopusreactnativesdk/OctopusEventSerializer.kt'
  );
  const swiftEvents = readNative('ios/OctopusEventSerializer.swift');

  it('has a golden for every event tag the Android serializer emits', () => {
    const emitted = wireTagsIn(kotlinEvents, /fun serializeEvent/, KOTLIN_TAG);
    expect([...emitted].sort()).toStrictEqual(
      Object.keys(EVENT_GOLDENS).sort()
    );
  });

  it('has a golden for every event tag the iOS serializer emits', () => {
    const emitted = wireTagsIn(swiftEvents, /func serializeEvent/, SWIFT_TAG);
    const expected = Object.keys(EVENT_GOLDENS).filter(
      (tag) => !Object.hasOwn(KNOWN_PLATFORM_GAPS, tag)
    );
    expect([...emitted].sort()).toStrictEqual(expected.sort());
  });

  it('has a golden for every screen tag both serializers emit', () => {
    const kotlin = wireTagsIn(kotlinEvents, /fun serializeScreen/, KOTLIN_TAG);
    const swift = wireTagsIn(swiftEvents, /func serializeScreen/, SWIFT_TAG);

    const expectedFor = (platform: 'android' | 'ios') =>
      Object.keys(SCREEN_GOLDENS)
        .filter(
          (tag) =>
            (KNOWN_SCREEN_PLATFORM_GAPS[tag]?.emittedBy ?? platform) ===
            platform
        )
        .sort();

    expect([...kotlin].sort()).toStrictEqual(expectedFor('android'));
    expect([...swift].sort()).toStrictEqual(expectedFor('ios'));
  });

  it('reads live code only', () => {
    // The masking is what separates an emitted tag from one merely mentioned in a comment. A
    // commented-out branch must not count as emitted, or the anchor would bless a tag no
    // platform sends.
    const commented = `
      fun serializeEvent(event: OctopusEvent): WritableMap? {
        // map.putString("type", "ghostEvent")
        /* map.putString("type", "alsoGhost") */
        map.putString("type", "realEvent")
        return map
      }
    `;

    expect(
      wireTagsIn(commented, /fun serializeEvent/, KOTLIN_TAG)
    ).toStrictEqual(new Set(['realEvent']));
  });

  it('refuses to pass vacuously when a serializer stops matching', () => {
    expect(() =>
      wireTagsIn(
        'fun serializeEvent(e: E): M? { return null }',
        /fun serializeEvent/,
        KOTLIN_TAG
      )
    ).toThrow(/vacuous guard/);
    expect(() =>
      wireTagsIn(kotlinEvents, /fun noSuchFunction/, KOTLIN_TAG)
    ).toThrow(/Could not find/);
  });
});
