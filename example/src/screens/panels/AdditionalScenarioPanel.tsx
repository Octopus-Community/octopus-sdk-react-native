import { useEffect, useState } from 'react';
import { Text, View, Switch, Alert } from 'react-native';
import * as Octopus from '@octopus-community/react-native';
import { PillButton } from '../../components/PillButton';
import { PresetButton } from '../../components/PresetButton';
import { KeyValueCard } from '../../components/KeyValueCard';
import { ScenarioResultPanel } from '../../components/ScenarioResultPanel';
import { ScenarioRunButton } from '../../components/ScenarioRunButton';
import { TextParamField } from '../../components/ScenarioParamField';
import { LocalizedLabelEditor } from '../../components/LocalizedLabelEditor';
import type { CommunityPresentationMode } from '../../components/CommunityPresentation';
import type { ScenarioId } from '../../scenarios/catalog';
import type { ExposeClientUserIdOverride } from '../../scenarios/unifiedProfile';
import { useScenarioRun } from '../../debug/useScenarioRun';
import {
  BUNDLED_SAMPLE_IMAGE_NAME,
  REMOTE_SAMPLE_IMAGE_URL,
} from '../../scenarios/sampleImage';
import {
  buildLocalizedLabel,
  describeBridgeError,
  initialLocalizedLabelForm,
} from '../../scenarios/localizedLabel';
import { formatSDKEvent } from '../../utils/formatSDKEvent';
import { redactApiKeys } from '../../config/apiKeyMask';
import { chromeColors } from '../../theme/branding';
import { sampleTypography } from '../../theme/tokens';

// The per-call counterpart of App.tsx's global `useBridgeShareTokenProvider`. Like it, it
// carries no secret and no signing code: a real host asks its backend. It replays the optional
// hand-supplied OCTOPUS_BRIDGE_SHARE_TOKEN, or declines, which sends the post unsigned.
const perCallSigner =
  (label: string): Octopus.BridgeShareTokenProvider =>
  async (bridgeFingerprint) => {
    const presignedToken = process.env.OCTOPUS_BRIDGE_SHARE_TOKEN;
    // Logged as a length only — a fingerprint identifies the exact content being published.
    console.log(
      `Octopus bridge share (per-call, ${label}): ${
        presignedToken ? 'signing' : 'declining'
      } a ${bridgeFingerprint.length}-char fingerprint`
    );
    return presignedToken || null;
  };

export const ADDITIONAL_SCENARIOS: ScenarioId[] = [
  'unifiedProfile',
  'groups',
  'refreshEntitlements',
  'bridge',
  'groupAccessDenied',
  'events',
  'trackABTests',
  'forceOctopusABTests',
  'fullscreen',
  'modal',
  'sheet',
];

