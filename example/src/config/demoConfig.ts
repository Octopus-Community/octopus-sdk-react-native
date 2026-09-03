// Sample demo configuration (API key sources + SSO test users + demo fixtures).
//
// Committed on purpose and contains NO secret — it only reads build-time values
// injected by `react-native-dotenv` from `example/.env` (gitignored), mirroring
// how the Flutter sample injects via `--dart-define` and the Android sample via
// `BuildConfig`. The source always compiles, with or without a key: a cold
// clone of the public mirror ships `.env.dist` only, so every value below
// resolves to its empty default and the Config screen says so.
//
// `process.env.X` reads are inlined by the babel plugin at build time, so every
// name has to be a literal here — a computed name reads as `undefined`. Keeping the
// same names in `babel.config.js`'s allowlist is hygiene, not a requirement: the
// allowlist only gates `import ... from '@env'`, not these `process.env` reads.

import type { ApiServer } from '@octopus-community/react-native';

/**
 * One named demo API key injected at build time.
 */
export interface InjectedApiKey {
  /** Stable identifier — used in test ids and in the Home dashboard. */
  id: string;
  /** Human-readable description of the community configuration. */
  label: string;
  /** The key value handed to `initialize()` when this slot is picked. */
  key: string;
}

/**
 * Parses the `OCTOPUS_NAMED_API_KEYS` wire string into typed slots.
 *
 * Wire format — entries separated by `;`, fields by `~`, in `id~label~key`
 * order:
 *
 *     slotA~Human label A~AbC123;slotB~Human label B~XyZ789
 *
 * Keys are base64url-shaped (`[A-Za-z0-9_-]`) and labels are plain text, so
 * neither ever contains a delimiter. This repo enumerates NO community, carries
 * NO label and embeds NO key — those live exclusively in the private launcher
 * that fills the variable from the operator's own secrets.
 *
 * Defensive against the realities of a shell-built value: tolerates empty
 * input, surrounding whitespace and trailing/empty entries, and silently drops
 * malformed entries (wrong field count, empty id or key) rather than throwing
 * into the Config screen's render.
 */
export function parseNamedApiKeys(raw: string | undefined): InjectedApiKey[] {
  const keys: InjectedApiKey[] = [];
  for (const entry of (raw ?? '').split(';')) {
    const trimmed = entry.trim();
    if (trimmed === '') continue;
    const fields = trimmed.split('~');
    if (fields.length !== 3) continue;
    const id = (fields[0] ?? '').trim();
    const label = (fields[1] ?? '').trim();
    const key = (fields[2] ?? '').trim();
    if (id === '' || key === '') continue;
    keys.push({ id, label: label === '' ? id : label, key });
  }
  return keys;
}

/**
 * Generic demo API key — the one the sample used before named key sets existed.
 * Empty on a keyless build.
 */
const octopusApiKey: string = process.env.OCTOPUS_COMMUNITY_API_KEY ?? '';

/**
 * The named key sets present in this build. Empty on a public / keyless build →
 * the Config screen falls back to the plain Demo / Custom selector.
 */
export const injectedApiKeys: InjectedApiKey[] = parseNamedApiKeys(
  process.env.OCTOPUS_NAMED_API_KEYS
);

/** Whether a generic demo key was injected. */
export const hasInjectedApiKey: boolean = octopusApiKey !== '';

/**
 * Stable identifier for the demo SSO user used by the Connection scenario.
 *
 * `??` would not do here: `react-native-dotenv` inlines a declared-but-empty
 * `.env` entry as `''`, not `undefined`, and `.env.dist` ships
 * `OCTOPUS_SSO_USER_ID=` — so every clone would get an empty id and the Config
 * screen would prefill nothing.
 */
export const octopusUserId: string =
  (process.env.OCTOPUS_SSO_USER_ID ?? '').trim() === ''
    ? 'react-native-sample-user'
    : (process.env.OCTOPUS_SSO_USER_ID as string).trim();

/**
 * Pre-baked JWTs for the demo SSO user, signed by the backend with the shared
 * SSO secret — one per entitlement combination the Connection scenario walks.
 *
 * The sample signs nothing itself: unlike the Flutter sample it carries no
 * `CLIENT_USER_TOKEN_SECRET` and no HMAC dependency, so each variant is a token
 * injected by the build. A variant left empty disables its preset with an
 * explanation instead of firing a call that cannot succeed.
 */
