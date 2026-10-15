package com.octopuscommunity.octopusreactnativesdk

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry

// Keep composition state while detached or hidden, but stop lifecycle-aware callbacks and work.
// The host is the Activity, independent of any transient fragment owner in the view tree.
internal class OctopusViewLifecycleOwner : LifecycleOwner {
    override val lifecycle = LifecycleRegistry(this).apply {
        currentState = Lifecycle.State.CREATED
    }

    private var hostLifecycle: Lifecycle? = null
    private var attached = false
    private var visible = true
    private val hostObserver = LifecycleEventObserver { _, _ -> updateState() }

    fun attach(host: Lifecycle) {
        if (lifecycle.currentState == Lifecycle.State.DESTROYED) return
        attached = true
        if (hostLifecycle !== host) {
            hostLifecycle?.removeObserver(hostObserver)
            hostLifecycle = host
            host.addObserver(hostObserver)
        }
        updateState()
    }

    fun detach() {
        attached = false
        updateState()
    }

    fun setVisible(value: Boolean) {
        visible = value
        updateState()
    }

    fun destroy() {
        attached = false
        hostLifecycle?.removeObserver(hostObserver)
        hostLifecycle = null
        lifecycle.currentState = Lifecycle.State.DESTROYED
    }

    private fun updateState() {
        if (lifecycle.currentState == Lifecycle.State.DESTROYED) return
        val hostState = hostLifecycle?.currentState ?: Lifecycle.State.CREATED
        if (hostState == Lifecycle.State.DESTROYED) {
            destroy()
        } else {
            lifecycle.currentState = if (attached && visible) {
                hostState.coerceAtLeast(Lifecycle.State.CREATED)
            } else {
                Lifecycle.State.CREATED
            }
        }
    }
}
