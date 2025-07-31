import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { UserProfileField } from './types/userProfileField';

/**
 * Configuration params for initializing the Octopus SDK.
 */
export interface InitializeParams {
  /** Your Octopus API key obtained from the Octopus dashboard */
  apiKey: string;
  /**
   * The connection mode determines how user authentication is handled.
   * - `sso`: Use Single Sign-On with your existing user system
   * - `octopus`: Let Octopus handle user authentication
   */
  connectionMode:
    | {
        /** SSO mode configuration */
        type: 'sso';
        /** List of user profile fields that your app manages directly */
        appManagedFields: UserProfileField[];
      }
    | {
        /** Octopus-managed authentication mode */
        type: 'octopus';
      };
}

/**
 * Initializes the Octopus SDK with the provided configuration.
 *
 * This function must be called before using any other Octopus SDK features.
 * It sets up the SDK with your API key and configures the authentication mode.
 *
 * @example
 * ```typescript
 * // Initialize with SSO mode
 * await initialize({
 *   apiKey: 'your-api-key',
 *   connectionMode: {
 *     type: 'sso',
 *     appManagedFields: ['username', 'profilePicture']
 *   }
 * });
 *
 * // Initialize with Octopus authentication
 * await initialize({
 *   apiKey: 'your-api-key',
 *   connectionMode: {
 *     type: 'octopus'
 *   }
 * });
 * ```
 */
export function initialize(params: InitializeParams): Promise<void> {
  return OctopusReactNativeSdk.initialize(params);
}
