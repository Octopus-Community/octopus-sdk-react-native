/** Fully hides short values; longer values keep the Android sample's four-character ends. */
export function maskApiKey(apiKey: string): string {
  if (apiKey.trim() === '') return '—';
  if (apiKey.length < 10) return '••••';
  return `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`;
}

// Keep previous keys too: callbacks from a session being replaced can still arrive.
const sessionKeys = new Set<string>();

/** Registers a resolved key before calling the SDK, so errors and events can be masked. */
export function rememberApiKey(apiKey: string): string {
  if (apiKey.trim() !== '') sessionKeys.add(apiKey);
  return apiKey;
}

/** Removes key material before a diagnostic is displayed, recorded or exported. */
export function redactApiKeys(text: string): string {
  let masked = text;
  // Longest first in case one key is a prefix of another.
  for (const key of [...sessionKeys].sort((a, b) => b.length - a.length)) {
    masked = masked.split(key).join(maskApiKey(key));
  }
  // Also cover unresolved keys named in JSON (including escaped quotes), headers,
  // assignments and SDK error text. Config fields may prefix apiKey, e.g. customApiKey.
  return masked.replace(
    /((?:(?:\\{0,4}["'])?\b(?:[\w$]{0,64}apiKey|api_key|x-api-key|API\s+key)\b(?:\\{0,4}["'])?\s*[=:]\s*(?:\\{0,4}["'])?|\bInvalid\s+API\s+key\s+["']?))([^"'\s\\,;{}[\]()<>]+)/gi,
    (_match, prefix: string, key: string) =>
      `${prefix}${key.includes('…') || key === '••••' ? key : maskApiKey(key)}`
  );
}

/** Keeps useful error diagnostics without handing a raw SDK error to the console. */
export function formatRedactedError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    const name =
      'name' in error && typeof error.name === 'string' ? error.name : 'Error';
    const code = 'code' in error ? ` (${String(error.code)})` : '';
    const summary = `${name}: ${error.message}${code}`;
    const stack =
      'stack' in error && typeof error.stack === 'string' ? error.stack : '';
    return redactApiKeys(stack ? `${summary}\n${stack}` : summary);
  }
  return redactApiKeys(String(error));
}
