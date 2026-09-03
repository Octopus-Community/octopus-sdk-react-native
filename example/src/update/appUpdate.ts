import { NativeModules } from 'react-native';

/**
 * Talks to the sample-local `AppUpdateModule` (see
 * `example/android/app/src/main/java/.../update/AppUpdateModule.kt`).
 *
 * Android only: the module wraps Play's in-app update API, and there is no iOS
 * equivalent worth faking — the App Store has no in-place update flow an app can
 * start. On any other platform this file reports `unsupported` and nothing is
 * rendered, rather than showing a row nobody can act on.
 */
export type AppUpdateStatus =
  | { kind: 'unsupported' }
  | { kind: 'unknown' }
  | { kind: 'checking' }
  | { kind: 'upToDate' }
  | { kind: 'available'; availableVersionCode: number | null }
  /**
   * A newer build exists, but Play refuses to install it over this one. Rare —
   * it takes a track configured to forbid it — and deliberately not folded into
   * `upToDate`: telling a tester their stale build is current is the one answer
   * this feature must never give.
   */
  | { kind: 'notInstallable' }
  /** Play does not own this install: sideload, Gradle install, no Play Store. */
  | { kind: 'notFromPlayStore' }
  | { kind: 'checkFailed'; errorCode: number | null };

/** The shape `AppUpdateModule.checkForUpdate()` resolves with. */
export type NativeUpdateResult = {
  status:
    | 'upToDate'
    | 'available'
    | 'notInstallable'
    | 'notFromPlayStore'
    | 'error';
  availableVersionCode?: number;
  errorCode?: number;
};

type AppUpdateNativeModule = {
  checkForUpdate(): Promise<NativeUpdateResult>;
  startImmediateUpdate(): Promise<boolean>;
};

/**
 * Resolved on first use, not at import time. Touching `NativeModules` while the
 * bridge is absent throws — which is exactly what a unit-test environment looks
 * like, and a throw at import time takes down every module that transitively
 * imports this one.
 *
 * Absence is the platform check: the module is registered by the sample's Android
 * host only, so anywhere else — iOS, a test runner — this is `undefined`. Asking
 * `Platform.OS` instead would read the same bridge and throw the same way.
 */
function appUpdateNativeModule(): AppUpdateNativeModule | undefined {
  try {
    return NativeModules.OctopusSampleAppUpdate;
  } catch {
    return undefined;
  }
}

export function isAppUpdateSupported(): boolean {
  return appUpdateNativeModule() != null;
}

/**
 * Maps what the native module answered. Pure, so the decision is testable
 * without a device — the part worth testing is which outcome each answer
 * produces, not the bridge plumbing.
 */
export function toAppUpdateStatus(result: NativeUpdateResult): AppUpdateStatus {
  switch (result.status) {
    case 'upToDate':
      return { kind: 'upToDate' };
    case 'available':
      return {
        kind: 'available',
        availableVersionCode: result.availableVersionCode ?? null,
      };
    case 'notInstallable':
      return { kind: 'notInstallable' };
    case 'notFromPlayStore':
      return { kind: 'notFromPlayStore' };
    default:
      return { kind: 'checkFailed', errorCode: result.errorCode ?? null };
  }
}

/** The one line the card shows for each state. */
export function describeAppUpdateStatus(status: AppUpdateStatus): string {
  switch (status.kind) {
    case 'unsupported':
      return '';
    case 'unknown':
      return 'Tap to check for updates';
    case 'checking':
      return 'Checking…';
    case 'upToDate':
      return 'App is up to date';
    case 'available':
      return 'A new version is available';
    case 'notInstallable':
      return "A new version exists, but Play won't install it over this build";
    case 'notFromPlayStore':
      return 'Not installed from Play Store';
    case 'checkFailed':
      return status.errorCode === null
        ? 'Update check failed — tap to retry'
        : `Update check failed (code ${status.errorCode}) — tap to retry`;
  }
}

/**
 * Whether the state is one the tester should read as a problem. "Not installed
 * from Play Store" is not: it is the normal outcome of the commonest way this
 * sample reaches a device.
 */
export function isAppUpdateProblem(status: AppUpdateStatus): boolean {
  return status.kind === 'notInstallable' || status.kind === 'checkFailed';
}

export async function checkForAppUpdate(): Promise<AppUpdateStatus> {
  const nativeModule = appUpdateNativeModule();
  if (nativeModule == null) {
    return { kind: 'unsupported' };
  }
  try {
    return toAppUpdateStatus(await nativeModule.checkForUpdate());
  } catch {
    // The module resolves every Play outcome and rejects for none of them, so
    // reaching here means the bridge itself failed. Retryable, and never
    // reported as "not from Play Store" — a tester told to retry loses a tap,
    // one told the wrong story loses the session.
    return { kind: 'checkFailed', errorCode: null };
  }
}

/**
 * Hands control to Play. Only ever called from a tap: nothing here launches the
 * flow on its own, which is the rule the shared contract binds.
 */
export async function startAppUpdate(): Promise<boolean> {
  const nativeModule = appUpdateNativeModule();
  if (nativeModule == null) return false;
  try {
    return await nativeModule.startImmediateUpdate();
  } catch {
    return false;
  }
}