export const octopusUserTokens = {
  none: process.env.OCTOPUS_SSO_USER_TOKEN ?? '',
  premium: process.env.OCTOPUS_SSO_USER_TOKEN_PREMIUM ?? '',
  moderator: process.env.OCTOPUS_SSO_USER_TOKEN_MODERATOR ?? '',
  premiumModerator: process.env.OCTOPUS_SSO_USER_TOKEN_PREMIUM_MODERATOR ?? '',
} as const;

/** The entitlement combinations the Connection scenario can connect as. */
export type EntitlementVariant = keyof typeof octopusUserTokens;

/**
 * The `.env` variable each entitlement variant is injected by.
 *
 * The UI names these rather than the internal variant keys: a disabled preset
 * has to tell the operator which variable to set, not which object key it reads.
 */
export const USER_TOKEN_ENV_VARS: Record<EntitlementVariant, string> = {
  none: 'OCTOPUS_SSO_USER_TOKEN',
  premium: 'OCTOPUS_SSO_USER_TOKEN_PREMIUM',
  moderator: 'OCTOPUS_SSO_USER_TOKEN_MODERATOR',
  premiumModerator: 'OCTOPUS_SSO_USER_TOKEN_PREMIUM_MODERATOR',
};

/** Human-readable name of each variant, for labels and log lines. */
export const ENTITLEMENT_LABELS: Record<EntitlementVariant, string> = {
  none: 'no entitlements',
  premium: 'Premium',
  moderator: 'Moderator',
  premiumModerator: 'Premium + Moderator',
};

/** Whether a token was injected for a given entitlement variant. */
export function hasUserToken(variant: EntitlementVariant): boolean {
  return octopusUserTokens[variant] !== '';
}

/**
 * A real post id on the demo community. Prefills the fixtures that need one;
 * empty on a keyless build.
 */
export const octopusDemoPostId: string = process.env.OCTOPUS_DEMO_POST_ID ?? '';

/** The default Octopus backend, which every published native SDK targets. */
export const PRODUCTION_HOST = 'api.8pus.io';

/**
 * The demo backend this sample targets unless a build says otherwise.
 *
 * Public infrastructure host, carrying no client data — the Android native
 * sample has targeted it from its `demo` flavor for months.
 */
export const DEMO_HOST = 'api-demo2.8pus.io';

/**
 * Normalizes an `OCTOPUS_API_HOST` value into an {@link ApiServer}.
 *
 * The variable is written by hand and by CI (from a secret that may well be a
 * full base URL), while `apiServer.host` must be a bare host: both native SDKs
 * *reject* a host carrying a scheme, a port or a path, and that rejection
 * surfaces as a failed `initialize()`. So accept the shapes an operator
 * realistically types — `api-demo2.8pus.io`, `https://api-demo2.8pus.io`,
 * `https://api-demo2.8pus.io:8443/` — and hand the SDK the pieces separately.
 *
 * Exported for its unit test; a value that normalizes to nothing usable yields
 * `undefined`, which the sample treats exactly like an unset variable.
 */
export function parseApiHost(raw: string | undefined): ApiServer | undefined {
  let value = (raw ?? '').trim();
  if (value === '') return undefined;
  value = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  const slash = value.indexOf('/');
  if (slash !== -1) value = value.slice(0, slash);
  // Split the port off, leaving a bracketed IPv6 literal (`[::1]`, `[::1]:8443`)
  // intact: only a colon *after* the closing bracket delimits its port.
  let host = value;
  let port: number | undefined;
  const colon = value.lastIndexOf(':');
  const bracket = value.lastIndexOf(']');
  if (colon > bracket) {
    const tail = value.slice(colon + 1);
    if (/^\d+$/.test(tail)) {
      host = value.slice(0, colon);
      port = Number(tail);
    }
  }
  if (host === '') return undefined;
  return port === undefined ? { host } : { host, port };
}

/**
 * Resolves the backend a build targets from its raw `OCTOPUS_API_HOST` value.
 *
 * Split out of {@link octopusApiServer} so the default is testable: the env read
 * itself is substituted at transform time, so a test can reach the rule but
 * never the variable.
 */
