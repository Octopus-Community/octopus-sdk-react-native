package com.octopuscommunity.sdk.reactnative.sample.shell

import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

/** View-only package in the example; no SDK native module or public API is changed. */
class SampleTabViewManager : ReactViewManager() {
    override fun getName() = "SampleTabView"

    override fun createViewInstance(reactContext: ThemedReactContext): ReactViewGroup =
        SampleTabView(reactContext)

    @ReactProp(name = "active", defaultBoolean = false)
    fun setActive(view: ReactViewGroup, active: Boolean) {
        (view as SampleTabView).setActive(active)
    }

    // ReactViewManager normally pools its views. This owner reaches DESTROYED
    // on drop and cannot return to CREATED, so a new shell needs a fresh owner.
    override fun prepareToRecycleView(
        reactContext: ThemedReactContext,
        view: ReactViewGroup,
    ): ReactViewGroup? = null

    override fun onDropViewInstance(view: ReactViewGroup) {
        (view as SampleTabView).dispose()
        super.onDropViewInstance(view)
    }
}
