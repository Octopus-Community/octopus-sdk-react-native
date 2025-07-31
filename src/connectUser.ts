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
     * URL or local file path to the user's profile picture.
     * Supports HTTP/HTTPS URLs and local file paths.
     */
    profilePicture?: string;
    biography?: string;
    /**
     * Whether the user has reached legal age.
     * Used for age-appropriate content filtering and compliance.
     */
    legalAgeReached?: boolean;
  };
}

/**
 * Connects a user using SSO authentication.
 *
 * This function establishes a connection between your app's user and Octopus.
 * It requires that you have configured SSO mode during SDK initialization
 * and have set up a token provider using `useUserTokenProvider` or `addUserTokenRequestListener`.
 */
export function connectUser(params: ConnectUserParams): Promise<void> {
  return OctopusReactNativeSdk.connectUser(params);
}