export function resolveApiServer(raw: string | undefined): ApiServer {
  return parseApiHost(raw) ?? { host: DEMO_HOST };
}

/**
 * The backend this build routes the SDK to.
 *
 * Unlike the Android *native* sample, which picks its server at build time
 * through a product flavor, the wrapper reroutes at runtime: both native SDKs
 * accept an `apiServer` on `initialize()`, and the bridge forwards it. That is
 * what makes the demo backend reachable from a store build even though the
 * published native SDKs are pinned to production — `App.tsx` passes this value
 * straight to `initialize()`.
 *
 * **Demo unless a build asks for production.** Left empty, the sample targets
 * {@link DEMO_HOST}: an unconfigured checkout — a fresh clone of the public
 * mirror included — must not be one `initialize()` away from writing test posts
 * into real client communities. Production stays reachable, but only by naming
 * it: `OCTOPUS_API_HOST=api.8pus.io`. The store legs are unaffected, they inject
 * the host explicitly on every build.
 */
export const octopusApiServer: ApiServer = resolveApiServer(
  process.env.OCTOPUS_API_HOST
);

/**
 * Whether the sample targets the production backend — true only when the build
 * asked for it by name, which is what the production banner keys off.
 */
export const octopusIsProdServer: boolean =
  octopusApiServer.host === PRODUCTION_HOST;

/** The host label the production banner and the dashboards display. */
export const octopusHostLabel: string = octopusApiServer.host;

/**
 * Reads the internal-build marker out of its raw injected value.
 *
 * `??` alone would not do, for the same reason it does not for
 * {@link octopusUserId}: a declared-but-empty `.env` entry inlines as `''`, not
 * `undefined`, and `.env.dist` ships `OCTOPUS_INTERNAL=`. A variable left out of
 * `.env` entirely is not inlined at all and reads as `undefined` at runtime.
 * Both mean *not internal* — deliberately fail-closed: anything that is not
 * literally `true` (case and surrounding space aside) hides the banner.
 *
 * Exported for its unit test.
 */
export function parseInternalMarker(raw: string | undefined): boolean {
  return (raw ?? '').trim().toLowerCase() === 'true';
}

/**
 * Whether this build is a detectably *internal* one.
 *
 * Declared by `OCTOPUS_INTERNAL=true` in `example/.env`, which only an Octopus
 * machine writes: the public mirror ships `.env.dist` with the variable empty.
 * The store legs write an `example/.env` of their own and deliberately leave the
 * marker out of it, so a Play Internal / TestFlight build behaves like a
 * client's — the same trade-off the Android sample took.
 *
 * Detecting internal *by the API key* is impossible: the key is opaque and
 * carries no sandbox/prod bit, so the marker has to be the build.
 */
export const octopusIsInternalBuild: boolean = parseInternalMarker(
  process.env.OCTOPUS_INTERNAL
);

/**
 * Whether the production banner is shown, given the two facts it depends on.
 *
 * Exported as a pure function for its unit test; the value the app uses is
 * {@link octopusShowsServerWarning}.
 */
export function shouldShowServerWarning(
  isInternalBuild: boolean,
  isProdServer: boolean
): boolean {
  return isInternalBuild && isProdServer;
}

/**
 * Whether this build shows the production banner.
 *
 * The banner is an *internal* safety net, not a product feature. Since #192 an
 * unconfigured build lands on the demo backend, so the only way to reach
 * production is to name it — and the host who does that is usually not us: a
 * client integrating the SDK points the sample at production with their own key,
 * which is their nominal case, and has no reason to be shown an Octopus host in
 * a red bar. So the warning needs BOTH halves: a build we can tell is ours AND a
 * backend that can reach client communities. Same rule, same marker, on the
 * Android and Flutter samples.
 */
export const octopusShowsServerWarning: boolean = shouldShowServerWarning(
  octopusIsInternalBuild,
  octopusIsProdServer
);

/**
 * Which backend the host names, in words.
 *
 * The bare hostname does not read as "demo" or "production" to anyone who
 * doesn't already know the infrastructure, and the {@link ServerEnv} the sample
 * carries cross-platform only distinguishes `prod` from `custom` — so on the
 * demo backend it says `custom`, which is true of the *build flag* and
 * misleading about the *server*. This is what the screens show next to the host.
 */