export function AdditionalScenarioPanel({
  id,
  isDark,
  onOpenPresentation,
  onVerifyInCommunity,
  onUnifiedProfileChange,
  unifiedProfileEnabled,
  exposeClientUserIdOverride,
  onExposeClientUserIdOverrideChange,
}: {
  id: ScenarioId;
  isDark: boolean;
  onOpenPresentation: (mode: CommunityPresentationMode) => void;
  onVerifyInCommunity: () => void;
  onUnifiedProfileChange: (enabled: boolean) => Promise<void>;
  unifiedProfileEnabled: boolean;
  exposeClientUserIdOverride: ExposeClientUserIdOverride;
  onExposeClientUserIdOverrideChange: (
    next: ExposeClientUserIdOverride
  ) => Promise<void>;
}) {
  const chrome = chromeColors(isDark);
  const [state, run] = useScenarioRun(id);
  const [groups, setGroups] = useState<Octopus.OctopusGroup[]>([]);
  const [deniedGroup, setDeniedGroup] = useState<string | null>(null);
  const [callbackEnabled, setCallbackEnabled] = useState(false);
  const [backendExpanded, setBackendExpanded] = useState(false);
  const [objectId, setObjectId] = useState('rn-sample-product');
  const [perCallSigning, setPerCallSigning] = useState(false);
  const [buttonLabel, setButtonLabel] = useState(() =>
    initialLocalizedLabelForm('View product')
  );
  // The bridge presets' call, with the error code — and the language a per-language label
  // error names — in the result line, not only the message.
  const fetchOrCreateBridgePost = async (
    ...args: Parameters<typeof Octopus.fetchOrCreateClientObjectRelatedPost>
  ) => {
    try {
      return await Octopus.fetchOrCreateClientObjectRelatedPost(...args);
    } catch (e) {
      throw new Error(describeBridgeError(e));
    }
  };
  const [groupId, setGroupId] = useState('');
  const [sdkEvents, setSdkEvents] = useState<
    { title: string; details: string }[]
  >([]);
  useEffect(() => {
    if (id !== 'events') return;
    const subscription = Octopus.addSDKEventListener((event) => {
      const summary = formatSDKEvent(event);
      setSdkEvents((previous) =>
        [
          { title: summary.title, details: redactApiKeys(summary.details) },
          ...previous,
        ].slice(0, 30)
      );
    });
    return () => subscription.remove();
  }, [id]);
  const busy = state.status === 'running';
  useEffect(() => {
    if (id !== 'groupAccessDenied' || !callbackEnabled) return;
    return Octopus.setGroupAccessDeniedCallback((value) => {
      setDeniedGroup(value);
      Alert.alert(
        'Group access denied',
        'The host received access denial for this group.'
      );
    });
  }, [id, callbackEnabled]);

  const preset = (
    label: string,
    action: () => Promise<unknown>,
    index: number
  ) => (
    <PresetButton
      key={index}
      testID={`qa-preset-${id}-${index}`}
      label={label}
      isDark={isDark}
      disabled={busy}
      onPress={() =>
        run(action, (value) =>
          value === undefined ? 'Applied' : JSON.stringify(value)
        )
      }
    />
  );
  const note = (text: string) => (
    <Text style={[sampleTypography.callout, { color: chrome.textSecondary }]}>
      {text}
    </Text>
  );
  const result = (
    <ScenarioResultPanel
      testID={`${id}-result`}
      isDark={isDark}
      state={state}
    />
  );
  const verify = (
    <PillButton
      testID="scenario-verify-in-community"
      label="Verify in Community"
      variant="secondary"
      isDark={isDark}
      onPress={onVerifyInCommunity}
    />
  );

  if (id === 'unifiedProfile')
    return (
      <>
        {note(
          "Unified Profile needs both the community's backend flag and a host profile callback. Turn it on to force the flag and wire the sample's Client profile screen: members with an app id open there, and members without one open Octopus Activity. Turn it off to clear the override and remove the callback, restoring native profiles."
        )}
        <Text style={[sampleTypography.body, { color: chrome.text }]}>
          Unified profile
        </Text>
        {note(
          unifiedProfileEnabled
            ? 'Profile taps open Client profile'
            : 'Profile taps open native profiles'
        )}
        <Switch
          testID="unified-profile-switch"
          accessibilityLabel="Unified profile"
          value={unifiedProfileEnabled}
          disabled={busy}
          onValueChange={(enabled) =>
            run(() => onUnifiedProfileChange(enabled), 'Applied')
          }
        />
        {note(
          'Applies the flag and host callback live; the connected user is preserved.'
        )}
        <PillButton
          testID="unified-profile-backend-override"
          label="Backend flag override"
          variant="secondary"
          isDark={isDark}
          onPress={() => setBackendExpanded(!backendExpanded)}
        />
        {backendExpanded && (
          <>
            {note(
              'Inspect either condition independently. The React Native sample applies this override without restarting the SDK.'
            )}
            {(
              [
                ['Use backend value', null],
                ['Force flag on', true],
                ['Force flag off', false],
              ] as const
            ).map(([label, value], index) => (
              <PillButton
                key={label}
                testID={
                  [
                    'expose-override-backend',
                    'expose-override-on',
                    'expose-override-off',
                  ][index]
                }
                label={label}
                variant={
                  exposeClientUserIdOverride === value ? 'primary' : 'secondary'
                }
                isDark={isDark}
                disabled={busy}
                onPress={() =>
                  run(
                    () => onExposeClientUserIdOverrideChange(value),
                    'Applied'
                  )
                }
              />
            ))}
          </>
        )}
        {result}
        {verify}
      </>
    );

  if (id === 'groups')
    return (
      <>
        {preset(
          'Preset 1 · Fetch groups',
          async () => {
            const value = await Octopus.fetchGroups();
            setGroups(value);
            return value;
          },
          1
        )}
        <KeyValueCard
          title="Live state"
          isDark={isDark}
          rows={groups.map((group) => ({
            label: group.name,
            value: `${group.isFollowed ? 'followed' : 'not followed'} · ${group.canAccess ? 'accessible' : 'locked'}`,
          }))}
        />
        {groups.map((group) => (
          <PillButton
            key={group.id}
            testID={`group-follow-${group.id}`}
            label={`${group.isFollowed ? 'Unfollow' : 'Follow'} ${group.name}`}
            variant="secondary"
            isDark={isDark}
            disabled={busy || !group.canChangeFollowStatus}
            onPress={() =>
              run(async () => {
                if (group.isFollowed) await Octopus.unfollowGroup(group.id);
                else await Octopus.followGroup(group.id);
                setGroups(await Octopus.fetchGroups());
              }, 'Follow state refreshed')
            }
          />
        ))}
        {result}
        {verify}
      </>
    );

  if (id === 'refreshEntitlements')
    return (
      <>
        {note(
          'Refreshes the entitlements of the connected demo user from the server. Change them on the Account screen first.'
        )}
        {result}
        <ScenarioRunButton
          testID="qa-preset-refreshEntitlements-1"
          state={state}
          isDark={isDark}
          onPress={() =>
            run(() => Octopus.refreshEntitlements(), 'Entitlements refreshed')
          }
        />
        {verify}
      </>
    );

  if (id === 'bridge')
    return (
      <>
        <TextParamField
          label="Object ID"
          testID="qa-param-bridge-objectId"
          value={objectId}
          onChangeText={setObjectId}
          isDark={isDark}
        />
        {note(
          'Looks up or creates the demo product post on the configured community. Run only with a demo community.'
        )}
        <Text style={[sampleTypography.body, { color: chrome.text }]}>
          Per-call signer
        </Text>
        <Switch
          testID="bridge-per-call-signing-switch"
          accessibilityLabel="Use a per-call token provider"
          value={perCallSigning}
          onValueChange={setPerCallSigning}
        />
        {note(
          perCallSigning
            ? 'Presets 1 and 2 pass their own tokenProvider: it replays OCTOPUS_BRIDGE_SHARE_TOKEN, or declines (unsigned post). The Metro log names the call that signed.'
            : 'Presets 1 and 2 use the global signer registered in App.tsx.'
        )}
        <LocalizedLabelEditor
          testID="sample-param-bridge-button"
          title="Button label"
          form={buttonLabel}
          onChange={setButtonLabel}
          isDark={isDark}
        />
        {note(
          'The button label is taken when the post is created only: use Preset 2 or 3 (a fresh object id) to see a changed label.'
        )}
        {result}
        <ScenarioRunButton
          testID="qa-preset-bridge-1"
          state={state}
          isDark={isDark}
          disabled={!objectId.trim()}
          onPress={() =>
            run(
              async () => {
                const post = await fetchOrCreateBridgePost(
                  {
                    objectId: objectId.trim(),
                    text: 'Sample product discussion',
                    viewObjectButton: buildLocalizedLabel(buttonLabel),
                  },
                  perCallSigning ? perCallSigner('preset 1') : undefined
                );
                await Octopus.openUI({
                  initialScreen: { type: 'post', postId: post.id },
                });
                return post;
              },
              (post) => `Opened post ${post.id}`
            )
          }
        />
        <PresetButton
          testID="qa-preset-bridge-2"
          label="Preset 2 · Random product (fresh objectId each tap)"
          isDark={isDark}
          disabled={!objectId.trim()}
          onPress={() =>
            run(
              async () => {
                // A fresh object id always creates the post, so its medias are always sent:
                // a remote image, then a bundled one, as in the other samples.
                const post = await fetchOrCreateBridgePost(
                  {
                    objectId: `${objectId.trim()}-${Date.now()}`,
                    text: 'Sample product discussion, with photos',
                    medias: [
                      { type: 'remoteImage', url: REMOTE_SAMPLE_IMAGE_URL },
                      { type: 'localImage', uri: BUNDLED_SAMPLE_IMAGE_NAME },
                    ],
                    viewObjectButton: buildLocalizedLabel(buttonLabel),
                  },
                  perCallSigning ? perCallSigner('preset 2') : undefined
                );
                await Octopus.openUI({
                  initialScreen: { type: 'post', postId: post.id },
                });
                return post;
              },
              (post) => `Opened post ${post.id}`
            )
          }
        />
        <PresetButton
          testID="qa-preset-bridge-3"
          label="Preset 3 · Two concurrent calls, one signer each"
          isDark={isDark}
          disabled={!objectId.trim()}
          onPress={() =>
            run(
              async () => {
                // Two fresh objects with photos, created at the same time, each with its own
                // tokenProvider: in a pictures-off community each signer is asked once, for its
                // own call only, and the global signer is never asked.
                const stamp = Date.now();
                const create = (label: string) =>
                  fetchOrCreateBridgePost(
                    {
                      objectId: `${objectId.trim()}-${label}-${stamp}`,
                      text: `Sample product discussion (${label})`,
                      medias: [
                        { type: 'remoteImage', url: REMOTE_SAMPLE_IMAGE_URL },
                      ],
                      viewObjectButton: buildLocalizedLabel(buttonLabel),
                    },
                    perCallSigner(label)
                  );
                return Promise.all([create('call A'), create('call B')]);
              },
              ([first, second]) => `Created posts ${first.id} and ${second.id}`
            )
          }
        />
      </>
    );

  if (id === 'groupAccessDenied')
    return (
      <>
        {note(
          'Enable the callback, then open a group the demo user cannot access. The callback reports the refused group here.'
        )}
        <Switch
          testID="group-access-denied-switch"
          accessibilityLabel="Handle group access denied"
          value={callbackEnabled}
          onValueChange={setCallbackEnabled}
        />
        <PresetButton
          testID="qa-preset-groupAccessDenied-1"
          label="Preset 1 · Register callback"
          isDark={isDark}
          onPress={() => setCallbackEnabled(true)}
        />
        <PresetButton
          testID="qa-preset-groupAccessDenied-2"
          label="Preset 2 · Unregister callback"
          isDark={isDark}
          onPress={() => setCallbackEnabled(false)}
        />
        <TextParamField
          label="Group ID"
          testID="qa-param-groupAccessDenied-groupId"
          value={groupId}
          onChangeText={setGroupId}
          isDark={isDark}
        />
        <KeyValueCard
          title="Live state"
          isDark={isDark}
          rows={[{ label: 'Last denied group', value: deniedGroup ?? '—' }]}
        />
        {result}
        <ScenarioRunButton
          testID="group-access-denied-open-group"
          state={state}
          isDark={isDark}
          disabled={!groupId.trim()}
          onPress={() =>
            run(
              () =>
                Octopus.openUI({
                  initialScreen: { type: 'group', groupId: groupId.trim() },
                }),
              'Opened group'
            )
          }
        />
      </>
    );

  if (id === 'events')
    return (
      <>
        <Text style={[sampleTypography.body, { color: chrome.text }]}>
          Live state
        </Text>
        {sdkEvents.map((event, index) => (
          <View key={index}>
            <Text style={[sampleTypography.label, { color: chrome.text }]}>
              {event.title}
            </Text>
            {note(event.details)}
          </View>
        ))}
        {note(
          'Listening to SDK events while this scenario is open. Use the community, then come back to inspect them.'
        )}
        <PresetButton
          testID="qa-preset-events-1"
          label="Clear log"
          isDark={isDark}
          onPress={() => setSdkEvents([])}
        />
        {verify}
      </>
    );

  if (id === 'trackABTests' || id === 'forceOctopusABTests')
    return (
      <>
        {id === 'trackABTests' &&
          note(
            'trackCommunityAccess reports the host cohort for analytics only; it does not grant or deny SDK access.'
          )}
        {preset(
          'Preset 1 · Grant',
          () =>
            id === 'trackABTests'
              ? Octopus.trackCommunityAccess(true)
              : Octopus.overrideCommunityAccess(true),
          1
        )}
        {preset(
          'Preset 2 · Deny',
          () =>
            id === 'trackABTests'
              ? Octopus.trackCommunityAccess(false)
              : Octopus.overrideCommunityAccess(false),
          2
        )}
        {id === 'forceOctopusABTests' &&
          note(
            'The React Native bridge accepts true or false; clearing the cohort override is not exposed.'
          )}
        {result}
        {id === 'forceOctopusABTests' && verify}
      </>
    );

  if (id === 'fullscreen' || id === 'modal' || id === 'sheet')
    return (
      <>
        {result}
        <ScenarioRunButton
          testID={`qa-preset-${id}-1`}
          state={state}
          isDark={isDark}
          onPress={() =>
            run(async () => onOpenPresentation(id), `Opened ${id}`)
          }
        />
      </>
    );
  return null;
}
