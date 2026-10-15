package com.octopuscommunity.octopusreactnativesdk

import android.app.Dialog
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.FrameLayout
import androidx.activity.ComponentDialog
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.BroadcastFrameClock
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.snapshots.Snapshot
import androidx.compose.ui.InternalComposeUiApi
import androidx.compose.ui.platform.WindowRecomposerFactory
import androidx.compose.ui.platform.WindowRecomposerPolicy
import androidx.compose.ui.platform.createLifecycleAwareWindowRecomposer
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.findViewTreeViewModelStoreOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.findViewTreeSavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import androidx.lifecycle.findViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.uimanager.ThemedReactContext
import kotlinx.coroutines.android.asCoroutineDispatcher
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.Config
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [34])
@LooperMode(LooperMode.Mode.PAUSED)
@OptIn(InternalComposeUiApi::class)
class OctopusUIViewLifecycleTest {
    private val frameClock = BroadcastFrameClock()
    private var frameTimeNanos = 0L
    private lateinit var activityController: ActivityController<ComponentActivity>
    private var dialog: Dialog? = null
    private lateinit var parent: FrameLayout
    private lateinit var wrapper: OctopusViewWrapper
    private lateinit var manager: OctopusUIViewManager
    private lateinit var navController: NavHostController
    private var compositions = 0
    private var disposals = 0
    private var onBackRequested = 0
    private var hostBackRequests = 0

