import { OctopusReactNativeSdk } from './internals/nativeModule';

export interface ConnectUserParams {
  /**
   * Unique identifier for the user in your system.
   * This should be a stable, unique ID that won't change for the user.
   */
  userId: string;
  profile?: {
    username?: string;
    /**
     * HTTP/HTTPS URL, local file path or base64-encoded profile picture.
     * Surrounding whitespace is trimmed and URL schemes are case-insensitive.
     * URLs require a host and must be URL-encoded (no unescaped spaces).
     * Base64 accepts an optional `data:image/...;base64,` prefix, missing padding
     * and line breaks, with canonical padding bits. URL-safe base64 (`-` and `_`)
     * is rejected. The bridge imposes no base64 size limit. Decoded base64 must
     * be recognized by the platform's image decoder on both platforms.
     * Android local files, drawable names (including vectors) and assets must
     * exist and be readable; their decoding stays with the native SDK. Android
     * passes remote URLs directly to the native SDK without a bridge download.
     * iOS downloads remote bytes before connecting, requires an HTTP 2xx response,
     * and checks both remote and local bytes with its image decoder.
     * Invalid syntax, undecodable base64 or missing/unreadable local inputs reject
     * `connectUser` with `CONNECT_USER_ERROR` before calling the native SDK,
     * preserving the stored avatar. iOS also rejects failed downloads, non-2xx
     * responses and undecodable remote or local bytes with that code. An empty
     * or whitespace-only string still means no picture.
     * Inline image formats also depend on the device decoder: on Android, inline
     * HEIF below API 28 and inline AVIF below API 31 reject with `CONNECT_USER_ERROR`.
     */
    profilePicture?: string;
    biography?: string;
  };
}

/**
 * Connects a user using SSO authentication.
 *
 * This function establishes a connection between your app's user and Octopus. It requires that you
 * have configured SSO mode during SDK initialization and have set up a token provider using
 * `useUserTokenProvider` or `addUserTokenRequestListener`. The token is obtained via your token
 * provider; you do not pass it directly to `connectUser`. Call `connectUser` after the user logs in;
 * call `disconnectUser` when they log out.
 *
 * The returned promise settles on the **outcome** of the connection, not on the request being
 * sent: it resolves once the native SDK has authenticated the user, and rejects with a
 * {@link ConnectUserErrorCode} when the connection is refused — a banned user, a token the
 * backend will not accept, no network. Always handle the rejection: a swallowed one leaves the
 * user anonymous while your app believes it connected them, which shows up as a login screen
 * that "does nothing" and a community that keeps asking for an account.
 *
 * Because the promise waits for that outcome, the token provider must already be registered
 * when you call this — the native SDK requests the JWT during the call, and the request is
 * dropped if nothing is listening for it. An unanswered request fails the call with
 * `TOKEN_REQUEST_TIMEOUT` after 60 s rather than hanging.
 *
 * @param params - User id and optional profile (username, profilePicture, biography). See {@link ConnectUserParams}.
 * @returns A promise that resolves when the user is connected.
 * @throws A {@link ConnectUserError} carrying a {@link ConnectUserErrorCode} — `USER_BANNED`,
 *         `MISSING_TOKEN`, `INVALID_TOKEN`, `NO_NETWORK`, … — when the native SDK refuses the
 *         connection, the SDK is not initialized, or SSO is not configured. Narrow it with
 *         {@link isConnectUserError}.
 * @see {@link useUserTokenProvider} – provide JWT from React components.
 * @see {@link addUserTokenRequestListener} – provide JWT without React.
 * @see {@link disconnectUser} – disconnect the current user.
 * @see {@link ConnectUserErrorCode} – every refusal reason, and which platform reports it.
 *
 * @example
 * ```typescript
 * try {
 *   await connectUser({
 *     userId: 'unique-user-id-from-your-backend',
 *     profile: {
 *       username: 'john_doe',
 *       profilePicture: 'https://example.com/avatar.jpg',
 *       biography: 'Software developer'
 *     }
 *   });
 * } catch (error) {
 *   if (isConnectUserError(error) && error.code === 'USER_BANNED') {
 *     // `message` is the backend's reason and can be shown as-is.
 *     showBlockingMessage(error.message);
 *   } else {
 *     // Still anonymous — tell the user, and do not send them back to the login screen
 *     // expecting a different result.
 *     showRetryableError();
 *   }
 * }
 * ```
 */
export function connectUser(params: ConnectUserParams): Promise<void> {
  return OctopusReactNativeSdk.connectUser(params);
}
