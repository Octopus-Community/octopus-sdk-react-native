import { LogLevel } from '../enums/LogLevel.enum';
import type { OctopusInitialScreen } from '../types/octopusInitialScreen';
import { requireExactlyOneMemberId } from './communityDataMemberId';
import { log } from './logger';

/**
 * The flat wire shape `openUI` sends the native bridges as
 * `options.initialScreen`. One flat object rather than nested payloads,
 * mirroring the existing flat `navigateToOctopusCreatePost` bridge shape
 * (`text` / `imageUri` / `topicId` / `ctaUrl` / `ctaLabel` at the top level)
 * and the `fetchCommunityData(profileId, clientUserId)` id pair.
 *
 * Absent fields are `null`, never `''` or `undefined`, so both natives read
 * one notion of "absent".
 */
export interface NativeInitialScreen {
  type: 'mainFeed' | 'post' | 'group' | 'activity' | 'profile' | 'createPost';
  postId?: string;
  groupId?: string;
  profileId?: string | null;
  clientUserId?: string | null;
  text?: string | null;
  imageUri?: string | null;
  topicId?: string | null;
  ctaUrl?: string | null;
  ctaLabel?: string | null;
}

/**
 * Normalizes the public {@link OctopusInitialScreen} union into the wire shape
 * the native bridges decode.
 *
 * Shared by both entry points that accept an initial screen — `openUI()` and the
 * embedded `<OctopusUIView>` — so the two can never drift on what a given screen
 * marshals to. `caller` only names the API in thrown messages.
 *
 * This is the **single producer** of that payload, and therefore the one place
 * ids are normalized: every id is trimmed here, because an id reaches a native
 * lookup verbatim — `' cu-1 '` would be searched for with its padding and
 * never match. The native decoders deliberately forward what they are given
 * (they only reject blank ids, folding to the main feed), so a decoder-side
 * trim on one platform and not the other is exactly the divergence this
 * producer-side normalization rules out.
 *
 * Throws a plain `Error` synchronously — before any native call — when the
 * screen is structurally invalid (blank `postId` / `groupId`, or an `activity`
 * member violating the exactly-one-id contract), matching the in-process
 * validation idiom of {@link requireExactlyOneMemberId}.
 */
export function normalizeInitialScreen(
  screen: OctopusInitialScreen,
  caller: string = 'openUI'
): NativeInitialScreen {
  switch (screen.type) {
    case 'mainFeed':
      return { type: 'mainFeed' };
    case 'post': {
      const postId = screen.postId?.trim();
      if (!postId) {
        throw new Error(
          `${caller}: initialScreen.postId is required and must be non-blank`
        );
      }
      return { type: 'post', postId };
    }
    case 'group': {
      const groupId = screen.groupId?.trim();
      if (!groupId) {
        throw new Error(
          `${caller}: initialScreen.groupId is required and must be non-blank`
        );
      }
      return { type: 'group', groupId };
    }
    case 'activity': {
      // Trim before the exactly-one check so a whitespace-only id counts as
      // absent rather than passing as a truthy value.
      const normalized = requireExactlyOneMemberId(
        {
          profileId: screen.member.profileId?.trim(),
          clientUserId: screen.member.clientUserId?.trim(),
        },
        `${caller} (initialScreen.activity)`
      );
      return {
        type: 'activity',
        profileId: normalized.profileId,
        clientUserId: normalized.clientUserId,
      };
    }
    case 'profile': {
      // A blank or whitespace-only id counts as no id at all: the connected
      // user's own profile, exactly as omitting it does.
      const clientUserId = screen.clientUserId?.trim() || null;
      return { type: 'profile', clientUserId };
    }
    case 'createPost': {
      const prefilledPost = screen.prefilledPost;
      return {
        type: 'createPost',
        text: prefilledPost?.text ?? null,
        imageUri: prefilledPost?.imageUri ?? null,
        topicId: prefilledPost?.topicId ?? null,
        ctaUrl: prefilledPost?.cta?.url ?? null,
        ctaLabel: prefilledPost?.cta?.label ?? null,
      };
    }
  }
}

/**
 * Applies the notification-wins precedence, then normalizes.
 *
 * A tapped notification always wins over an initial screen — the same
 * precedence both native SDKs apply to their own deep links. It is enforced
 * here, in the single producer of the bridge payload, so neither the two
 * platforms nor the two entry points (`openUI()` and the embedded
 * `<OctopusUIView>`) can drift on it.
 *
 * Precedence applies *before* normalization: a structurally invalid screen that
 * the notification wins over is dropped, not thrown on — there is nothing to
 * validate once it is not going to be used.
 *
 * @param screen The screen the host asked for, if any.
 * @param hasNotification Whether a notification is being sent alongside it.
 * @param caller The public API name used in the warning and in thrown messages.
 * @returns The wire payload, or `undefined` when there is no screen to send.
 */
export function resolveInitialScreen(
  screen: OctopusInitialScreen | undefined,
  hasNotification: boolean,
  caller: string
): NativeInitialScreen | undefined {
  if (!screen) {
    return undefined;
  }
  if (hasNotification) {
    log(
      LogLevel.WARN,
      `${caller}: both notification and initialScreen were provided — following the notification deep link and dropping the initial screen`
    );
    return undefined;
  }
  return normalizeInitialScreen(screen, caller);
}
