import { useEffect, useState } from 'react';
import {
  debugGetCommunityConfig,
  type OctopusDebugCommunityConfig,
} from '@octopus-community/react-native';
import { useTabVisible } from '../navigation/tabVisibility';
import { LiveConfigPanel } from './SampleRecipes';
import { maskApiKey } from '../config/apiKeyMask';

export function communityConfigRows(
  config: OctopusDebugCommunityConfig | null,
  apiKey: string
) {
  const flag = (value?: boolean) =>
    value === undefined ? '—' : value ? '✓ on' : '✗ off';
  return [
    { label: 'API key', value: maskApiKey(apiKey) },
    {
      label: 'Unified Profile (exposeClientUserId)',
      value: flag(config?.exposeClientUserId),
    },
    {
      label: 'Terms acceptance',
      value:
        config?.termsAcceptanceMode === 'explicitmulticheckbox'
          ? 'explicit · multi checkbox'
          : config?.termsAcceptanceMode === 'explicitsinglecheckbox'
            ? 'explicit · single checkbox'
            : (config?.termsAcceptanceMode ?? '—'),
    },
    {
      label: 'Force login (strong actions)',
      value: flag(config?.forceLoginOnStrongActions),
    },
    {
      label: 'Force nickname choice',
      value: flag(config?.forceNicknameChoice),
    },
    {
      label: 'Consent texts',
      value:
        config == null
          ? '—'
          : config.consentTexts == null
            ? 'SDK wordings'
            : JSON.stringify(config.consentTexts, null, 2),
    },
    { label: 'Display account age', value: flag(config?.displayAccountAge) },
  ];
}

export function useLiveCommunityConfig(ready: boolean, session: number) {
  const visible = useTabVisible();
  const [config, setConfig] = useState<OctopusDebugCommunityConfig | null>(
    null
  );
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    setConfig(null);
    if (!ready || !visible) return;
    const refresh = async () => {
      try {
        const value = await debugGetCommunityConfig();
        if (!disposed) setConfig(value);
      } catch {
        if (!disposed) setConfig(null);
      } finally {
        if (!disposed) timer = setTimeout(refresh, 2000);
      }
    };
    refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [ready, session, visible]);
  return config;
}

export function LiveCommunityConfigCard({
  isDark,
  apiKey,
  config,
}: {
  isDark: boolean;
  apiKey: string;
  config: OctopusDebugCommunityConfig | null;
}) {
  return (
    <LiveConfigPanel
      testID="live-community-config"
      title="Live community config"
      isDark={isDark}
      rows={communityConfigRows(config, apiKey)}
      explanation="What the SDK sees for the current community (backend config + any local override applied below). Updates after switchCommunity."
      note="Post, Comment, Reply, Profile lock, Gamification and Powered by Octopus are not exposed by the React Native config API."
    />
  );
}
