import { OctopusReactNativeSdk } from './internals/nativeModule';
import type { UserProfileField } from './types/userProfileField';
import type { ImageResolvedAssetSource } from 'react-native';

/**
 * Theme configuration for customizing the Octopus UI appearance.
 */
export interface OctopusTheme {
  /** Color customization options */
  colors?: {
    /** Primary color set for branding (hex format: #FF6B35 or FF6B35) */
    primary?: string;
    /** Primary low contrast color (lighter variation of primary) (hex format: #FF6B35 or FF6B35) */
    primaryLowContrast?: string;
    /** High contrast variation of primary color (hex format: #FF6B35 or FF6B35) */
    primaryHighContrast?: string;
    /** Color for content displayed over the primary color (hex format: #FF6B35 or FF6B35) */
    onPrimary?: string;
  };
  /** Logo customization */
  logo?: {
    /** Local image resource - use Image.resolveAssetSource(require('./path/to/image.png')) */
    image?: ImageResolvedAssetSource;
  };
}

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
  /** Optional theme customization for the Octopus UI */
  theme?: OctopusTheme;
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
