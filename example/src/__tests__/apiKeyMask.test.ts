import {
  maskApiKey,
  rememberApiKey,
  redactApiKeys,
  formatRedactedError,
} from '../config/apiKeyMask';
import { apiKeySourceLabel, resolveApiKey } from '../config/demoConfig';
import type { DemoConfig } from '../config/demoConfig';
import { debugLog } from '../debug/debugLog';

it.each([
  ['', '—'],
  ['  ', '—'],
  ['short', '••••'],
  ['123456789', '••••'],
  ['1234567890', '1234…7890'],
  ['abcd1234efgh5678', 'abcd…5678'],
])('matches the Android mask for %j', (key, expected) => {
  expect(maskApiKey(key)).toBe(expected);
});

it('describes custom and demo sources with Android wording', () => {
  const config: DemoConfig = {
    apiKeySource: 'custom',
    customApiKey: 'test1111111111112345',
    selectedKeyId: null,
    userId: 'demo-user',
    theme: 'system',
    serverEnv: 'custom',
  };
  expect(apiKeySourceLabel(config)).toBe('Custom · test…2345');
  expect(apiKeySourceLabel({ ...config, apiKeySource: 'demo' })).toBe(
    'Demo preset · None injected'
  );
  expect(resolveApiKey(config)).toBe(config.customApiKey);
});

it('masks known keys in arbitrary event/error text and both clipboard log sources', () => {
  const previous = rememberApiKey('old11111111111111234');
  const current = rememberApiKey('new11111111111115678');
  debugLog.clear();
  debugLog.event(`event ${previous}`, `{"message":"failed with ${current}"}`);
  debugLog.apiCall('initialize', `Rejected ${previous}, then ${current}`);
  for (const output of [JSON.stringify(debugLog.all), debugLog.exportJson()]) {
    expect(output).not.toContain(previous);
    expect(output).not.toContain(current);
    expect(output).toContain(maskApiKey(previous));
    expect(output).toContain(maskApiKey(current));
  }
  debugLog.clear();
});

it('also masks unresolved keys in structured payloads, without masking a mask again', () => {
  const key = 'fake1111111111119876';
  const payload = `{"nested":{"apiKey":"${key}"},"api_key":"${key}"} apiKey=${key}`;
  const masked = redactApiKeys(payload);
  expect(masked).not.toContain(key);
  expect(masked.match(/fake…9876/g)).toHaveLength(3);
  expect(redactApiKeys(masked)).toBe(masked);
});

it.each([
  'apiKey: "%s"',
  "apiKey: '%s'",
  'api_key=%s',
  'x-api-key=%s',
  'X-API-KEY: "%s"',
  'Invalid API key %s',
  'Invalid API key "%s"',
  '{"API key":"%s"}',
  String.raw`{\"apiKey\":\"%s\"}`,
  String.raw`{\\\"apiKey\\\":\\\"%s\\\"}`,
  '{"customApiKey":"%s"}',
  'customApiKey=%s',
  String.raw`{\"customApiKey\":\"%s\"}`,
])('redacts unresolved keys in %s and keeps redaction idempotent', (format) => {
  for (const key of ['tiny', '1234567890', 'fake2222222222229876']) {
    const payload = format.replace('%s', key);
    const masked = redactApiKeys(payload);
    expect(masked).not.toContain(key);
    expect(masked).toBe(format.replace('%s', maskApiKey(key)));
    expect(redactApiKeys(masked)).toBe(masked);
  }
});

it('preserves error names, codes and stack frames while masking every diagnostic field', () => {
  const key = rememberApiKey('diag2222222222229876');
  const error = Object.assign(new Error(`Rejected ${key}`), {
    name: 'ConnectUserError',
    code: 'INVALID_TOKEN',
    stack: `ConnectUserError: Rejected ${key}\n    at connectUser (${key}:10:2)`,
  });
  const output = formatRedactedError(error);
  expect(output).toContain(
    `ConnectUserError: Rejected ${maskApiKey(key)} (INVALID_TOKEN)`
  );
  expect(output).toContain(`at connectUser (${maskApiKey(key)}:10:2)`);
  expect(output).not.toContain(key);
  expect(formatRedactedError(`Invalid API key ${key}`)).not.toContain(key);
  error.stack = '';
  expect(formatRedactedError(error)).toBe(
    `ConnectUserError: Rejected ${maskApiKey(key)} (INVALID_TOKEN)`
  );
  expect(
    formatRedactedError({ message: `Rejected ${key}`, code: 'INVALID_TOKEN' })
  ).toBe(`Error: Rejected ${maskApiKey(key)} (INVALID_TOKEN)`);
});

it.each([
  ['', 'slotA~Client A~demo2222222222229876', 'slotA', 'Demo preset · slotA'],
  ['demo2222222222229876', '', null, 'Demo preset · Default'],
  ['', '', null, 'Demo preset · None injected'],
])(
  'describes injected key provenance without repeating the community label',
  (key, slots, selectedKeyId, expected) => {
    jest.replaceProperty(process, 'env', {
      OCTOPUS_COMMUNITY_API_KEY: key,
      OCTOPUS_NAMED_API_KEYS: slots,
    });
    try {
      jest.isolateModules(() => {
        const { apiKeySourceLabel: label } = jest.requireActual<
          typeof import('../config/demoConfig')
        >('../config/demoConfig');
        expect(
          label({
            apiKeySource: 'demo',
            customApiKey: '',
            selectedKeyId,
            userId: 'demo-user',
            theme: 'system',
            serverEnv: 'custom',
          })
        ).toBe(expected);
      });
    } finally {
      jest.restoreAllMocks();
    }
  }
);
