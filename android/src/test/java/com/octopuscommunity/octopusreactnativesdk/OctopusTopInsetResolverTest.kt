package com.octopuscommunity.octopusreactnativesdk

import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.core.graphics.Insets
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class OctopusTopInsetResolverTest {
    private val controller = Robolectric.buildActivity(ComponentActivity::class.java)
    private lateinit var view: View

    @Before
    fun setUp() {
        val activity = controller.setup().visible().get()
        WindowCompat.setDecorFitsSystemWindows(activity.window, false)
        val parent = FrameLayout(activity)
        // Attach directly to decor so test coordinates start at the window origin,
        // independently of Robolectric's default content-frame status-bar offset.
        (activity.window.decorView as ViewGroup).addView(parent)
        view = View(activity)
        parent.addView(view)
        activity.window.decorView.layout(0, 0, 480, 800)
        parent.layout(0, 0, 480, 800)
    }

    @After
    fun tearDown() { controller.pause().stop().destroy() }

    private fun overlap(top: Int, statusBar: Int = 24, height: Int = 400): Int {
        view.layout(0, top, 480, top + height)
        return OctopusTopInsetResolver.resolveOverlapPx(
            view,
            WindowInsetsCompat.Builder()
                .setInsets(WindowInsetsCompat.Type.statusBars(), Insets.of(0, statusBar, 0, 0))
                .build()
        )
    }

    @Test
    fun `edge to edge view reserves the status bar`() {
        assertEquals(24, overlap(0))
    }

    @Test
    fun `host safe area or header does not receive double padding`() {
        assertEquals(0, overlap(24))
        assertEquals(0, overlap(80))
        assertEquals(12, overlap(12))
    }

    @Test
    fun `layout and system bar changes update the overlap`() {
        assertEquals(24, overlap(0))
        assertEquals(0, overlap(24))
        assertEquals(16, overlap(24, statusBar = 40))
        assertEquals(0, overlap(0, statusBar = 0))
        assertEquals(40, overlap(0, statusBar = 40))
    }

    @Test
    fun `a view starting above the window reserves at most the status bar`() {
        assertEquals(24, overlap(-100))
        assertEquals(24, overlap(-24))
        assertEquals(24, overlap(-100, height = 50))
    }

    @Test
    fun `small or unmeasured views never reserve more than their height`() {
        assertEquals(8, overlap(0, height = 8))
        assertEquals(0, overlap(0, height = 0))
        assertEquals(0, OctopusTopInsetResolver.resolveOverlapPx(view, null))
    }
}
