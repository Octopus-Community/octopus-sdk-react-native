import { eventEmitter } from './internals/eventEmitter';
import type { SDKEvent } from './types/sdkEvents';

export type SDKEventListenerCallback = (event: SDKEvent) => void;

/**
 * Adds a listener for SDK events.
 *
 * This listener receives all SDK events including:
 * - Content creation (posts, comments, replies)
 * - Content deletion
 * - Reactions and interactions
 * - Gamification events
 * - Screen navigation
 * - Profile modifications
 * - Session events
 * - And more...
 *
 * Use TypeScript type guards to narrow down specific event types:
 *
 * @param callback - Function called when any SDK event occurs
 * @returns A subscription object with a `remove()` method to unsubscribe
 *
 * @example
 * ```typescript
 * const subscription = addSDKEventListener((event) => {
 *   switch (event.type) {
 *     case 'postCreated':
 *       console.log(`Post created: ${event.postId}`);
 *       break;
 *     case 'reactionModified':
 *       console.log(`Reaction changed on ${event.contentId}`);
 *       break;
 *     case 'gamificationPointsGained':
 *       console.log(`Gained ${event.points} points for ${event.action}`);
 *       break;
 *     // ... handle other event types
 *   }
 * });
 *
 * // Later, to unsubscribe:
 * subscription.remove();
 * ```
 */
export function addSDKEventListener(callback: SDKEventListenerCallback) {
  return eventEmitter.addListener('sdkEvent', (data: SDKEvent) => {
    callback(data);
  });
}