    @Before
    fun setUp() {
        activityController = Robolectric.buildActivity(ComponentActivity::class.java).setup().visible()
        val activity = activityController.get()
        activity.onBackPressedDispatcher.addCallback(activity, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { hostBackRequests += 1 }
        })
        val reactContext = BridgeReactContext(activity.application)
        manager = OctopusUIViewManager(reactContext)
        wrapper = OctopusViewWrapper(ThemedReactContext(reactContext, activity, null, -1))
        parent = FrameLayout(activity)
        activity.setContentView(parent)
        // Exercise the real wrapper's strategy without initializing the SDK or using a key.
        // OctopusContent also remembers its NavController inside this composition.
        wrapper.composeView.setContent {
            val controller = rememberNavController()
            SideEffect { navController = controller }
            DisposableEffect(Unit) {
                compositions += 1
                onDispose { disposals += 1 }
            }
            NavHost(controller, startDestination = "feed") {
                composable("feed") {}
                composable("detail") {}
            }
            // Model the SDK's root back forwarding without initializing its container.
            val entry by controller.currentBackStackEntryAsState()
            BackHandler(enabled = entry?.destination?.route == "feed") {
                onBackRequested += 1
            }
        }
    }

    @After
    fun tearDown() {
        dialog?.dismiss()
        if (activityController.get().lifecycle.currentState != Lifecycle.State.DESTROYED) {
            activityController.pause().stop().destroy()
        }
    }

    private fun measure(width: Int, height: Int) {
        wrapper.measure(
            View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY)
        )
        wrapper.layout(0, 0, width, height)
    }

    private fun addToWindow() {
        // AndroidUiDispatcher.Main caches a Choreographer across Robolectric test methods.
        // Use a fresh dispatcher and frame clock, retaining the normal window lifecycle policy.
        WindowRecomposerPolicy.withFactory(WindowRecomposerFactory { root ->
            root.createLifecycleAwareWindowRecomposer(
                Handler(Looper.getMainLooper()).asCoroutineDispatcher().immediate + frameClock
            )
        }) {
            parent.addView(wrapper, FrameLayout.LayoutParams(480, 320))
        }
    }

    private fun attach() {
        addToWindow()
        measure(480, 320)
        shadowOf(Looper.getMainLooper()).idle()
    }

    private fun settleComposition() {
        repeat(60) {
            Snapshot.sendApplyNotifications()
            shadowOf(Looper.getMainLooper()).idle()
            frameTimeNanos += 16_000_000L
            frameClock.sendFrame(frameTimeNanos)
            shadowOf(Looper.getMainLooper()).idle()
        }
    }

    @Test
    fun `detach and reattach retain composition navigation and deferred measurement`() {
        measure(480, 320)
        assertFalse(wrapper.composeView.hasComposition)
        assertEquals(480, wrapper.measuredWidth)
        assertEquals(320, wrapper.measuredHeight)
        attach()
        val originalController = navController
        navController.navigate("detail")
        shadowOf(Looper.getMainLooper()).idle()

        repeat(2) {
            parent.removeView(wrapper)
            assertFalse(wrapper.isAttachedToWindow)
            assertTrue(wrapper.composeView.hasComposition)
            assertEquals(0, disposals)
            measure(480, 320)
            attach()
            assertSame(originalController, navController)
            assertEquals("detail", navController.currentDestination?.route)
            assertEquals(480, wrapper.composeView.measuredWidth)
            assertEquals(320, wrapper.composeView.measuredHeight)
        }

        assertEquals(1, compositions)
        assertTrue(navController.popBackStack())
        assertEquals("feed", navController.currentDestination?.route)
    }

    @Test
    fun `dropping a detached view disposes its composition before host destruction`() {
        attach()
        parent.removeView(wrapper)
        manager.onDropViewInstance(wrapper)
        shadowOf(Looper.getMainLooper()).idle()
        assertFalse(wrapper.composeView.hasComposition)
        assertEquals(1, disposals)
        assertFalse(activityController.get().isDestroyed)
    }

    @Test
    fun `host destruction disposes a retained detached composition`() {
        attach()
        parent.removeView(wrapper)
        activityController.pause().stop().destroy()
        assertFalse(wrapper.composeView.hasComposition)
        assertEquals(1, disposals)
    }

    @Test
    fun `dropping a view also removes its view tree lifecycle observer`() {
        // Isolate composition cleanup from the NavController, which this test keeps
        // no reference to. The window recomposer still uses the Activity's lifecycle.
        wrapper.composeView.setContent {
            DisposableEffect(Unit) { onDispose { disposals += 1 } }
        }
        attach()
        val owner = wrapper.composeView.findViewTreeLifecycleOwner()!!.lifecycle as LifecycleRegistry
        val host = activityController.get().lifecycle as LifecycleRegistry
        assertTrue(owner.observerCount > 0)
        parent.removeView(wrapper)
        val hostObservers = host.observerCount
        manager.onDropViewInstance(wrapper)
        assertEquals(Lifecycle.State.DESTROYED, owner.currentState)
        assertEquals(0, owner.observerCount)
        assertEquals(hostObservers - 1, host.observerCount)
        assertEquals(1, disposals)
    }

    @Test
    fun `detach and drop before deferred measurement do not recreate a composition`() {
        addToWindow()
        parent.removeView(wrapper)
        manager.onDropViewInstance(wrapper)
        shadowOf(Looper.getMainLooper()).idle()
        assertFalse(wrapper.composeView.hasComposition)
    }

    @Test
    fun `drop while still attached prevents deferred measurement from recreating composition`() {
        addToWindow()
        assertTrue(wrapper.isAttachedToWindow)
        manager.onDropViewInstance(wrapper)
        assertFalse(wrapper.composeView.hasComposition)
        shadowOf(Looper.getMainLooper()).idle()
        assertTrue(wrapper.isAttachedToWindow)
        assertFalse(wrapper.composeView.hasComposition)
    }

    @Test
    fun `measurement after dropping an attached view does not recreate composition`() {
        attach()
        manager.onDropViewInstance(wrapper)
        assertTrue(wrapper.isAttachedToWindow)
        assertFalse(wrapper.composeView.hasComposition)
        measure(640, 480)
        assertEquals(640, wrapper.measuredWidth)
        assertEquals(480, wrapper.measuredHeight)
        assertFalse(wrapper.composeView.hasComposition)
        assertEquals(1, disposals)
    }

    @Test
    fun `hidden attached detail ignores back and becoming visible restores the same stack`() {
        attach()
        val originalController = navController
        navController.navigate("detail")
        settleComposition()
        wrapper.alpha = 0f
        manager.setIsVisible(wrapper, false)
        assertTrue(wrapper.isAttachedToWindow)
        assertTrue(wrapper.composeView.hasComposition)
        assertEquals(Lifecycle.State.CREATED, wrapper.composeView.findViewTreeLifecycleOwner()!!.lifecycle.currentState)
        repeat(2) { activityController.get().onBackPressedDispatcher.onBackPressed() }
        assertEquals("detail", navController.currentDestination?.route)
        assertEquals(0, onBackRequested)
        assertEquals(2, hostBackRequests)

        wrapper.alpha = 1f
        manager.setIsVisible(wrapper, true)
        settleComposition()
        activityController.get().onBackPressedDispatcher.onBackPressed()
        settleComposition()
        assertSame(originalController, navController)
        assertEquals("feed", navController.currentDestination?.route)
        assertEquals(1, compositions)
        assertEquals(0, disposals)
    }

    @Test
    fun `hidden attached root stops root back forwarding and remains hidden across host resume`() {
        attach()
        settleComposition()
        manager.setIsVisible(wrapper, false)
        activityController.pause().stop().start().resume()
        assertEquals(Lifecycle.State.CREATED, wrapper.composeView.findViewTreeLifecycleOwner()!!.lifecycle.currentState)
        activityController.get().onBackPressedDispatcher.onBackPressed()
        assertEquals(0, onBackRequested)
        assertEquals(1, hostBackRequests)
        manager.setIsVisible(wrapper, true)
        settleComposition()
        activityController.get().onBackPressedDispatcher.onBackPressed()
        assertEquals(1, onBackRequested)
        assertEquals(1, hostBackRequests)
    }

    @Test
    fun `initial hidden visibility survives attach and reattach until explicitly shown`() {
        manager.setIsVisible(wrapper, false)
        attach()
        val lifecycle = wrapper.composeView.findViewTreeLifecycleOwner()!!.lifecycle
        assertEquals(Lifecycle.State.CREATED, lifecycle.currentState)
        parent.removeView(wrapper)
        attach()
        assertEquals(Lifecycle.State.CREATED, lifecycle.currentState)
        manager.setIsVisible(wrapper, true)
        assertEquals(Lifecycle.State.RESUMED, lifecycle.currentState)
        manager.setIsVisible(wrapper, false)
        manager.onDropViewInstance(wrapper)
        manager.setIsVisible(wrapper, true)
        assertEquals(Lifecycle.State.DESTROYED, lifecycle.currentState)
        assertEquals(1, disposals)
    }

    @Test
    fun `detached detail ignores system back and reattached detail pops normally`() {
        attach()
        val originalController = navController
        navController.navigate("detail")
        settleComposition()
        parent.removeView(wrapper)
        activityController.get().onBackPressedDispatcher.onBackPressed()
        assertEquals("detail", navController.currentDestination?.route)
        assertEquals(0, onBackRequested)
        assertEquals(1, hostBackRequests)
        assertEquals(Lifecycle.State.CREATED, wrapper.composeView.findViewTreeLifecycleOwner()!!.lifecycle.currentState)

        attach()
        settleComposition()
        activityController.get().onBackPressedDispatcher.onBackPressed()
        settleComposition()
        assertSame(originalController, navController)
        assertEquals("feed", navController.currentDestination?.route)
        assertEquals(0, onBackRequested)
        assertEquals(1, hostBackRequests)
        assertEquals(1, compositions)
    }

    @Test
    fun `detached root does not forward back requests and reattachment restores forwarding`() {
        attach()
        settleComposition()
        parent.removeView(wrapper)
        activityController.get().onBackPressedDispatcher.onBackPressed()
        assertEquals("feed", navController.currentDestination?.route)
        assertEquals(0, onBackRequested)
        assertEquals(1, hostBackRequests)
        attach()
        settleComposition()
        activityController.get().onBackPressedDispatcher.onBackPressed()
        assertEquals(1, onBackRequested)
        assertEquals(1, hostBackRequests)
    }

    @Test
    fun `view lifecycle follows host transitions but stays created while detached`() {
        attach()
        val lifecycle = wrapper.composeView.findViewTreeLifecycleOwner()!!.lifecycle
        assertEquals(Lifecycle.State.RESUMED, lifecycle.currentState)
        activityController.pause()
        assertEquals(Lifecycle.State.STARTED, lifecycle.currentState)
        activityController.stop()
        assertEquals(Lifecycle.State.CREATED, lifecycle.currentState)
        activityController.start().resume()
        assertEquals(Lifecycle.State.RESUMED, lifecycle.currentState)
        parent.removeView(wrapper)
        activityController.pause().stop().start().resume()
        assertEquals(Lifecycle.State.CREATED, lifecycle.currentState)
        attach()
        assertEquals(Lifecycle.State.RESUMED, lifecycle.currentState)
    }

    @Test
    fun `transient view tree owner destruction does not destroy retained composition`() {
        val transientOwner = object : LifecycleOwner {
            override val lifecycle = LifecycleRegistry(this).apply {
                currentState = Lifecycle.State.RESUMED
            }
        }
        wrapper.setViewTreeLifecycleOwner(transientOwner)
        attach()
        navController.navigate("detail")
        parent.removeView(wrapper)
        transientOwner.lifecycle.currentState = Lifecycle.State.DESTROYED
        assertTrue(wrapper.composeView.hasComposition)
        assertEquals(0, disposals)
        attach()
        assertEquals("detail", navController.currentDestination?.route)
        assertEquals(Lifecycle.State.RESUMED, wrapper.composeView.findViewTreeLifecycleOwner()!!.lifecycle.currentState)
    }

    @Test
    fun `RN modal dialog supplies no viewmodel owner but embedded navigation still works`() {
        val activity = activityController.get()
        val modal = ComponentDialog(activity)
        dialog = modal
        parent = FrameLayout(activity)
        modal.setContentView(parent)
        modal.show()
        // ReactModalHostView uses ComponentDialog: it has lifecycle and saved-state
        // owners, but no ViewModelStoreOwner and no parent link to the Activity tree.
        assertNull(parent.findViewTreeViewModelStoreOwner())
        assertSame(modal, parent.findViewTreeLifecycleOwner())
        assertSame(modal, parent.findViewTreeSavedStateRegistryOwner())

        attach()
        settleComposition()
        assertSame(activity, wrapper.composeView.findViewTreeViewModelStoreOwner())
        assertSame(modal, wrapper.composeView.findViewTreeSavedStateRegistryOwner())
        val originalController = navController
        navController.navigate("detail")
        settleComposition()
        parent.removeView(wrapper)
        attach()
        settleComposition()
        assertSame(originalController, navController)
        assertEquals("detail", navController.currentDestination?.route)
        assertTrue(navController.popBackStack())
        manager.onDropViewInstance(wrapper)
        assertEquals(1, disposals)
    }

    @Test
    fun `dialog with only a lifecycle owner falls back to host saved state and viewmodel owners`() {
        val activity = activityController.get()
        val modal = Dialog(activity)
        dialog = modal
        parent = FrameLayout(activity)
        // Custom sheet hosts can supply a lifecycle without the other Compose owners.
        parent.setViewTreeLifecycleOwner(activity)
        modal.setContentView(parent)
        modal.show()
        assertNull(parent.findViewTreeViewModelStoreOwner())
        assertNull(parent.findViewTreeSavedStateRegistryOwner())
        attach()
        settleComposition()
        assertSame(activity, wrapper.composeView.findViewTreeViewModelStoreOwner())
        assertSame(activity, wrapper.composeView.findViewTreeSavedStateRegistryOwner())
        assertEquals("feed", navController.currentDestination?.route)
    }

    @Test
    fun `embedded view keeps owners supplied by its host tree`() {
        val owner = object : ViewModelStoreOwner {
            override val viewModelStore = ViewModelStore()
        }
        parent.setViewTreeViewModelStoreOwner(owner)
        parent.setViewTreeSavedStateRegistryOwner(activityController.get())
        attach()
        settleComposition()
        assertSame(owner, wrapper.composeView.findViewTreeViewModelStoreOwner())
        assertSame(activityController.get(), wrapper.composeView.findViewTreeSavedStateRegistryOwner())
        assertEquals("feed", navController.currentDestination?.route)
        manager.onDropViewInstance(wrapper)
        owner.viewModelStore.clear()
    }
}
