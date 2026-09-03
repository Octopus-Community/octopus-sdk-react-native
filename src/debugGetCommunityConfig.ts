import { OctopusReactNativeSdk } from './internals/nativeModule';

/**
 * Snapshot of the community config the backend currently serves (GetConfig),
 * as the native SDK holds it. Field values reflect any local `debugOverride*`
 * too — this reads the same effective config the SDK UI consumes.
 */
export type OctopusDebugCommunityConfig = {
  /** Unified Profile activation flag (`CommunityConfig.exposeClientUserId`). */
  exposeClientUserId: boolean;
  forceLoginOnStrongActions: boolean;
  displayAccountAge: boolean;
  /** Native enum name, lowercased here so both platforms read e.g. `implicit`. */
  termsAcceptanceMode: string;
};

/**
 * Debug-only read of the community config the backend currently serves, so a
 * test app can display the live server state next to the API key it runs on.
 *
 * Resolves `null` while no config has been fetched yet. That window is shorter
 * on Android, where the native SDK also serves the config persisted by a
 * previous run — treat a value here as "the last config the SDK fetched", not
 * as proof of a round-trip in this session. Not part of the stable public API
 * surface and not for use in production apps.
 */
export async function debugGetCommunityConfig(): Promise<OctopusDebugCommunityConfig | null> {
  const config = await OctopusReactNativeSdk.debugGetCommunityConfig();
  if (config === null) return null;
  return {
    ...config,
    // Kotlin enum names are SCREAMING_CASE, Swift cases are lowerCamel — one
    // spelling must leave this layer.
    termsAcceptanceMode: config.termsAcceptanceMode.toLowerCase(),
  };
}
