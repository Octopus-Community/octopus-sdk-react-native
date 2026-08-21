/**
 * The reason {@link refreshEntitlements} was rejected.
 *
 * | Code | Meaning | Emitted on |
 * |---|---|---|
 * | `NO_CLIENT_TOKEN_PROVIDER` | No client token provider was registered on the SDK. | Android, iOS |
 * | `USER_NOT_CONNECTED` | No user is currently connected. | Android, iOS |
 * | `NOT_INITIALIZED` | The SDK's `initialize()` has not been called yet. Distinct from `USER_NOT_CONNECTED`, which means the SDK is running but no user is connected. | Android, iOS |
 * | `NO_NETWORK` | The device has no network connection. | Android, iOS |
 * | `USER_BANNED` | The connected user is banned. | Android, iOS |
 * | `SERVER_ERROR` | The server returned an unexpected error. | Android, iOS |
 * | `REFRESH_ENTITLEMENTS_ERROR` | Fallback for any other/unclassified failure. | Android, iOS |
 *
 * @see {@link RefreshEntitlementsError} – the shape of the rejected error.
 * @see {@link isRefreshEntitlementsError} – narrow an unknown caught value.
 */
export type RefreshEntitlementsErrorCode =
  | 'NO_CLIENT_TOKEN_PROVIDER'
  | 'USER_NOT_CONNECTED'
  | 'NOT_INITIALIZED'
  | 'NO_NETWORK'
  | 'USER_BANNED'
  | 'SERVER_ERROR'
  | 'REFRESH_ENTITLEMENTS_ERROR';

/**
 * The error rejected by {@link refreshEntitlements}.
 *
 * The `code` type keeps room (`| (string & {})`) for a future native code that predates its
 * addition to {@link RefreshEntitlementsErrorCode} on the consuming app's SDK version.
 */
export interface RefreshEntitlementsError extends Error {
  readonly code: RefreshEntitlementsErrorCode | (string & {});
}

/**
 * Narrows an unknown caught value to a {@link RefreshEntitlementsError}.
 *
 * @example
 * ```typescript
 * try {
 *   await refreshEntitlements();
 * } catch (error) {
 *   if (isRefreshEntitlementsError(error)) {
 *     console.warn(error.code);
 *   }
 * }
 * ```
 */
export function isRefreshEntitlementsError(
  error: unknown
): error is RefreshEntitlementsError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}
