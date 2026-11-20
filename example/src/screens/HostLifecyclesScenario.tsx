import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  BaseNavigationContainer,
  NavigationIndependentTree,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OctopusUIView } from '@octopus-community/react-native';
import { PillButton } from '../components/PillButton';
import { PresetButton } from '../components/PresetButton';
import { ScenarioDetailFrame } from '../components/ScenarioDetailFrame';
import { sampleFixtures } from '../config/sampleFixtures';
import { useHardwareBack } from '../navigation/useHardwareBack';
import { useTabVisible } from '../navigation/tabVisibility';
import { chromeColors } from '../theme/branding';
import { sampleSpacing, sampleTypography } from '../theme/tokens';

type HostStack = {
  Scenario: undefined;
  Community: { postId: string };
  Cover: undefined;
};

const Stack = createNativeStackNavigator<HostStack>();
const PRESET_LABEL = 'Preset 3 · View detached and re-attached';

export default function HostLifecyclesScenario({
  isDark,
  isInitialized,
  onBack,
  onOpenDebug,
}: {
  isDark: boolean;
  isInitialized: boolean;
  onBack: () => void;
  onOpenDebug: () => void;
}) {
  const navigation = useNavigationContainerRef<HostStack>();
  const visible = useTabVisible();
  const chrome = chromeColors(isDark);
  const [postId, setPostId] = useState(sampleFixtures.post.text);
  const [returns, setReturns] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const coverWasPushed = useRef(false);
  const result = isRunning
    ? 'Running…'
    : returns > 0
      ? `Returned ${returns} time(s). Verify that the post and comments render and remain usable; a return count alone is not a PASS.`
      : 'Not run yet';

  useHardwareBack('overlay', () => {
    if (navigation.isReady() && navigation.canGoBack()) navigation.goBack();
    else onBack();
    return true;
  });

  const resultNode = (
    <Text
      testID="hostLifecycles-result"
      accessibilityLiveRegion="polite"
      style={[styles.text, { color: chrome.text }]}
    >
      {result}
    </Text>
  );

  return (
    // The sample retains hidden tabs. Use the core container so no additional
    // global hardware Back listener can pop this stack while its tab is hidden;
    // useHardwareBack above routes through the visibility-aware sample dispatcher.
    <View style={styles.fill}>
      <View style={styles.controls}>{resultNode}</View>
      <NavigationIndependentTree>
        <BaseNavigationContainer
          ref={navigation}
          theme={isDark ? DarkTheme : DefaultTheme}
        >
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              presentation: 'card',
              freezeOnBlur: false,
              contentStyle: { backgroundColor: chrome.screen },
            }}
          >
            <Stack.Screen name="Scenario">
              {({ navigation: stack }) => (
                <ScenarioDetailFrame
                  title="Host lifecycles"
                  isDark={isDark}
                  onBack={onBack}
                  onOpenDebug={onOpenDebug}
                >
                  <Text style={[styles.text, { color: chrome.text }]}>
                    Open the demo post, wait for its comments, then push a plain
                    host screen and pop it. Repeat at least three times. The
                    community stays mounted in React while native-stack detaches
                    and re-attaches its native screen.
                  </Text>
                  <Text style={[styles.text, { color: chrome.text }]}>
                    Post ID (demo community)
                  </Text>
                  <TextInput
                    testID="hostLifecycles-post-edit"
                    accessibilityLabel="Host lifecycles post ID"
                    value={postId}
                    onChangeText={setPostId}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.input,
                      { color: chrome.text, borderColor: chrome.border },
                    ]}
                  />
                  {!isInitialized && (
                    <Text style={[styles.text, { color: chrome.text }]}>
                      Initialize the SDK with a demo community before running.
                    </Text>
                  )}
                  <PresetButton
                    testID="qa-preset-hostLifecycles-3"
                    label={PRESET_LABEL}
                    isDark={isDark}
                    disabled={!isInitialized || !postId.trim()}
                    onPress={() => {
                      coverWasPushed.current = false;
                      setReturns(0);
                      setIsRunning(true);
                      stack.push('Community', { postId: postId.trim() });
                    }}
                  />
                </ScenarioDetailFrame>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Community"
              listeners={{
                transitionEnd: ({ data }) => {
                  // Community remains in state after a JS pop. Cover does not, so
                  // its closing event cannot reach a per-screen listener reliably.
                  if (data.closing || !coverWasPushed.current) return;
                  coverWasPushed.current = false;
                  setReturns((n) => n + 1);
                  setIsRunning(false);
                },
              }}
            >
              {({ navigation: stack, route }) => (
                <View style={styles.fill}>
                  <View style={styles.controls}>
                    <PillButton
                      testID="hostLifecycles-push-button"
                      label="Push host screen"
                      isDark={isDark}
                      onPress={() => {
                        coverWasPushed.current = true;
                        setIsRunning(true);
                        stack.push('Cover');
                      }}
                    />
                    <PillButton
                      testID="hostLifecycles-back-button"
                      label="Back to scenario"
                      isDark={isDark}
                      onPress={() => stack.goBack()}
                    />
                  </View>
                  <View style={styles.fill}>
                    {/* Never key this view by focus or the return counter: that
                      would remount it instead of exercising native re-attach. */}
                    <OctopusUIView
                      initialScreen={{
                        type: 'post',
                        postId: route.params.postId,
                      }}
                      isVisible={visible}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                </View>
              )}
            </Stack.Screen>
            <Stack.Screen name="Cover">
              {({ navigation: stack }) => (
                <View style={styles.controls}>
                  <Text style={[styles.text, { color: chrome.text }]}>
                    Plain host screen. The community remains underneath this
                    opaque native-stack screen. Pop to re-attach it.
                  </Text>
                  <PillButton
                    testID="hostLifecycles-pop-button"
                    label="Pop host screen"
                    isDark={isDark}
                    onPress={() => stack.goBack()}
                  />
                </View>
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </BaseNavigationContainer>
      </NavigationIndependentTree>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  controls: { padding: sampleSpacing.gutter, gap: sampleSpacing.xs },
  text: { ...sampleTypography.callout, marginVertical: sampleSpacing.xs },
  input: { borderWidth: 1, borderRadius: 8, padding: sampleSpacing.sm },
});
