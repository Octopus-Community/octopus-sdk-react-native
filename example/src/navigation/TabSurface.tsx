import {
  View,
  StyleSheet,
  Platform,
  requireNativeComponent,
} from 'react-native';
import type { ViewProps } from 'react-native';
import { TabVisibility } from './tabVisibility';

// Host Compose views can use the per-tab LifecycleOwner. OctopusUIView owns its
// own Activity-backed lifecycle, so CommunityScreen forwards TabVisibility as
// its isVisible prop instead of relying on this container's tree owner.
const Container =
  Platform.OS === 'android'
    ? requireNativeComponent<ViewProps & { active?: boolean }>('SampleTabView')
    : View;

/**
 * Retain native views on both platforms; opacity never creates Fabric's Hidden trait.
 *
 * Visibility must not touch `zIndex` either. Fabric mounts siblings in `zIndex` order, so
 * raising the active surface moves the others: a REMOVE plus an INSERT of the native view.
 * On Android that detaches the embedded SDK's ComposeView from its window, which disposes
 * its composition and restarts the Community stack on the feed. Hidden surfaces stay in the
 * tree order, transparent, and let touches through with `pointerEvents="none"`.
 */
export function TabSurface({
  visible,
  testID,
  children,
}: {
  visible: boolean;
  testID: string;
  children: React.ReactNode;
}) {
  return (
    <TabVisibility.Provider value={visible}>
      <Container
        testID={testID}
        collapsable={false}
        active={visible}
        style={[styles.surface, visible ? styles.shown : styles.hidden]}
        pointerEvents={visible ? 'auto' : 'none'}
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      >
        {children}
      </Container>
    </TabVisibility.Provider>
  );
}
const styles = StyleSheet.create({
  surface: { ...StyleSheet.absoluteFillObject },
  shown: { opacity: 1 },
  hidden: { opacity: 0 },
});
