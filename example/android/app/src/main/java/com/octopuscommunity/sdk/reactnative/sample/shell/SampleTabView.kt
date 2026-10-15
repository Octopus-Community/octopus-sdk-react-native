package com.octopuscommunity.sdk.reactnative.sample.shell

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.common.LifecycleState
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.view.ReactViewGroup

/**
 * An example-only host for a retained tab. Compose resolves this nearest tree
 * owner, so an invisible NavHost's Back callbacks stop with its lifecycle.
 * CREATED pauses the composition; only removing the tab destroys it.
 */
class SampleTabView(private val reactContext: ThemedReactContext) :
    ReactViewGroup(reactContext), LifecycleOwner, LifecycleEventListener {
    private val registry = LifecycleRegistry(this)
    override val lifecycle: Lifecycle get() = registry
    private var active = false
    private var hostResumed = reactContext.lifecycleState == LifecycleState.RESUMED

    init {
        setViewTreeLifecycleOwner(this)
        registry.currentState = Lifecycle.State.CREATED
        reactContext.addLifecycleEventListener(this)
    }

    fun setActive(value: Boolean) {
        active = value
        updateLifecycle()
    }

    private fun updateLifecycle() {
        if (registry.currentState == Lifecycle.State.DESTROYED) return
        registry.currentState =
            if (active && hostResumed) Lifecycle.State.RESUMED else Lifecycle.State.CREATED
    }

    override fun onHostResume() {
        hostResumed = true
        updateLifecycle()
    }

    override fun onHostPause() {
        hostResumed = false
        updateLifecycle()
    }

    override fun onHostDestroy() = dispose()

    fun dispose() {
        reactContext.removeLifecycleEventListener(this)
        registry.currentState = Lifecycle.State.DESTROYED
    }
}