export const octopusServerLabel: 'Production' | 'Demo' | 'Custom' =
  octopusApiServer.host === PRODUCTION_HOST
    ? 'Production'
    : octopusApiServer.host === DEMO_HOST
      ? 'Demo'
      : 'Custom';

/** Where the API key handed to `initialize()` comes from. */
export type ApiKeySource = 'demo' | 'custom';

/**
 * Which `connectionMode` the SDK is initialized with.
 *
 * `sso` is the host-authenticated mode this sample mostly exercises: the app
 * owns the user and serves a signed JWT on demand. `octopus` hands login to the
 * SDK, which is why it disables the Connection scenario and the Settings
 * Connect button — in that mode the host has no user to connect.
 */
export type AuthMode = 'sso' | 'octopus';

/**
 * The backend the SDK is initialized against. Chosen at build time by
 * `OCTOPUS_API_HOST`, then applied at runtime through `initialize()`'s
 * `apiServer` — so it is not switchable from inside a running build.
 */
export type ServerEnv = 'prod' | 'custom';

/** App-level theme choice captured on the Config screen. */
export type AppThemeChoice = 'system' | 'light' | 'dark';

/**
 * What the Config screen captures and Start hands to the SDK.
 *
 * Persisted across launches by `config/configStorage` — every field except
 * {@link DemoConfig.customApiKey}, which is deliberately never written, so a
 * pasted key never touches device storage.
 */
export interface DemoConfig {
  apiKeySource: ApiKeySource;
  /** Set when {@link DemoConfig.apiKeySource} is `custom`. */
  customApiKey: string;
  /** Set when a named key set was picked. */
  selectedKeyId: string | null;
  /** The JWT `sub` the Connection scenario connects with. Unused in `octopus` mode. */
  userId: string;
  authMode: AuthMode;
  theme: AppThemeChoice;
  /**
   * Never read by the app — the SDK is routed from {@link octopusApiServer},
   * which the build owns. Carried so the config keeps the shape the other
   * samples persist, and re-derived on restore rather than trusted.
   */
  serverEnv: ServerEnv;
}

/** The key `initialize()` is called with, or `''` when the config carries none. */
export function resolveApiKey(config: DemoConfig): string {
  if (config.apiKeySource === 'custom') return config.customApiKey.trim();
  const named = injectedApiKeys.find((k) => k.id === config.selectedKeyId);
  return named?.key ?? octopusApiKey;
}

/** Human-readable label for the picked key source, shown on the dashboards. */
export function apiKeyLabel(config: DemoConfig): string {
  if (config.apiKeySource === 'custom') return 'Custom (pasted)';
  const named = injectedApiKeys.find((k) => k.id === config.selectedKeyId);
  if (named) return named.label;
  return hasInjectedApiKey ? 'Demo (.env)' : 'Demo (no key injected)';
}

/**
 * The community the picked key points at.
 *
 * Split from {@link apiKeyLabel} because the shared configuration summary shows the two on
 * separate lines: *which community* the build talks to, and *where its key comes from*. A
 * named slot's label is the community's own name, so it answers the first question; the slot
 * id and the "pasted"/".env" provenance answer the second.
 */
export function communityLabel(config: DemoConfig): string {
  if (config.apiKeySource === 'custom') return 'Custom community';
  const named = injectedApiKeys.find((k) => k.id === config.selectedKeyId);
  return named?.label ?? 'Demo community';
}

/**
 * The community a runtime `switchCommunity` re-targets the SDK at.
 *
 * `id` is the named slot the key came from, or `null` when it was pasted into the Lifecycle
 * scenario's fallback field — the same two provenances {@link DemoConfig.apiKeySource}
 * distinguishes.
 */
export interface SwitchCommunityTarget {
  id: string | null;
  label: string;
  key: string;
}

/**
 * The configuration the sample *displays* after a runtime community switch.
 *
 * `switchCommunity` re-targets the SDK without going through the Config screen, so the
 * captured {@link DemoConfig} would keep naming the community the session started on — the
 * Home dashboard and the Settings summary read it, and both would then be a lie. This folds
 * the switch back into the same shape, so every label derives from one object as before.
 *
 * Pure and exported for its unit test; the sample never mutates the config it captured.
 */
