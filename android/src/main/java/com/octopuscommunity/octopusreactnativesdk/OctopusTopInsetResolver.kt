package com.octopuscommunity.octopusreactnativesdk

import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * The top system-bar and display-cutout area that actually overlaps an embedded view, in pixels.
 *
 * The display cutout counts as well: the SDK's Material3 top bars pad for
 * `systemBars ∪ displayCutout`, so on a device whose cutout is as tall as (or taller than) its
 * status bar, the cutout alone decides where the bar may start.
 */
internal object OctopusTopInsetResolver {
    fun resolveOverlapPx(
        view: View,
        insets: WindowInsetsCompat? = ViewCompat.getRootWindowInsets(view)
    ): Int {
        val top = insets
            ?.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            ?.top ?: return 0
        if (top <= 0 || view.height <= 0) return 0
        val location = IntArray(2)
        view.getLocationInWindow(location)
        // Insets are window-relative, even when a host header or safe-area padding has
        // already moved this view below the bars. Reserve only the remaining overlap, and never
        // more than the bars themselves when the view starts above the window (a scrolled parent).
        return (top - location[1]).coerceIn(0, minOf(top, view.height))
    }
}
