package com.octopuscommunity.sdk.reactnative.sample.shell

import android.graphics.Color
import androidx.core.view.WindowCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.modal.ReactModalHostView

/** RN Modal owns a Dialog window; Activity-only system bar setters cannot style it. */
class SampleModalStatusBarModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "SampleModalStatusBar"

    @ReactMethod
    fun setStyle(reactTag: Int, style: String) {
        UiThreadUtil.runOnUiThread {
            val host = try {
                UIManagerHelper.getUIManagerForReactTag(reactApplicationContext, reactTag)
                    ?.resolveView(reactTag) as? ReactModalHostView
            } catch (_: IllegalViewOperationException) {
                // The presentation may have closed before this queued update arrives.
                null
            } catch (_: IllegalStateException) {
                // Fabric can already have removed the modal's surface on close.
                null
            }
            val window = host?.dialog?.window ?: return@runOnUiThread
            @Suppress("DEPRECATION")
            window.statusBarColor = Color.TRANSPARENT
            WindowCompat.getInsetsController(window, window.decorView)
                .isAppearanceLightStatusBars = style == "dark-content"
        }
    }
}
