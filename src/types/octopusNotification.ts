/**
 * Represents a push notification from the Octopus Community platform.
 *
 * Use `isOctopusNotification` to check that a payload originates from
 * Octopus, then `getOctopusNotification` to parse it into this typed
 * object. `rawPayload` retains the full source key/value map and is
 * forwarded to native iOS as the `notificationUserInfo` so new fields
 * the backend ships in the future pass through transparently.
 */
export type OctopusNotification = {
  title: string;
  body: string;
  linkPath: string;
  postId?: string;
  commentId?: string;
  replyId?: string;
  rawPayload: Record<string, string>;
};

/**
 * Returns the inner map holding the Octopus keys. For an APNs-shaped
 * payload (with a `data` envelope) this is the `data` sub-map; otherwise
 * it is the payload itself (Android FCM shape).
 */
function octopusKeysFrom(payload: Record<string, any>): Record<string, any> {
  const data = payload.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  return payload;
}

function readString(
  source: Record<string, any>,
  key: string
): string | undefined {
  const v = source[key];
  return typeof v === 'string' ? v : undefined;
}

function apsAlert(payload: Record<string, any>): {
  title?: string;
  body?: string;
} {
  const aps = payload.aps;
  if (!aps || typeof aps !== 'object') return {};
  const alert = aps.alert;
  if (!alert || typeof alert !== 'object') return {};
  const out: { title?: string; body?: string } = {};
  if (typeof alert.title === 'string') out.title = alert.title;
  if (typeof alert.body === 'string') out.body = alert.body;
  return out;
}

/**
 * Parses a push-notification payload into an `OctopusNotification`.
 *
 * Accepts both shapes:
 * - Android FCM (`RemoteMessage.data`): flat map with Octopus keys at top level
 * - iOS APNs `userInfo`: nested map with `aps` + a `data` envelope
 *
 * Returns null when `link_path` is missing (only field navigation requires).
 */
export function fromMap(
  payload: Record<string, any>
): OctopusNotification | null {
  const source = octopusKeysFrom(payload);
  const linkPath = source.link_path;
  if (typeof linkPath !== 'string' || linkPath.length === 0) return null;

  const alert = apsAlert(payload);
  const title = readString(source, 'title') ?? alert.title ?? '';
  const body = readString(source, 'body') ?? alert.body ?? '';

  const rawPayload: Record<string, string> = {};
  for (const [k, v] of Object.entries(source)) {
    if (typeof v === 'string') rawPayload[k] = v;
  }
  if (title.length > 0 && rawPayload.title === undefined)
    rawPayload.title = title;
  if (body.length > 0 && rawPayload.body === undefined) rawPayload.body = body;

  return {
    title,
    body,
    linkPath,
    postId: readString(source, 'post_id'),
    commentId: readString(source, 'comment_id'),
    replyId: readString(source, 'reply_id'),
    rawPayload: Object.freeze(rawPayload),
  };
}

/**
 * True when the payload's `is_octopus_notification` flag is set to true
 * (string `"true"` or boolean `true`), in either flat or `data`-nested shape.
 */
export function isOctopusFlag(payload: Record<string, any>): boolean {
  const source = octopusKeysFrom(payload);
  const v = source.is_octopus_notification;
  return v === 'true' || v === true;
}
