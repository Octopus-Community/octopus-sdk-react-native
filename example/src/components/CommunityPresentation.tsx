import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Pressable,
  PanResponder,
  StyleSheet,
  Platform,
  NativeModules,
  findNodeHandle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OctopusUIView } from '@octopus-community/react-native';
import { chromeColors } from '../theme/branding';
import { sampleRadius, sampleSize } from '../theme/tokens';
import { statusBarStyleForSurface } from '../theme/statusBar';

export type CommunityPresentationMode =
  | 'tab'
  | 'fullscreen'
  | 'modal'
  | 'sheet';
export function shouldDismissSheet(
  distance: number,
  velocity: number
): boolean {
  return distance > 72 || (distance > 12 && velocity > 0.8);
}

/** Host-owned containers around the same native embedded view. */
export function CommunityPresentation({
  mode,
  isDark,
  communityBackground,
  session,
  interceptUrls,
  interceptProfileTaps,
  onClose,
  onDismiss,
  overlays,
}: {
  mode: 'modal' | 'sheet' | null;
  isDark: boolean;
  communityBackground?: string;
  session: number;
  interceptUrls: boolean;
  interceptProfileTaps: boolean;
  onClose: () => void;
  onDismiss: () => void;
  overlays: ReactNode;
}) {
  const chrome = chromeColors(isDark);
  const surfaceColor = communityBackground ?? chrome.background;
  const modalRef = useRef<Modal>(null);
  const modalShown = useRef(false);
  const statusBarStyle =
    mode === 'modal' ? statusBarStyleForSurface(surfaceColor, isDark) : 'light';
  const applyModalStatusBar = useCallback(() => {
    if (Platform.OS !== 'android' || mode === null || !modalShown.current)
      return;
    const tag = findNodeHandle(modalRef.current);
    if (tag !== null)
      NativeModules.SampleModalStatusBar.setStyle(
        tag,
        statusBarStyle === 'dark' ? 'dark-content' : 'light-content'
      );
  }, [mode, statusBarStyle]);
  useEffect(() => {
    if (mode === null) modalShown.current = false;
    else applyModalStatusBar();
  }, [mode, applyModalStatusBar]);
  const backdropColor = mode === 'sheet' ? 'rgba(0,0,0,0.4)' : surfaceColor;
  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          // A tap uses this responder too; Pressable would replace the pan handlers.
          const tapped =
            Math.abs(gesture.dx) <= 8 &&
            Math.abs(gesture.dy) <= 8 &&
            Math.abs(gesture.vx) < 0.8 &&
            Math.abs(gesture.vy) < 0.8;
          const draggedDown =
            gesture.dy > 0 && gesture.dy > Math.abs(gesture.dx);
          if (
            tapped ||
            (draggedDown && shouldDismissSheet(gesture.dy, gesture.vy))
          )
            onClose();
        },
      }),
    [onClose]
  );
  return (
    <>
      <Modal
        ref={modalRef}
        visible={mode !== null}
        transparent={mode === 'sheet'}
        animationType="slide"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onShow={() => {
          modalShown.current = true;
          // Apply after RN copies the Activity appearance into its new Dialog.
          applyModalStatusBar();
        }}
        // The bridge has no per-view back command. Android Dialog Back closes here;
        // the SDK's own leading icon still pops its stack before onBackRequested.
        onRequestClose={onClose}
        onDismiss={onDismiss}
      >
        {mode !== null && (
          <View
            style={[
              styles.window,
              {
                backgroundColor: backdropColor,
              },
            ]}
          >
            {mode === 'sheet' && (
              <Pressable
                testID="community-sheet-scrim"
                style={styles.scrim}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close community sheet"
              />
            )}
            <SafeAreaView
              edges={['top', 'bottom', 'left', 'right']}
              style={[
                styles.surface,
                mode === 'sheet' && styles.sheet,
                { backgroundColor: surfaceColor },
              ]}
            >
              {mode === 'sheet' && (
                <View
                  testID="community-sheet-drag-handle"
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Drag handle"
                  accessibilityHint="Swipe down or tap to close"
                  accessibilityActions={[{ name: 'activate', label: 'Close' }]}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === 'activate') onClose();
                  }}
                  style={styles.handleTarget}
                  {...drag.panHandlers}
                >
                  <View
                    style={[
                      styles.handle,
                      { backgroundColor: chrome.textSecondary },
                    ]}
                  />
                </View>
              )}
              <OctopusUIView
                key={`${session}-${mode}`}
                style={styles.community}
                showBackButton
                navBarLeadingAction="close"
                onBackRequested={onClose}
                interceptUrls={interceptUrls}
                interceptProfileTaps={interceptProfileTaps}
              />
            </SafeAreaView>
          </View>
        )}
        {mode !== null && overlays}
      </Modal>
      {mode === null && overlays}
    </>
  );
}
const styles = StyleSheet.create({
  window: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1 },
  surface: { flex: 1 },
  sheet: {
    flex: 0,
    height: '92%',
    borderTopLeftRadius: sampleRadius.xl,
    borderTopRightRadius: sampleRadius.xl,
    overflow: 'hidden',
  },
  community: { flex: 1 },
  handleTarget: {
    minHeight: sampleSize.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: { width: 32, height: 4, borderRadius: sampleRadius.pill },
});
