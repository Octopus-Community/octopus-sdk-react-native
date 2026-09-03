// The version this sample reports on the Settings screen.
//
// Read from the wrapper package's own manifest rather than from a device-info
// dependency, because that is what both native builds already stamp themselves
// with: the Android sample's `versionName` is parsed out of this same file
// (`example/android/app/build.gradle`), and the iOS project's
// `MARKETING_VERSION` is bumped alongside it. So the wrapper version *is* the
// app version on both platforms, and reading it here needs no native module and
// cannot drift into reporting something the store listing contradicts.
//
// Reached by relative path rather than through the package name: the wrapper's
// `exports` does publish `./package.json`, but the workspace resolves the
// package name to `src/index` through a tsconfig path, and the subpath then has
// no type declaration to find. `babel.config.js` reads the same file the same
// way, and the repo root is a Metro watch folder, so the bundler follows it.

import { version } from '../../../package.json';

/**
 * The Octopus wrapper version this sample is built against — also its own
 * `versionName` on Android and `MARKETING_VERSION` on iOS.
 */
export const sampleVersion: string = version;

/**
 * The build this binary came out of — the CI run number, which is also the varying
 * half of the Android `versionCode` (`SAMPLE_VERSION_CODE * 10000 + run number`, see
 * `example/android/app/build.gradle`) and of the iOS build number.
 *
 * `null` on a local build, and rendered as nothing rather than as a zero: two testers
 * comparing a store build have a real number to quote, and a developer running Metro
 * has no build to name. Neither platform exposes its version code to JS without a
 * native module, so this is injected at bundle time by the workflows that produce a
 * store build — the same `example/.env` path the API keys already take.
 */
export const sampleBuild: string | null =
  (process.env.OCTOPUS_SAMPLE_BUILD ?? '') === ''
    ? null
    : (process.env.OCTOPUS_SAMPLE_BUILD as string);

/** `1.13.0 (214)`, or just `1.13.0` when this build has no CI number. */
export const sampleVersionLabel: string =
  sampleBuild === null ? sampleVersion : `${sampleVersion} (${sampleBuild})`;
