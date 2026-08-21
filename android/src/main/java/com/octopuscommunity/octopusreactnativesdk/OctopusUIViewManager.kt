package com.octopuscommunity.octopusreactnativesdk

import android.content.Context
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.captionBar
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.mandatorySystemGestures
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.safeContent
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.safeGestures
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.systemGestures
import androidx.compose.foundation.layout.tappableElement
import androidx.compose.foundation.layout.waterfall
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.core.view.ViewCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.octopuscommunity.sdk.domain.model.CreatePostScreenInfo
import com.octopuscommunity.sdk.ui.components.NavigationIconType

// AbstractComposeView.onMeasure is final in Compose 1.8.0+ and throws IllegalStateException
// when measured before window attachment (which React Native Fabric does routinely via
// SurfaceMountingManager.updateLayout). Wrap ComposeView in a plain FrameLayout whose
// onMeasure we can override to guard the pre-attachment case.
class OctopusViewWrapper(context: Context) : FrameLayout(context) {
    val composeView = ComposeView(context)

    // Per-view snapshot state: @ReactProp setters can fire after the first composition
    // (and the manager is a singleton shared by every instance), so these must be
    // observable and owned by the view for updates to reach OctopusContent.
    val interceptUrls = mutableStateOf(false)
    val interceptProfileTaps = mutableStateOf(false)
    val linkPath = mutableStateOf<String?>(null)

    // Bottom inset resolved from this view's on-screen position (see
    // OctopusBottomInsetResolver). Only consulted by OctopusContent when the host configured
    // no `ui.bottomSafeAreaInset` at all — an explicit value, including an explicit 0, always
    // wins. Kept as per-view state because two mounted <OctopusUIView>s can sit at different
    // mount points and therefore resolve to different values.
    val mountPointBottomInsetPx = mutableIntStateOf(0)

    // Portion of `imePadding()`'s keyboard-avoidance padding that over-counts for this specific
    // mount point — see OctopusBottomInsetResolver.resolveImeExcessPx and issue #167. Recomputed
    // alongside mountPointBottomInsetPx for the same reason: neither a rotation nor an IME
    // visibility change is guaranteed to change this view's own bounds on its own.
    val mountPointImeExcessPx = mutableIntStateOf(0)

    // Parity wave — navigation & theme: per-call overrides, mirroring the props above.
    // `navigationMode` is deliberately NOT stored here — see setNavigationMode below.
    val showBackButton = mutableStateOf(false)
    val showNavBar = mutableStateOf(true)
    val navBarTitle = mutableStateOf<String?>(null)
    val navBarPrimaryColor = mutableStateOf<Boolean?>(null)
    val titleCentered = mutableStateOf<Boolean?>(null)
    val navBarLeadingAction = mutableStateOf<NavigationIconType?>(null)

    // Decoded `initialScreen` prop. A `createPost` screen lands in [createPostInfo] instead —
    // exactly the split OctopusContent takes — and both are null for the main feed.
    // Internal, not public: `BridgeInitialScreen` is an internal bridge type, and the wrapper
    // class itself has to stay public (it is the type argument of a public view manager).
    internal val initialScreen = mutableStateOf<BridgeInitialScreen?>(null)
    internal val createPostInfo = mutableStateOf<CreatePostScreenInfo?>(null)

    // Latch for the `initialScreen` prop — see setInitialScreen.
    internal var initialScreenApplied = false

    init {
        addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        // Recomputed on every inset dispatch and every layout pass so it tracks a rotation or a
        // navigation-mode change (gesture <-> 3-button), neither of which necessarily changes
        // this view's own bounds on its own.
        ViewCompat.setOnApplyWindowInsetsListener(this) { view, insets ->
            mountPointBottomInsetPx.intValue = OctopusBottomInsetResolver.resolveOverlapPx(view)
            mountPointImeExcessPx.intValue = OctopusBottomInsetResolver.resolveImeExcessPx(view)
            insets
        }
        addOnLayoutChangeListener { view, _, _, _, _, _, _, _, _ ->
            mountPointBottomInsetPx.intValue = OctopusBottomInsetResolver.resolveOverlapPx(view)
            mountPointImeExcessPx.intValue = OctopusBottomInsetResolver.resolveImeExcessPx(view)
        }
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        if (!isAttachedToWindow) {
            setMeasuredDimension(
                View.MeasureSpec.getSize(widthMeasureSpec),
                View.MeasureSpec.getSize(heightMeasureSpec)
            )
            return
        }
        super.onMeasure(widthMeasureSpec, heightMeasureSpec)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        // ViewGroup.dispatchAttachedToWindow calls THIS view's onAttachedToWindow before
        // propagating to children, so the inner ComposeView is not yet attached at this
        // point. Defer the measure/layout until after the dispatch loop completes;
        // otherwise AbstractComposeView.onMeasure -> windowRecomposer lookup throws
        // "View ... is not attached to a window".
        post {
            composeView.measure(
                MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY)
            )
            composeView.layout(0, 0, measuredWidth, measuredHeight)
            mountPointBottomInsetPx.intValue = OctopusBottomInsetResolver.resolveOverlapPx(this)
            mountPointImeExcessPx.intValue = OctopusBottomInsetResolver.resolveImeExcessPx(this)
        }
    }
}

