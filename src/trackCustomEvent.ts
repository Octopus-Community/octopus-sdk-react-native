import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Track custom events that are merged into Octopus analytics reports.
 *
 * Use this to send app-specific business events (e.g. purchases, feature usage)
 * so they appear alongside Octopus Community analytics.
 *
 * All property values must be strings. Non-string values should be stringified
 * before calling (e.g. numbers as `"123"`, booleans as `"true"`).
 *
 * @param name - The name of the custom event (e.g. `"purchase"`, `"screen_view"`).
 * @param properties - Optional map of string key-value pairs attached to the event.
 * @returns A promise that resolves when the event has been tracked.
 * @throws An error if the SDK is not initialized or tracking fails.
 *
 * @example
 * ```typescript
 * await trackCustomEvent('purchase', {
 *   product_id: '123',
 *   price: '9.99',
 *   currency: 'EUR',
 * });
 *
 * await trackCustomEvent('feature_used', {
 *   feature: 'community_search',
 *   source: 'home_screen',
 * });
 * ```
 */
export function trackCustomEvent(
  name: string,
  properties?: Record<string, string>
): Promise<void> {
  return OctopusReactNativeSdk.trackCustomEvent(name, properties ?? {});
}
