package com.octopuscommunity.octopusreactnativesdk

import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * Resolves the Android system bottom-inset that geometrically overlaps a [View]'s current
 * position in its window. Used only by the embedded path (`OctopusUIViewManager`), and only
 * when the host configured no `ui.bottomSafeAreaInset` at all.
 *
 * `OctopusUIViewManager.createViewInstance` consumes the system-bar insets so that a host's
 * `ui.bottomSafeAreaInset` becomes a *total* bottom padding rather than an additive one. When
 * the host configures none at all, nothing else reserves the navigation bar, and the SDK's
 * "create post" bar renders under it on an edge-to-edge host (API 35+, see issue #120).
 *
 * The read is deliberately geometric, not the raw window inset value: an `<OctopusUIView>` the
 * host has already lifted above the navigation bar (its own bottom padding, its own bar
 * underneath) must resolve to zero and keep reserving nothing — the Android analogue of the
 * Flutter SDK's `padding` vs `viewPadding` distinction for the same problem. The ambient
 * inset value reported by
 * [WindowInsetsCompat] is the same everywhere in the window regardless of where a view sits, so
 * telling those two cases apart requires comparing the view's own screen rectangle against the
 * navigation-bar band instead.
 */
internal object OctopusBottomInsetResolver {

  /**
   * Returns, in pixels, the portion of the system navigation-bar inset that overlaps [view]'s
   * current bounds on screen. Safe to call repeatedly (on every inset dispatch and every layout
   * pass): it re-derives from the view's live position and the current [WindowInsetsCompat], so
   * it tracks a rotation or a navigation-mode change (gesture vs. 3-button) even when neither
   * changes the view's own bounds on its own.
   */
  fun resolveOverlapPx(view: View): Int {
    val insets = ViewCompat.getRootWindowInsets(view) ?: return 0
    val navigationBarBottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
    if (navigationBarBottom <= 0) return 0

    val root = view.rootView
    if (root.height <= 0) return 0

    val location = IntArray(2)
    view.getLocationInWindow(location)
    val viewBottomInWindow = location[1] + view.height
    val navigationBarTopInWindow = root.height - navigationBarBottom

    return (viewBottomInWindow - navigationBarTopInWindow).coerceIn(0, navigationBarBottom)
  }

  /**
   * Returns, in pixels, the portion of `Modifier.imePadding()`'s keyboard-avoidance padding
   * that is an over-count for [view] specifically — see issue #167.
   *
   * `imePadding()`, applied deep inside the SDK's own screens (`safeImePadding()` in
   * `CommentDetailsScreen`, `PostDetailsScreen`, `CreatePostScreen`), sizes its bottom padding
   * from `WindowInsets.ime`, which Android always reports relative to the *window's* bottom
   * edge. That is only correct when the composable's own box extends all the way to that edge.
   * On the embedded path it commonly does not: a host laying out `<OctopusUIView>` as a flex
   * sibling of its own bottom navigation/tab bar stops short of the window's true bottom by
   * that sibling's height, and `imePadding()` has no way to know it. Whenever that happens, the
   * padding is oversized by exactly that shortfall while the keyboard is visible, floating the
   * composer above it by a fixed, keyboard-height-independent gap.
   *
   * This is the mirror image of [resolveOverlapPx]: that function corrects for a view
   * *extending into* the navigation bar; this one corrects for a view *stopping short of* the
   * window edge. Both read the view's actual on-screen position rather than trust the ambient
   * inset value alone, for the same reason: the ambient value is the same everywhere in the
   * window regardless of where a view sits, so telling the cases apart requires geometry.
   *
   * Safe to call repeatedly (on every inset dispatch and every layout pass) — see
   * [resolveOverlapPx]'s doc, which applies here too. Returns 0 whenever the keyboard is hidden
   * or the view already reaches the window's bottom edge (the fullscreen path, `OctopusActivity`,
   * is never affected because it never goes through this resolver at all).
   */
  fun resolveImeExcessPx(view: View): Int {
    val insets = ViewCompat.getRootWindowInsets(view) ?: return 0
    val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
    if (imeBottom <= 0) return 0

    val root = view.rootView
    if (root.height <= 0) return 0

    val location = IntArray(2)
    view.getLocationInWindow(location)
    val viewBottomInWindow = location[1] + view.height

    return (root.height - viewBottomInWindow).coerceIn(0, imeBottom)
  }
}
