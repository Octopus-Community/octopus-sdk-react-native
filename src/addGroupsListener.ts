import type { EmitterSubscription } from 'react-native';
import { groupsChannel } from './internals/stateChannels';
import type { OctopusGroup } from './types/octopusGroup';

export type GroupsListenerCallback = (groups: OctopusGroup[]) => void;

/**
 * Adds a listener for the community's {@link OctopusGroup}s — the content categories users can
 * browse and follow.
 *
 * Emits whenever the group list changes (follow/unfollow, admin updates, …), and an empty array
 * when the community has no groups. Consecutive duplicate lists are collapsed, so it fires only on
 * an actual change. **The current list is replayed immediately** to a listener added after the SDK
 * already published one.
 *
 * Mirrors the native `OctopusSDK.groups`.
 *
 * @param callback - Called with the current list, then on every change.
 * @returns A subscription object with a `remove()` method to unsubscribe.
 *
 * @see {@link getGroups} – the synchronous current value.
 * @see {@link syncFollowGroups} – to follow/unfollow groups.
 *
 * @example
 * ```typescript
 * const subscription = addGroupsListener((groups) => {
 *   setFollowedGroups(groups.filter((group) => group.isFollowed));
 * });
 *
 * // Later, to unsubscribe:
 * subscription.remove();
 * ```
 */
export function addGroupsListener(
  callback: GroupsListenerCallback
): EmitterSubscription {
  return groupsChannel.subscribe(callback);
}

/**
 * The community's {@link OctopusGroup}s as last published by the SDK.
 *
 * The value tracked here is the last one received from the native side. Tracking starts when
 * `initialize()` is called, and the native side pushes its current state asynchronously, so a read
 * taken in the very tick `initialize()` resolves may still report an empty array. For UI, prefer
 * {@link addGroupsListener}: it replays the list as soon as it is known.
 *
 * The array returned is a copy — mutating it does not affect what the next caller or listener sees.
 */
export function getGroups(): OctopusGroup[] {
  return groupsChannel.current();
}
