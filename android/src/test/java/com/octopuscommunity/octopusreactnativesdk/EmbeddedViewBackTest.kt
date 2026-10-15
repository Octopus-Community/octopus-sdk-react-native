package com.octopuscommunity.octopusreactnativesdk

import androidx.activity.OnBackPressedCallback
import androidx.activity.OnBackPressedDispatcher
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
class EmbeddedViewBackTest {
    private fun host() = object : LifecycleOwner {
        override val lifecycle = LifecycleRegistry(this).apply {
            currentState = Lifecycle.State.RESUMED
        }
    }

    @Test
    fun `back requires a visible started view and an enabled native callback`() {
        var sdkPops = 0
        var hostPops = 0
        val dispatcher = OnBackPressedDispatcher { hostPops++ }
        val host = host()
        val view = OctopusViewLifecycleOwner().apply { attach(host.lifecycle) }
        val callback = object : OnBackPressedCallback(false) {
            override fun handleOnBackPressed() { sdkPops++ }
        }
        dispatcher.addCallback(view, callback)
        assertFalse(dispatcher.hasEnabledCallbacks()) // Native root with no onBack.
        callback.isEnabled = true // Native depth > 1.
        dispatcher.onBackPressed()
        assertEquals(1, sdkPops)
        view.setVisible(false)
        assertFalse(dispatcher.hasEnabledCallbacks())
        dispatcher.onBackPressed()
        assertEquals(1, hostPops)
        assertEquals(1, sdkPops)
        view.setVisible(true)
        assertTrue(dispatcher.hasEnabledCallbacks())
        dispatcher.onBackPressed()
        assertEquals(2, sdkPops)
        host.lifecycle.currentState = Lifecycle.State.CREATED
        assertFalse(dispatcher.hasEnabledCallbacks())
        host.lifecycle.currentState = Lifecycle.State.RESUMED
        assertTrue(dispatcher.hasEnabledCallbacks())
        host.lifecycle.currentState = Lifecycle.State.DESTROYED
        view.setVisible(true)
        assertFalse(dispatcher.hasEnabledCallbacks())
        assertEquals(Lifecycle.State.DESTROYED, view.lifecycle.currentState)
    }

    @Test
    fun `a second visible root cannot dispatch back to a hidden deep tab`() {
        var tabPops = 0
        var overlayPops = 0
        var hostPops = 0
        val dispatcher = OnBackPressedDispatcher { hostPops++ }
        val host = host()
        val tab = OctopusViewLifecycleOwner().apply { attach(host.lifecycle) }
        dispatcher.addCallback(tab, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { tabPops++ }
        })
        tab.setVisible(false)
        val overlay = OctopusViewLifecycleOwner().apply { attach(host.lifecycle) }
        val callback = object : OnBackPressedCallback(false) {
            override fun handleOnBackPressed() { overlayPops++ }
        }
        dispatcher.addCallback(overlay, callback)
        dispatcher.onBackPressed()
        assertEquals(1, hostPops)
        assertEquals(0, tabPops)
        callback.isEnabled = true
        dispatcher.onBackPressed()
        assertEquals(1, overlayPops)
        assertEquals(0, tabPops)
        overlay.destroy()
        dispatcher.onBackPressed()
        assertEquals(2, hostPops)
        assertEquals(0, tabPops)
        tab.setVisible(true)
        dispatcher.onBackPressed()
        assertEquals(1, tabPops)
    }
}