class OctopusUIViewManager(private val reactContext: ReactApplicationContext) :
    SimpleViewManager<OctopusViewWrapper>() {

    override fun getName(): String = REACT_CLASS_NAME

    override fun createViewInstance(reactContext: ThemedReactContext): OctopusViewWrapper {
        val wrapper = OctopusViewWrapper(reactContext)
        wrapper.composeView.setContent {
            MaterialTheme {
                // Notification-wins precedence, applied here rather than in the prop setters
                // because @ReactProp calls arrive in an arbitrary order: reading both values
                // inside the composition is the only order-independent place to compare them.
                // The JS layer already drops the initial screen with a warning before it
                // reaches the bridge; this is the native-side guard, for symmetry with iOS
                // and with the fullscreen path.
                val linkPath = wrapper.linkPath.value
                val hasDeepLink = !linkPath.isNullOrBlank()
                val requestedInitialScreen = wrapper.initialScreen.value
                val requestedCreatePostInfo = wrapper.createPostInfo.value
                val droppedInitialScreen = hasDeepLink &&
                    (requestedInitialScreen != null || requestedCreatePostInfo != null)
                if (droppedInitialScreen) {
                    // Keyed so a recomposition does not repeat the warning.
                    LaunchedEffect(Unit) {
                        Log.w(
                            TAG,
                            "Both notification and initialScreen were provided — following " +
                                "the notification deep link and dropping the initial screen"
                        )
                    }
                }
                // Consuming the system insets here is what makes the host's
                // `ui.bottomSafeAreaInset` a *total* bottom padding on the embedded path:
                // the SDK's own scaffold then sees no bottom inset, so the value it gets as
                // `contentPadding` is the only bottom padding applied. The iOS bridge has to
                // subtract the container's safe area to reach the same rendering — see
                // `OctopusEmbeddedContainerView` in ios/OctopusUIViewManager.swift. The
                // fullscreen path (OctopusActivity) deliberately consumes nothing, so there
                // the value stays additive on both platforms.
                //
                // The last `consumeWindowInsets` is a different fix for a different symptom
                // (issue #167): it does not touch the bottom padding above, it corrects
                // `Modifier.imePadding()` deep inside the comment/post-editor screens, which
                // otherwise floats them above the keyboard by however far this mount point
                // stops short of the window's true bottom edge — see
                // OctopusBottomInsetResolver.resolveImeExcessPx. Zero, and a no-op, whenever
                // the keyboard is hidden or this view already reaches that edge.
                OctopusContent(
                    modifier = Modifier.fillMaxSize()
                        .consumeWindowInsets(WindowInsets.statusBars)
                        .consumeWindowInsets(WindowInsets.navigationBars)
                        .consumeWindowInsets(WindowInsets.systemBars)
                        .consumeWindowInsets(WindowInsets(bottom = wrapper.mountPointImeExcessPx.intValue)),
                    interceptUrls = wrapper.interceptUrls.value,
                    interceptProfileTaps = wrapper.interceptProfileTaps.value,
                    linkPath = linkPath,
                    createPostInfo = requestedCreatePostInfo.takeUnless { droppedInitialScreen },
                    initialScreen = requestedInitialScreen.takeUnless { droppedInitialScreen },
                    // Only a fallback: OctopusContent ignores this whenever the host
                    // configured `ui.bottomSafeAreaInset` (see OctopusUIConfigurationManager),
                    // even an explicit 0. See OctopusBottomInsetResolver and issue #120.
                    mountPointBottomInsetPx = wrapper.mountPointBottomInsetPx.intValue,
                    // Parity wave — navigation & theme
                    backButton = wrapper.showBackButton.value,
                    navBarTitleOverride = wrapper.navBarTitle.value,
                    titleCenteredOverride = wrapper.titleCentered.value,
                    navBarPrimaryColorOverride = wrapper.navBarPrimaryColor.value,
                    showNavBar = wrapper.showNavBar.value,
                    navBarLeadingAction = wrapper.navBarLeadingAction.value
                )
            }
        }
        return wrapper
    }

    @ReactProp(name = "interceptUrls")
    fun setInterceptUrls(view: OctopusViewWrapper, interceptUrls: Boolean) {
        view.interceptUrls.value = interceptUrls
    }

    @ReactProp(name = "interceptProfileTaps")
    fun setInterceptProfileTaps(view: OctopusViewWrapper, interceptProfileTaps: Boolean) {
        view.interceptProfileTaps.value = interceptProfileTaps
    }

    @ReactProp(name = "notification")
    fun setNotification(view: OctopusViewWrapper, notification: ReadableMap?) {
        view.linkPath.value =
            notification?.takeIf { it.hasKey("linkPath") }?.getString("linkPath")
    }

    /**
     * Decodes the flat `initialScreen` wire payload (produced by JS `normalizeInitialScreen`,
     * the same producer `openUI` uses) into the pair [OctopusContent] consumes: a
     * [BridgeInitialScreen] for the screens that navigate on top of the home NavHost, or a
     * [CreatePostScreenInfo] for the post editor.
     *
     * A prop cannot reject a promise, so an invalid `createPost` prefill cannot surface a
     * `NavigateToOctopusCreatePostError` the way `openUI` and `navigateToOctopusCreatePost`
     * do: it degrades to a blank editor with a warning rather than failing the host's render.
     * Same fallback as the iOS embedded decoder and the Flutter embedded platform view.
     */
    @ReactProp(name = "initialScreen")
    fun setInitialScreen(view: OctopusViewWrapper, initialScreen: ReadableMap?) {
        // Read on first delivery only, mirroring the iOS `hasEmbedded` latch in
        // didMoveToWindow(). Under the interop layer the ViewManager receives the FULL
        // props map on every update, so this setter re-runs whenever any prop changes —
        // and a rebuilt CreatePostScreenInfo would restart OctopusContent's
        // LaunchedEffect (OctopusPrefilledPost has no structural equals) and push a
        // second editor. A `key` remount creates a fresh wrapper, so the documented
        // retarget path is unaffected.
        if (view.initialScreenApplied) return
        view.initialScreenApplied = true

        fun optionalString(key: String): String? =
            initialScreen?.takeIf { it.hasKey(key) }?.getString(key)

        val type = optionalString("type")
        if (type == "createPost") {
            val text = optionalString("text")
            val imageUri = optionalString("imageUri")
            val topicId = optionalString("topicId")
            val ctaUrl = optionalString("ctaUrl")
            val ctaLabel = optionalString("ctaLabel")
            val hasPrefill = text != null || imageUri != null || topicId != null ||
                ctaUrl != null || ctaLabel != null
            view.createPostInfo.value = if (hasPrefill) {
                try {
                    PrefilledPostBuilder.build(
                        reactContext, text, imageUri, topicId, ctaUrl, ctaLabel
                    )
                } catch (e: Exception) {
                    Log.w(TAG, "Invalid initialScreen createPost prefill — opening a blank editor", e)
                    CreatePostScreenInfo()
                }
            } else {
                // No prefill at all: a blank editor, matching the native
                // navigateToOctopusCreatePost default.
                CreatePostScreenInfo()
            }
            view.initialScreen.value = null
            return
        }
        view.createPostInfo.value = null
        view.initialScreen.value = decodeBridgeInitialScreen(type = type, tag = TAG) { key ->
            optionalString(key)
        }
    }

    // Parity wave — navigation & theme

    @ReactProp(name = "showBackButton")
    fun setShowBackButton(view: OctopusViewWrapper, showBackButton: Boolean) {
        view.showBackButton.value = showBackButton
    }

    @ReactProp(name = "showNavBar")
    fun setShowNavBar(view: OctopusViewWrapper, showNavBar: Boolean) {
        view.showNavBar.value = showNavBar
    }

    @ReactProp(name = "navBarTitle")
    fun setNavBarTitle(view: OctopusViewWrapper, navBarTitle: String?) {
        view.navBarTitle.value = navBarTitle
    }

    @ReactProp(name = "navBarPrimaryColor")
    fun setNavBarPrimaryColor(view: OctopusViewWrapper, navBarPrimaryColor: Boolean?) {
        view.navBarPrimaryColor.value = navBarPrimaryColor
    }

    @ReactProp(name = "titleCentered")
    fun setTitleCentered(view: OctopusViewWrapper, titleCentered: Boolean?) {
        view.titleCentered.value = titleCentered
    }

    /**
     * `navigationMode` is iOS-only (wrapped native iOS SDK 1.12.2+) and intentionally NOT
     * stored or forwarded: the Android bridge always drives the SDK through a Compose
     * `NavHost`, which keeps its back stack across modal hosting, so there is no
     * NavigationView-vs-NavigationStack choice to make here. The JS layer emits the wire key
     * for both platforms; this setter exists solely so the prop is a recognized no-op on
     * Android instead of an unhandled warning.
     */
    @ReactProp(name = "navigationMode")
    fun setNavigationMode(view: OctopusViewWrapper, navigationMode: String?) {
        // Deliberately ignored — see KDoc above.
    }

    @ReactProp(name = "navBarLeadingAction")
    fun setNavBarLeadingAction(view: OctopusViewWrapper, navBarLeadingAction: String?) {
        view.navBarLeadingAction.value = when (navBarLeadingAction) {
            "close" -> NavigationIconType.Close
            "back" -> NavigationIconType.Back
            else -> null
        }
    }

    companion object Companion {
        private const val TAG = "OctopusUIViewManager"
        const val REACT_CLASS_NAME = "OctopusUIView"
    }
}
