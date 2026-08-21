import { eventEmitter } from './internals/eventEmitter';

export type GroupAccessDeniedCallback = (groupId: string) => void;

let currentCallback: GroupAccessDeniedCallback | null = null;
let subscribed = false;

function ensureSubscribed(): void {
  if (subscribed) {
    return;
  }
  subscribed = true;
  eventEmitter.addListener('groupAccessDenied', (data: { groupId: string }) => {
    currentCallback?.(data.groupId);
  });
}

/**
 * Sets the callback invoked when the current user taps into a group they cannot access
 * (`OctopusGroup.canAccess === false`, typically a premium/gated group).
 *
 * Unlike `addHasAccessToCommunityListener` and the other `add*Listener` APIs, this is a plain
 * **last-write-wins setter**, not a subscription: calling it again replaces the previously set
 * callback. This mirrors the native SDKs exactly — on both Android and iOS the underlying
 * callback is a single mutable field with no unset operation.
 *
 * It returns an unregister handle, matching the Flutter reference's own
 * `setGroupAccessDeniedCallback` (`VoidCallback` return). The handle is identity-guarded: it
 * clears the callback only if this exact callback is still the one registered, so a late
 * `unmount`/`dispose` of an old screen cannot unregister a newer callback set after it. Calling
 * it is optional — nothing breaks if it is dropped — but doing so from a screen's cleanup avoids
 * calling into a component that already unmounted.
 *
 * Native always emits the underlying event once a callback exists on the native side, and this
 * function only forwards it to whichever JS callback is currently held — so setting a new
 * callback takes effect immediately, and there is no failure mode if `setGroupAccessDeniedCallback`
 * is never called (the event is simply not forwarded to anything).
 *
 * @param callback - Function called with the id of the group the user was denied access to.
 * @returns A function that unregisters `callback` — call it, e.g. from a `useEffect` cleanup, to
 * stop it from being invoked. A no-op if a different callback has since replaced it.
 * @see {@link OctopusGroup.canAccess}
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   return setGroupAccessDeniedCallback((groupId) => {
 *     showUpsell(groupId);
 *   });
 * }, []);
 * ```
 */
export function setGroupAccessDeniedCallback(
  callback: GroupAccessDeniedCallback
): () => void {
  currentCallback = callback;
  ensureSubscribed();
  return () => {
    // Only clear if this exact callback is still the registered one, so a late unregister of an
    // old callback doesn't clobber a newer one set after it.
    if (currentCallback === callback) {
      currentCallback = null;
    }
  };
}
