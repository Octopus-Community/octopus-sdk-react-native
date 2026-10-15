import {
  canPersistConfigServer,
  resolveConfigServer,
  resolveSettingsServer,
} from '../config/settingsServer';
import { handlesSampleUrl } from '../config/hostIntegration';
import { filterConsoleEntries } from '../debug/consoleFilter';

it('resolves explicit server choices and validates bridge host/port shapes', () => {
  expect(resolveSettingsServer('demo', '')).toEqual({
    host: 'api-demo2.8pus.io',
  });
  expect(resolveSettingsServer('prod', '')).toEqual({ host: 'api.8pus.io' });
  expect(resolveSettingsServer('custom', 'https://demo.example:8443/')).toEqual(
    { host: 'demo.example', port: 8443 }
  );
  for (const invalid of [
    '',
    'user@host',
    'demo.example:99999',
    'demo.example:0',
    'demo.example:no-port',
  ])
    expect(resolveSettingsServer('custom', invalid)).toBeNull();
});
it('keeps the contact rule distinct from app-owned and SDK-owned URL handling', () => {
  expect(
    handlesSampleUrl(
      'sampleRule',
      'https://www.octopuscommunity.com/contact?source=sample'
    )
  ).toBe(true);
  for (const url of [
    'https://www.octopuscommunity.com/contact-other',
    'https://www.octopuscommunity.com.evil.example/contact',
    'not a url',
  ])
    expect(handlesSampleUrl('sampleRule', url)).toBe(false);
  expect(handlesSampleUrl('inAppWebView', 'https://example.com')).toBe(true);
  expect(
    handlesSampleUrl(
      'defaultBrowser',
      'https://www.octopuscommunity.com/contact'
    )
  ).toBe(false);
});
it('combines case-insensitive console search with independent kind filters', () => {
  const entries = [
    { id: 1, at: 1, kind: 'event', label: 'SessionStarted', detail: 'ready' },
    { id: 2, at: 2, kind: 'state', label: 'connection', detail: 'Signed in' },
    { id: 3, at: 3, kind: 'api', label: 'initialize', detail: 'ready' },
  ] as const;
  expect(filterConsoleEntries(entries, ' READY ', ['event', 'state'])).toEqual([
    entries[0],
  ]);
  expect(filterConsoleEntries(entries, 'SIGNED', ['state'])).toEqual([
    entries[1],
  ]);
  expect(filterConsoleEntries(entries, '', [])).toEqual([]);
});

it('uses the production build host as the default server', () => {
  const buildServer = { host: 'api.8pus.io' };
  expect(resolveConfigServer(null, buildServer)).toEqual(buildServer);
  expect(resolveConfigServer({}, buildServer)).toEqual(buildServer);
  expect(
    resolveConfigServer(
      { apiServer: { host: 'api-demo2.8pus.io' } },
      buildServer
    )
  ).toEqual({ host: 'api-demo2.8pus.io' });
});

it('persists only configs that restore to the same non-production build endpoint', () => {
  const buildServer = { host: 'demo.example', port: 8443 };
  expect(resolveConfigServer({}, buildServer)).toEqual(buildServer);
  expect(canPersistConfigServer({}, buildServer)).toBe(true);
  expect(
    canPersistConfigServer({ apiServer: { ...buildServer } }, buildServer)
  ).toBe(true);
  expect(
    canPersistConfigServer({ apiServer: { host: 'demo.example' } }, buildServer)
  ).toBe(false);
  expect(
    canPersistConfigServer(
      { apiServer: { host: 'api-demo2.8pus.io' } },
      buildServer
    )
  ).toBe(false);
  expect(canPersistConfigServer({}, { host: 'api.8pus.io' })).toBe(false);
  expect(
    canPersistConfigServer(
      { apiServer: { host: 'api-demo2.8pus.io' } },
      { host: 'api.8pus.io' }
    )
  ).toBe(false);
});