export function applySwitchedCommunity(
  config: DemoConfig,
  target: SwitchCommunityTarget
): DemoConfig {
  return target.id === null
    ? {
        ...config,
        apiKeySource: 'custom',
        customApiKey: target.key,
        selectedKeyId: null,
      }
    : {
        ...config,
        apiKeySource: 'demo',
        selectedKeyId: target.id,
        // Dropped, not kept: leaving the previous session's pasted key in a config that now
        // names a slot would resolve to the slot yet still carry a key nothing reads.
        customApiKey: '',
      };
}

/** What {@link resolveSwitchTarget} works out for the Lifecycle scenario's Run button. */
export interface SwitchTargetResolution {
  /**
   * Whether the build has a named slot other than the one currently active. `false` means
   * there is nothing left to pick from the slot list — the free-text field is the only way
   * to switch, whether or not the build injects named keys at all.
   */
  hasSwitchableSlot: boolean;
  /**
   * `selectedId` corrected off the active slot when another one is available — the id the
   * chip picker should actually show as selected.
   */
  resolvedSelectedId: string;
  /** The concrete target a switch would run right now, or `null` when nothing is selectable. */
  switchTarget: SwitchCommunityTarget | null;
}

/**
 * Works out the Lifecycle scenario's switch target from the build's injected slots and the
 * screen's own selection state — extracted from `ScenariosScreen` so the four shapes a build
 * can take (one slot, one slot already active, only a custom key active, no slots at all) are
 * unit-testable without mounting the screen.
 *
 * `selectedId` is `undefined` on the very first call (the screen's lazy `useState` seed) and
 * the current chip selection afterwards; both cases share the same "move off the active slot"
 * correction. `activeCustomKey` is the key currently in force when it was pasted rather than
 * picked from a slot (`null` otherwise) — it guards the free-text path the same way
 * `slot.id === activeApiKeyId` guards the slot path, so pasting back the key already in force
 * does not offer a switch to itself.
 */
export function resolveSwitchTarget(
  slots: InjectedApiKey[],
  activeApiKeyId: string | null,
  selectedId: string | undefined,
  pastedKey: string,
  activeCustomKey: string | null = null
): SwitchTargetResolution {
  const hasSwitchableSlot = slots.some((slot) => slot.id !== activeApiKeyId);
  const otherSlotId = slots.find((slot) => slot.id !== activeApiKeyId)?.id;

  let resolvedSelectedId: string;
  if (selectedId === undefined) {
    // Initial pick: prefer a slot other than the active one. A single-slot build that is
    // already on it has nothing else to offer, so it gets that slot back rather than ''.
    resolvedSelectedId = otherSlotId ?? slots[0]?.id ?? '';
  } else if (hasSwitchableSlot && selectedId === activeApiKeyId) {
    // The selection just became the active slot (a switch landed on it) — move off it.
    resolvedSelectedId = otherSlotId ?? selectedId;
  } else {
    resolvedSelectedId = selectedId;
  }

  if (hasSwitchableSlot) {
    const slot = slots.find((s) => s.id === resolvedSelectedId);
    const switchTarget: SwitchCommunityTarget | null =
      slot === undefined || slot.id === activeApiKeyId
        ? null
        : { id: slot.id, label: slot.label, key: slot.key };
    return { hasSwitchableSlot, resolvedSelectedId, switchTarget };
  }

  const pasted = pastedKey.trim();
  const switchTarget: SwitchCommunityTarget | null =
    // Both sides trimmed: the pasted value is, and the active one reached the config through
    // the same field, so comparing a trimmed value against an untrimmed one would let the key
    // already in force back through as a switch to itself.
    pasted === '' || pasted === activeCustomKey?.trim()
      ? null
      : { id: null, label: 'Custom community', key: pasted };
  return { hasSwitchableSlot, resolvedSelectedId, switchTarget };
}

/** Where the key handed to `initialize()` came from — provenance, not community name. */
export function apiKeySourceLabel(config: DemoConfig): string {
  if (config.apiKeySource === 'custom') return 'Custom (pasted)';
  const named = injectedApiKeys.find((k) => k.id === config.selectedKeyId);
  if (named) return `Demo (${named.id})`;
  return hasInjectedApiKey ? 'Demo (.env)' : 'None injected';
}

/** The server env the build is actually routed to. */
export const buildServerEnv: ServerEnv = octopusIsProdServer
  ? 'prod'
  : 'custom';
