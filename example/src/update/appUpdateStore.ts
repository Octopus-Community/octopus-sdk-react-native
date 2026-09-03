import {
  checkForAppUpdate,
  isAppUpdateSupported,
  startAppUpdate,
  type AppUpdateStatus,
} from './appUpdate';

/**
 * One update state for the whole sample, so the Settings card and the shell's
 * announcement read the same answer and only one check is ever in flight.
 *
 * A module-level store rather than a prop threaded through App: both consumers
 * sit on opposite ends of the tree, and the state is genuinely app-wide — which
 * build Play is offering does not belong to any one screen.
 */
type Listener = () => void;

function initialStatus(): AppUpdateStatus {
  return isAppUpdateSupported() ? { kind: 'unknown' } : { kind: 'unsupported' };
}

let status: AppUpdateStatus = initialStatus();
let inFlight = false;

/** The versionCode the tester was last told about, so it is announced once. */
let lastAnnouncedVersionCode: number | null = null;

const listeners = new Set<Listener>();

export function subscribeToAppUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAppUpdateStatus(): AppUpdateStatus {
  return status;
}

function setStatus(next: AppUpdateStatus): void {
  status = next;
  listeners.forEach((listener) => listener());
}

export async function runAppUpdateCheck(): Promise<void> {
  if (!isAppUpdateSupported() || inFlight) return;
  inFlight = true;
  setStatus({ kind: 'checking' });
  try {
    setStatus(await checkForAppUpdate());
  } finally {
    inFlight = false;
  }
}

/**
 * Returns the versionCode to announce once, or null when there is nothing new
 * to say. Records it, so a tester who has already seen the announcement is not
 * shown it again for the same build on the next check.
 */
export function takeAppUpdateAnnouncement(): number | null {
  if (status.kind !== 'available') return null;
  const version = status.availableVersionCode;
  if (version === null || version === lastAnnouncedVersionCode) return null;
  lastAnnouncedVersionCode = version;
  return version;
}

/** Starts Play's flow, then re-checks rather than assuming what it left behind. */
export async function startAppUpdateFlow(): Promise<void> {
  await startAppUpdate();
  await runAppUpdateCheck();
}

/** Test seam: drops every listener and the remembered state. */
export function resetAppUpdateStoreForTests(): void {
  listeners.clear();
  status = initialStatus();
  inFlight = false;
  lastAnnouncedVersionCode = null;
}

/** Test seam: forces a state without going through the native module. */
export function setAppUpdateStatusForTests(next: AppUpdateStatus): void {
  setStatus(next);
}
