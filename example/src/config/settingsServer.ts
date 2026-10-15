import type { ApiServer } from '@octopus-community/react-native';
import {
  DEMO_HOST,
  PRODUCTION_HOST,
  octopusApiServer,
  parseApiHost,
  type DemoConfig,
} from './demoConfig';

/** Runtime selection overrides the build host; restored configs use the build default. */
export function resolveConfigServer(
  config?: Pick<DemoConfig, 'apiServer'> | null,
  buildServer: ApiServer = octopusApiServer
): ApiServer {
  return config?.apiServer ?? buildServer;
}

/** Server selection is session-only: persist only when restore will use the same endpoint. */
export function canPersistConfigServer(
  config: Pick<DemoConfig, 'apiServer'>,
  buildServer: ApiServer = octopusApiServer
): boolean {
  const server = resolveConfigServer(config, buildServer);
  return (
    buildServer.host !== PRODUCTION_HOST &&
    server.host === buildServer.host &&
    server.port === buildServer.port
  );
}

export function resolveSettingsServer(
  choice: 'demo' | 'prod' | 'custom',
  host: string
): ApiServer | null {
  if (choice !== 'custom')
    return { host: choice === 'prod' ? PRODUCTION_HOST : DEMO_HOST };
  const parsed = parseApiHost(host);
  if (
    !parsed ||
    !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[a-f0-9:]+\])$/i.test(
      parsed.host
    ) ||
    (parsed.port !== undefined && (parsed.port < 1 || parsed.port > 65535))
  )
    return null;
  return parsed;
}
export function settingsServerLabel(host: string): string {
  return host === DEMO_HOST
    ? 'Demo'
    : host === PRODUCTION_HOST
      ? 'Prod'
      : 'Custom';
}
