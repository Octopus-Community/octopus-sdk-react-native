package com.octopuscommunity.octopusreactnativesdk

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableNativeMap
import com.octopuscommunity.sdk.domain.network.OctopusResult
import com.octopuscommunity.sdk.InternalOctopusApi
import com.octopuscommunity.sdk.OctopusProfile
import com.octopuscommunity.sdk.OctopusSDK
import com.octopuscommunity.sdk.domain.model.OctopusGroup
import com.octopuscommunity.sdk.domain.model.OctopusPrefilledPost
import com.octopuscommunity.sdk.domain.model.SyncFollowGroupAction
import com.octopuscommunity.sdk.domain.model.SyncFollowGroupStatus
import com.octopuscommunity.sdk.domain.model.TrackerEvent
import com.octopuscommunity.sdk.domain.repository.ConnectionRepository.ConnectionState
import com.octopuscommunity.sdk.domain.repository.GroupFollowUnfollowError
import com.octopuscommunity.sdk.domain.repository.RefreshEntitlementsError
import com.octopuscommunity.sdk.domain.repository.SetReactionError
import java.util.Date
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class OctopusReactModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val sdkInitializer = OctopusSDKInitializer()
  private val eventEmitter = OctopusEventEmitter(reactContext)
  private val uiController = OctopusUIController(reactContext)
  private val ssoAuthenticator = OctopusSSOAuthenticator(reactContext, eventEmitter)
  private val coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
  private var notSeenNotificationsJob: Job? = null
  private var hasAccessToCommunityJob: Job? = null
  private var eventsJob: Job? = null
  private var communityDataJob: Job? = null
  private var profileJob: Job? = null
  private var groupsJob: Job? = null
  private var connectionStateJob: Job? = null
  private var isInitialisedJob: Job? = null

  // Last value seen on each state channel, so [requestStateSnapshot] can re-emit it to a JS side
  // that started listening later. `hasProfile` is separate because `null` is a real profile value
  // ("not connected"), distinct from "nothing received yet".
  private var hasProfile = false
  private var lastProfile: OctopusProfile? = null
  private var lastGroups: List<OctopusGroup>? = null
  private var lastConnectionState: ConnectionState? = null

  // Parity wave — client-object bridge. One Job per active
  // `addClientObjectRelatedPostListener` subscription, keyed by the JS-minted observationId.
  // Deliberately NOT the single-`Job` shape `communityDataJob` uses: the native
  // `getClientObjectRelatedPostFlow` is per-object, and a host showing two of its objects on
  // one screen must be able to observe both.
  private val clientObjectPostJobs = ConcurrentHashMap<String, Job>()

  override fun getName(): String = NAME

  @ReactMethod
  fun initialize(options: ReadableMap, promise: Promise) {
    val success = sdkInitializer.initialize(reactApplicationContext, options, promise)
    // Start observing reactive events after SDK initialization succeeds
    if (success) {
      startObservingReactiveEvents()
    }
  }

  @ReactMethod
  fun openUI(options: ReadableMap?, promise: Promise) {
    uiController.openUI(options, promise)
  }

  @ReactMethod
  fun handleUrlStrategy(url: String, strategy: String) {
    if (strategy == "handledByOctopus") {
      uiController.openUrlInBrowser(url)
    }
  }

  @ReactMethod
  fun closeUI(promise: Promise) {
    uiController.closeUI(promise)
  }

  @ReactMethod
  fun connectUser(params: ReadableMap, promise: Promise) {
    ssoAuthenticator.connectUser(params, promise)
  }

  @ReactMethod
  fun disconnectUser(promise: Promise) {
    ssoAuthenticator.disconnectUser(promise)
  }

  @ReactMethod
  fun completeUserTokenRequest(requestId: String, token: String, promise: Promise) {
    ssoAuthenticator.completeTokenRequest(requestId, token)
    promise.resolve(null)
  }

  @ReactMethod
  fun cancelUserTokenRequest(requestId: String, promise: Promise) {
    ssoAuthenticator.cancelTokenRequest(requestId)
    promise.resolve(null)
  }

  /**
   * Declares that JS can answer `bridgeShareTokenRequest`. Not a listener tally — see
   * `nativeEventGate.test.ts` for why one cannot be kept honest; this is an explicit,
   * idempotent statement from `addBridgeShareTokenRequestListener`.
   */
  @ReactMethod
  fun registerBridgeShareTokenProvider(promise: Promise) {
    BridgeShareTokenBroker.registerProvider()
    promise.resolve(null)
  }

  @ReactMethod
  fun unregisterBridgeShareTokenProvider(promise: Promise) {
    BridgeShareTokenBroker.unregisterProvider()
    promise.resolve(null)
  }

  /**
   * Answers one `bridgeShareTokenRequest`. A `null` [token] means "do not sign", which lets the
   * publish proceed unsigned on this platform.
   */
  @ReactMethod
  fun completeBridgeShareTokenRequest(requestId: String, token: String?, promise: Promise) {
    BridgeShareTokenBroker.completeRequest(requestId, token)
    promise.resolve(null)
  }

  /**
   * Required by `NativeEventEmitter`, which calls it on every `addListener`. Deliberately a
   * no-op: the counts it reports cannot be attributed to an event name, so
   * `OctopusEventEmitter` gates on React instance liveness instead of tracking them. Do not
   * delete — `NativeEventEmitter` warns at runtime when the native module lacks it.
   */
  @ReactMethod
  fun addListener(eventName: String) {
    // No-op. See the KDoc above, and `OctopusEventEmitter.sendEvent`.
  }

  /**
   * Required by `NativeEventEmitter`. Deliberately a no-op — see [addListener].
   */
  @ReactMethod
  fun removeListeners(count: Int) {
    // No-op. See the KDoc above, and `OctopusEventEmitter.sendEvent`.
  }

  @ReactMethod
  fun updateColorScheme(colorScheme: String?, forced: Boolean, promise: Promise) {
    // `colorScheme` is the effective scheme (forced by setThemeMode, else the one JS observes);
    // `forced` is what iOS keys its interface-style override on — Android renders from the
    // effective scheme either way, and OctopusContent re-selects a dual-mode set from it.
    // No theme configured yet is not a reason to drop the update: a setThemeMode() with no
    // `theme` at initialize() must still force the base palette, so the config is created.
    val base = OctopusThemeManager.getThemeConfig() ?: OctopusThemeConfig.EMPTY
    OctopusThemeManager.setThemeConfig(base.copy(colorScheme = colorScheme))
    promise.resolve(null)
  }

  @ReactMethod
  fun updateNotSeenNotificationsCount(promise: Promise) {
    coroutineScope.launch {
      try {
        OctopusSDK.updateNotSeenNotificationsCount()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("UPDATE_ERROR", e.message ?: "Failed to update notification count", e)
      }
    }
  }

  @ReactMethod
  fun registerPushNotificationToken(token: String, promise: Promise) {
    val trimmed = token.trim()
    if (trimmed.isEmpty()) {
      promise.reject("INVALID_ARGS", "token is required and must be non-empty", null)
      return
    }
    try {
      OctopusSDK.registerNotificationsToken(fcmRegistrationToken = trimmed)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(
        "REGISTER_TOKEN_ERROR",
        e.message ?: "Failed to register push notification token",
        e
      )
    }
  }

  @ReactMethod
  fun trackCustomEvent(name: String, properties: ReadableMap?, promise: Promise) {
    val trimmedName = name.trim()
    if (trimmedName.isEmpty()) {
      promise.reject("INVALID_ARGS", "name is required and must be non-empty", null)
      return
    }
    val propsMap = readableMapToStringMap(properties)
    coroutineScope.launch {
      try {
        OctopusSDK.track(
          TrackerEvent.Custom(
            name = trimmedName,
            properties = propsMap.mapValues { TrackerEvent.Custom.Property(it.value) }
          )
        )
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("TRACK_ERROR", e.message ?: "Failed to track custom event", e)
      }
    }
  }

  @ReactMethod
  fun overrideDefaultLocale(
    languageCode: String?,
    countryCode: String?,
    promise: Promise
  ) {
    coroutineScope.launch {
      try {
        val locale = when {
          languageCode != null && countryCode != null ->
            java.util.Locale(languageCode, countryCode)
          languageCode != null -> java.util.Locale(languageCode)
          else -> null
        }
        OctopusSDK.overrideDefaultLocale(locale)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject(
          "LOCALE_ERROR",
          e.message ?: "Failed to override default locale",
          e
        )
      }
    }
  }

  @ReactMethod
  fun overrideCommunityAccess(hasAccess: Boolean, promise: Promise) {
    coroutineScope.launch {
      try {
        OctopusSDK.overrideCommunityAccess(hasAccess)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject(
          "OVERRIDE_ERROR",
          e.message ?: "Failed to override community access",
          e
        )
      }
    }
  }

  /**
   * Tracks community access for analytics only. Does not change the actual access.
   * Use when the app manages its own A/B logic and only needs to report the value.
   */
  @ReactMethod
  fun trackCommunityAccess(hasAccess: Boolean, promise: Promise) {
    try {
      OctopusSDK.trackAccessToCommunity(hasAccess)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(
        "TRACK_ACCESS_ERROR",
        e.message ?: "Failed to track community access",
        e
      )
    }
  }

  @ReactMethod
  fun syncFollowGroups(rawActions: ReadableArray, promise: Promise) {
    if (rawActions.size() == 0) {
      promise.resolve(Arguments.createArray())
      return
    }
    val actions = mutableListOf<SyncFollowGroupAction>()
    for (i in 0 until rawActions.size()) {
      val entry = rawActions.getMap(i)
      val groupId = entry?.getString("groupId")
      val followed = entry?.takeIf { it.hasKey("followed") }?.getBoolean("followed")
      val actionDateMs = entry?.takeIf { it.hasKey("actionDateMs") }?.getDouble("actionDateMs")
      if (groupId == null || followed == null || actionDateMs == null) {
        // Skip malformed entries — match Flutter's tolerant behavior.
        continue
      }
      actions.add(
        SyncFollowGroupAction(
          groupId = groupId,
          followed = followed,
          actionDate = Date(actionDateMs.toLong())
        )
      )
    }
    coroutineScope.launch {
      try {
        when (val res = OctopusSDK.syncFollowGroups(actions)) {
          is OctopusResult.Success -> {
            val out: WritableArray = Arguments.createArray()
            for (r in res.data) {
              val item = WritableNativeMap()
              item.putString("groupId", r.groupId)
              item.putString("status", r.status.toWireValue())
              out.pushMap(item)
            }
            promise.resolve(out)
          }
          is OctopusResult.Failure -> {
            val (code, message) = when (res) {
              is OctopusResult.Failure.NoNetwork ->
                "no_network" to "No network"
              is OctopusResult.Failure.UserNotAuthenticated ->
                "not_connected" to (res.reason ?: "User not authenticated")
              is OctopusResult.Failure.PermissionDenied ->
                "not_connected" to (res.reason ?: "Permission denied")
              is OctopusResult.Failure.StatusError ->
                "server" to (res.description ?: "Server error ${res.code}")
              is OctopusResult.Failure.ContentUnavailable ->
                "other" to "Content unavailable"
              else -> "other" to res.toString()
            }
            promise.reject(code, message, null)
          }
        }
      } catch (e: Exception) {
        promise.reject("other", e.message ?: "Unknown error", e)
      }
    }
  }

  @ReactMethod
  fun setReaction(postId: String, reaction: String?, promise: Promise) {
    val reactionKind = if (reaction == null) {
      null
    } else {
      ReactionKindMapper.fromReactNativeString(reaction) ?: run {
        promise.reject("UNKNOWN_REACTION", "Unknown reaction: $reaction", null)
        return
      }
    }
    coroutineScope.launch {
      try {
        when (val res = OctopusSDK.setReaction(reaction = reactionKind, postId = postId)) {
          is OctopusResult.Success -> promise.resolve(null)
          is OctopusResult.Failure -> {
            val (code, message) = res.toSetReactionBridgeError()
            promise.reject(code, message, null)
          }
        }
      } catch (e: Exception) {
        promise.reject("SERVER_ERROR", e.message ?: "Unknown error", e)
      }
    }
  }

  @ReactMethod
  fun fetchCommunityData(profileId: String?, clientUserId: String?, promise: Promise) {
    if (profileId == null && clientUserId == null) {
      promise.reject("INVALID_ARGS", "One of profileId or clientUserId is required", null)
      return
    }
    coroutineScope.launch {
      try {
        val data = if (profileId != null) {
          OctopusSDK.fetchCommunityData(profileId)
        } else {
          OctopusSDK.fetchCommunityDataByClientUserId(clientUserId!!)
        }
        promise.resolve(data?.let { CommunityDataMapper.toWritableMap(it) })
      } catch (e: Exception) {
        promise.reject("SERVER_ERROR", e.message ?: "Failed to fetch community data", e)
      }
    }
  }

  @ReactMethod
  fun startObservingCommunityData(profileId: String?, clientUserId: String?, promise: Promise) {
    if (profileId == null && clientUserId == null) {
      promise.reject("INVALID_ARGS", "One of profileId or clientUserId is required", null)
      return
    }
    communityDataJob?.cancel()
    val flow = if (profileId != null) {
      OctopusSDK.communityDataFlow(profileId)
    } else {
      OctopusSDK.communityDataFlowByClientUserId(clientUserId!!)
    }
    // Only one observation is active at a time on this bridge: starting a new one replaces
    // whichever member was previously being observed. See startObservingCommunityData.ts.
    communityDataJob = coroutineScope.launch {
      flow.collect { data ->
        eventEmitter.emitCommunityDataChanged(data)
      }
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun stopObservingCommunityData(promise: Promise) {
    communityDataJob?.cancel()
    communityDataJob = null
    promise.resolve(null)
  }

  /**
   * Re-emits the current value of every reactive state channel (profile, groups, connection state,
   * initialization state).
   *
   * The JS layer caches those values to replay them to late subscribers, but it can only cache
   * what it received while listening — and `NativeEventEmitter` gives this module no usable "a
   * listener attached" signal (see `nativeEventGate.test.ts`), so JS asks explicitly the first
   * time it attaches. This is the React Native counterpart of the Flutter plugin re-sending its
   * snapshot from `onListen`.
   *
   * Emits nothing for a channel that has never produced a value; [OctopusSDK.isInitialised] is
   * always available, so that one is always emitted.
   *
   * Runs on [coroutineScope], i.e. the same main dispatcher the collectors write the cached values
   * from. A `@ReactMethod` is called on the native-modules thread, so reading the caches there
   * would race the collectors: the snapshot could carry a value already superseded by a live event
   * and reach JS *after* it, and JS overwrites its cache unconditionally. Hopping onto the
   * collectors' dispatcher serialises the read and the emission against them.
   */
  @ReactMethod
  fun requestStateSnapshot(promise: Promise) {
    coroutineScope.launch {
      eventEmitter.emitIsInitialisedChanged(OctopusSDK.isInitialised)
      if (hasProfile) {
        eventEmitter.emitProfileChanged(lastProfile)
      }
      lastGroups?.let { eventEmitter.emitGroupsChanged(it) }
      lastConnectionState?.let { eventEmitter.emitConnectionStateChanged(it) }
      promise.resolve(null)
    }
  }

  @OptIn(InternalOctopusApi::class)
  @ReactMethod
  fun debugOverrideProfileFieldsLock(lock: ReadableMap?, promise: Promise) {
    try {
      OctopusSDK.debugOverrideProfileFieldsLock(DebugOverrideMappers.toProfileFieldsLock(lock))
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(
        "OVERRIDE_ERROR",
        e.message ?: "Failed to override profile fields lock",
        e
      )
    }
  }

  @OptIn(InternalOctopusApi::class)
  @ReactMethod
  fun debugOverrideContentOptions(options: ReadableMap?, promise: Promise) {
    try {
      OctopusSDK.debugOverrideContentOptions(DebugOverrideMappers.toContentOptions(options))
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("OVERRIDE_ERROR", e.message ?: "Failed to override content options", e)
    }
  }

  @OptIn(InternalOctopusApi::class)
  @ReactMethod
  fun debugOverrideTermsAcceptanceMode(mode: String?, promise: Promise) {
    if (mode != null && DebugOverrideMappers.toTermsAcceptanceMode(mode) == null) {
      promise.reject("INVALID_ARGS", "Unknown terms acceptance mode: $mode", null)
      return
    }
    try {
      OctopusSDK.debugOverrideTermsAcceptanceMode(DebugOverrideMappers.toTermsAcceptanceMode(mode))
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(
        "OVERRIDE_ERROR",
        e.message ?: "Failed to override terms acceptance mode",
        e
      )
    }
  }

  @OptIn(InternalOctopusApi::class)
  @ReactMethod
  fun debugOverrideExposeClientUserId(enabled: ReadableMap?, promise: Promise) {
    // Tri-state travels as `{ value } | null` — a primitive boolean cannot carry
    // the "clear the override" case across the bridge.
    val value = enabled?.takeIf { it.hasKey("value") }?.getBoolean("value")
    try {
      OctopusSDK.debugOverrideExposeClientUserId(value)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(
        "OVERRIDE_ERROR",
        e.message ?: "Failed to override exposeClientUserId",
        e
      )
    }
  }

  /**
   * Debug-only read of the community config the backend currently serves (GetConfig), so the
   * sample can display the live server state next to the API key it runs on. Resolves `null`
   * while no config has been fetched yet. Values reflect any local `debugOverride*` too — this
   * reads the same effective config the UI consumes.
   */
  @ReactMethod
  fun debugGetCommunityConfig(promise: Promise) {
    coroutineScope.launch {
      try {
        val config = OctopusSDK.communityConfigRepository.getCommunityConfig()
        if (config == null) {
          promise.resolve(null)
          return@launch
        }
        promise.resolve(
          Arguments.createMap().apply {
            putBoolean("exposeClientUserId", config.exposeClientUserId)
            putBoolean("forceLoginOnStrongActions", config.forceLoginOnStrongActions)
            putBoolean("displayAccountAge", config.displayAccountAge)
            putString("termsAcceptanceMode", config.termsAcceptanceMode.name)
          }
        )
      } catch (e: Exception) {
        promise.reject(
          "CONFIG_ERROR",
          e.message ?: "Failed to read community config",
          e
        )
      }
    }
  }

  @ReactMethod
  fun navigateToOctopusCreatePost(options: ReadableMap?, promise: Promise) {
    val text = options?.takeIf { it.hasKey("text") }?.getString("text")
    val imageUri = options?.takeIf { it.hasKey("imageUri") }?.getString("imageUri")
    val topicId = options?.takeIf { it.hasKey("topicId") }?.getString("topicId")
    val ctaUrl = options?.takeIf { it.hasKey("ctaUrl") }?.getString("ctaUrl")
    val ctaLabel = options?.takeIf { it.hasKey("ctaLabel") }?.getString("ctaLabel")

    try {
      // Validate up front so a bad prefill rejects instead of opening the UI. OctopusActivity
      // repeats this exact build from the same raw fields once launched.
      PrefilledPostBuilder.build(reactApplicationContext, text, imageUri, topicId, ctaUrl, ctaLabel)
    } catch (e: OctopusPrefilledPost.ValidationError) {
      promise.reject(e.toBridgeErrorCode(), e.message, e)
      return
    } catch (e: Exception) {
      promise.reject("NAVIGATE_TO_CREATE_POST_ERROR", e.message ?: "Invalid prefilled post", e)
      return
    }

    try {
      val intent = Intent(reactApplicationContext, OctopusActivity::class.java)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      text?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_TEXT, it) }
      imageUri?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_IMAGE_URI, it) }
      topicId?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_TOPIC_ID, it) }
      ctaUrl?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_URL, it) }
      ctaLabel?.let { intent.putExtra(OctopusActivity.EXTRA_CREATE_POST_CTA_LABEL, it) }
      reactApplicationContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(
        "NAVIGATE_TO_CREATE_POST_ERROR",
        e.message ?: "Failed to open Octopus create-post UI",
        e
      )
    }
  }

  // Parity wave — lifecycle

  /**
   * Switches the SDK to a different community. Reuses the same `options` shape as
   * `initialize` (`apiKey` / `connectionMode` / `apiServer`) — see `SwitchCommunityParams` in
   * `src/switchCommunity.ts`. `OctopusSDK.switchCommunity` is a free function that is safe to
   * call even when the SDK is not yet initialised (it initialises directly on the new
   * community in that case), so unlike the iOS bridge, no cold-start fallback is needed here.
   *
   * [startObservingReactiveEvents] is (re-)called after the native call succeeds, for the
   * cold-start case: if `switchCommunity` is the very first lifecycle call (no prior
   * `initialize()`), nothing has ever started the collection jobs, so the bridge would
   * otherwise emit no reactive events at all despite the SDK being initialised. On the warm
   * path (the jobs are already running from a previous `initialize()`), this is a safe no-op
   * re-collection: every `start*Collection()` cancels its previous job first, and the
   * already-collected Flows would have re-bound to the new community's container on their own
   * per `OctopusSDK.switchCommunity`'s KDoc — matching the iOS bridge, which always calls its
   * equivalent after a cold-start `switchCommunity`.
   */
  @ReactMethod
  fun switchCommunity(options: ReadableMap, promise: Promise) {
    val apiKey = options.getString("apiKey")
    if (apiKey == null) {
      // Parity wave — lifecycle: wording matches iOS's equivalent guard
      // (`OctopusReactNativeSdk.swift`'s `switchCommunity`) for the same SWITCH_COMMUNITY_ERROR
      // code — both are new to this PR, unlike the pre-existing, differently-worded
      // INITIALIZE_ERROR "Missing API key" guard above, which is out of this PR's scope.
      promise.reject("SWITCH_COMMUNITY_ERROR", "apiKey is required")
      return
    }
    coroutineScope.launch {
      try {
        val connectionMode = sdkInitializer.parseConnectionMode(options)
        val deepLinksBasePaths = sdkInitializer.parseDeepLinksBasePaths(options)
        val apiServer = sdkInitializer.parseApiServer(options)
        OctopusSDK.switchCommunity(
          context = reactApplicationContext,
          apiKey = apiKey,
          connectionMode = connectionMode,
          deepLinksBasePaths = deepLinksBasePaths,
          apiServer = apiServer
        )
        startObservingReactiveEvents()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("SWITCH_COMMUNITY_ERROR", e.message ?: "Failed to switch community", e)
      }
    }
  }

  /**
   * Disconnects the current user and clears all locally cached data (and cached images). The
   * SDK remains initialised — mirrors native `OctopusSDK.reset()`.
   */
  @ReactMethod
  fun reset(promise: Promise) {
    coroutineScope.launch {
      try {
        OctopusSDK.reset()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("RESET_ERROR", e.message ?: "Failed to reset the Octopus SDK", e)
      }
    }
  }

  /**
   * Fully stops the SDK and releases its resources — mirrors native `OctopusSDK.stop()`. The
   * reactive collection jobs are deliberately left running: native `stop()` does not complete
   * those Flows, it only makes them stop emitting until the SDK is initialised again (see its
   * KDoc), so nothing here needs to cancel or restart them.
   */
  @ReactMethod
  fun stop(promise: Promise) {
    try {
      OctopusSDK.stop()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("STOP_ERROR", e.message ?: "Failed to stop the Octopus SDK", e)
    }
  }

  // Parity wave — groups & entitlements

  /**
   * The four methods below are the only ones on this module that guard on
   * [OctopusSDK.isInitialised] before calling into the native SDK, rejecting with a dedicated
   * `NOT_INITIALIZED` code rather than falling through to the call's generic per-method
   * fallback (`FETCH_GROUPS_ERROR`, `GROUP_FOLLOW_UNFOLLOW_ERROR`,
   * `REFRESH_ENTITLEMENTS_ERROR`). This matches the iOS side of this same parity wave and the
   * Flutter plugin's own `NOT_INITIALIZED` guard, and avoids a host that catches
   * `USER_NOT_CONNECTED`/`NOT_CONNECTED` — documented as "no user is connected" — reacting to a
   * missing `initialize()` call by prompting for login instead.
   */
  @ReactMethod
  fun fetchGroups(promise: Promise) {
    if (!OctopusSDK.isInitialised) {
      promise.reject("NOT_INITIALIZED", "SDK not initialized. Call initialize() first.", null)
      return
    }
    coroutineScope.launch {
      try {
        when (val res = OctopusSDK.fetchGroups()) {
          is OctopusResult.Success -> {
            val out: WritableArray = Arguments.createArray()
            for (group in res.data) {
              out.pushMap(group.toWritableMap())
            }
            promise.resolve(out)
          }
          is OctopusResult.Failure -> {
            val (code, message) = when (res) {
              is OctopusResult.Failure.NoNetwork -> "NO_NETWORK" to "No network"
              is OctopusResult.Failure.UserNotAuthenticated ->
                "NOT_CONNECTED" to (res.reason ?: "User not authenticated")
              is OctopusResult.Failure.PermissionDenied ->
                "NOT_CONNECTED" to (res.reason ?: "Permission denied")
              is OctopusResult.Failure.StatusError ->
                "SERVER_ERROR" to (res.description ?: "Server error ${res.code}")
              is OctopusResult.Failure.ContentUnavailable ->
                "CONTENT_UNAVAILABLE" to "Content unavailable"
              else -> "FETCH_GROUPS_ERROR" to res.toString()
            }
            promise.reject(code, message, null)
          }
        }
      } catch (e: Exception) {
        promise.reject("FETCH_GROUPS_ERROR", e.message ?: "Unknown error", e)
      }
    }
  }

  @ReactMethod
  fun followGroup(groupId: String, promise: Promise) {
    if (!OctopusSDK.isInitialised) {
      promise.reject("NOT_INITIALIZED", "SDK not initialized. Call initialize() first.", null)
      return
    }
    coroutineScope.launch {
      try {
        when (val res = OctopusSDK.followGroup(groupId)) {
          is OctopusResult.Success -> promise.resolve(null)
          is OctopusResult.Failure -> {
            val (code, message) = res.toGroupFollowUnfollowBridgeError()
            promise.reject(code, message, null)
          }
        }
      } catch (e: Exception) {
        promise.reject("GROUP_FOLLOW_UNFOLLOW_ERROR", e.message ?: "Unknown error", e)
      }
    }
  }

  @ReactMethod
  fun unfollowGroup(groupId: String, promise: Promise) {
    if (!OctopusSDK.isInitialised) {
      promise.reject("NOT_INITIALIZED", "SDK not initialized. Call initialize() first.", null)
      return
    }
    coroutineScope.launch {
      try {
        when (val res = OctopusSDK.unfollowGroup(groupId)) {
          is OctopusResult.Success -> promise.resolve(null)
          is OctopusResult.Failure -> {
            val (code, message) = res.toGroupFollowUnfollowBridgeError()
            promise.reject(code, message, null)
          }
        }
      } catch (e: Exception) {
        promise.reject("GROUP_FOLLOW_UNFOLLOW_ERROR", e.message ?: "Unknown error", e)
      }
    }
  }

  @ReactMethod
  fun refreshEntitlements(promise: Promise) {
    if (!OctopusSDK.isInitialised) {
      promise.reject("NOT_INITIALIZED", "SDK not initialized. Call initialize() first.", null)
      return
    }
    coroutineScope.launch {
      try {
        when (val res = OctopusSDK.refreshEntitlements()) {
          is OctopusResult.Success -> promise.resolve(null)
          is OctopusResult.Failure -> {
            val (code, message) = res.toRefreshEntitlementsBridgeError()
            promise.reject(code, message, null)
          }
        }
      } catch (e: Exception) {
        promise.reject("REFRESH_ENTITLEMENTS_ERROR", e.message ?: "Unknown error", e)
      }
    }
  }

  /**
   * Converts a ReadableMap to a Map<String, String>. Only string values are included;
   * other types are skipped so that the result is valid for TrackerEvent.Custom properties.
   */
  private fun readableMapToStringMap(map: ReadableMap?): Map<String, String> {
    if (map == null) return emptyMap()
    val result = mutableMapOf<String, String>()
    val iterator = map.keySetIterator()
    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()
      if (map.getType(key) == ReadableType.String) {
        map.getString(key)?.let { value -> result[key] = value }
      }
    }
    return result
  }

  private fun parseColor(colorString: String?): String? {
    if (colorString == null) return null

    return try {
      // Validate that the color string is a valid hex color
      android.graphics.Color.parseColor(colorString)
      // Return the original string if parsing succeeds
      colorString
    } catch (e: IllegalArgumentException) {
      // Invalid color format - return null to skip this color
      null
    }
  }

  private fun parseFontsConfig(fontsMap: ReadableMap): OctopusFontsConfig? {
    // Use pre-processed configuration from TypeScript layer
    val parsedConfig = fontsMap.getMap("parsedConfig")
    if (parsedConfig != null) {
      return parsePreProcessedFontsConfig(parsedConfig)
    }

    return null
  }

  private fun parsePreProcessedFontsConfig(parsedConfig: ReadableMap): OctopusFontsConfig? {
    val textStylesMap = parsedConfig.getMap("textStyles")
    val textStyles = mutableMapOf<String, OctopusTextStyleConfig>()

    // Parse pre-processed font configuration from TypeScript layer
    textStylesMap?.let { textStylesMap ->
      // `navBarItem` is deliberately NOT read here — iOS-only key, the native
      // Android `OctopusTypography` has no nav-bar-item slot to map it onto.
      // See the comment in `OctopusSDKInitializer.kt`.
      val textStyleKeys = arrayOf("title1", "title2", "body1", "body2", "caption1", "caption2")

      textStyleKeys.forEach { key ->
        val textStyleMap = textStylesMap.getMap(key)
        textStyleMap?.let { style ->
          val fontType = style.getString("fontType")
          val fontSize = if (style.hasKey("fontSize")) style.getDouble("fontSize") else Double.NaN

          if (fontType != null || (!fontSize.isNaN() && fontSize > 0)) {
            textStyles[key] = OctopusTextStyleConfig(
              fontType = fontType,
              fontSize = if (fontSize.isNaN() || fontSize <= 0) null else fontSize
            )
          }
        }
      }
    }

    // Theme-wide overrides — see the comment in `OctopusSDKInitializer.kt`.
    val fontFamily = parsedConfig.getString("fontFamily")?.takeIf { it.isNotBlank() }
    val fontWeight = if (parsedConfig.hasKey("fontWeight") && !parsedConfig.isNull("fontWeight")) {
      parsedConfig.getDouble("fontWeight").toInt()
    } else {
      null
    }

    // Only create fonts config if we have text styles or a theme-wide override: a theme
    // made only of `fontFamily` / `fontWeight` must not be dropped.
    if (textStyles.isNotEmpty() || fontFamily != null || fontWeight != null) {
      return OctopusFontsConfig(
        textStyles = textStyles,
        fontFamily = fontFamily,
        fontWeight = fontWeight
      )
    }

    return null
  }

  private fun startObservingReactiveEvents() {
    startNotSeenNotificationsCollection()
    startHasAccessToCommunityCollection()
    startEventsCollection()
    wireGroupAccessDeniedCallback()
    startProfileCollection()
    startGroupsCollection()
    startConnectionStateCollection()
  }

  /**
   * Parity wave — groups & entitlements. Unlike the `start*Collection` methods above, this is
   * not a `Flow` collection to cancel/restart: [OctopusSDK.setGroupAccessDeniedCallback] is a
   * last-write-wins field with no unset operation, so it is simply (re-)assigned here on every
   * `initialize()`. The event is emitted unconditionally — see `OctopusEventEmitter.sendEvent`
   * and `setGroupAccessDeniedCallback.ts` for why no listener-liveness tracking is needed.
   *
   * The lambda goes through the process-static [OctopusEventEmitter.instance] rather than
   * capturing this module's own `eventEmitter` field: `OctopusSDK` is a process-static
   * singleton with no unset for this callback, so capturing the module instance (and, through
   * it, its `ReactApplicationContext`) would retain it for the process lifetime, across every
   * React instance teardown/reload. Same convention as `OctopusContent.kt` and
   * `BridgeShareTokenBroker.kt`.
   */
  private fun wireGroupAccessDeniedCallback() {
    OctopusSDK.setGroupAccessDeniedCallback { groupId ->
      OctopusEventEmitter.instance?.emitGroupAccessDenied(groupId)
    }
  }

  private fun startNotSeenNotificationsCollection() {
    notSeenNotificationsJob?.cancel()
    notSeenNotificationsJob = coroutineScope.launch {
      OctopusSDK.notSeenNotificationsCount.collect { count ->
        eventEmitter.emitNotSeenNotificationsCountChanged(count)
      }
    }
  }

  private fun startHasAccessToCommunityCollection() {
    hasAccessToCommunityJob?.cancel()
    hasAccessToCommunityJob = coroutineScope.launch {
      OctopusSDK.hasAccessToCommunity.collect { hasAccess ->
        eventEmitter.emitHasAccessToCommunityChanged(hasAccess)
      }
    }
  }

  private fun startEventsCollection() {
    eventsJob?.cancel()
    eventsJob = coroutineScope.launch {
      OctopusSDK.events.collect { event ->
        val eventData = OctopusEventSerializer.serializeEvent(event)
        if (eventData != null) {
          eventEmitter.emitSDKEvent(eventData)
        }
      }
    }
  }

  private fun startProfileCollection() {
    profileJob?.cancel()
    profileJob = coroutineScope.launch {
      OctopusSDK.profile.collect { profile ->
        hasProfile = true
        lastProfile = profile
        eventEmitter.emitProfileChanged(profile)
      }
    }
  }

  private fun startGroupsCollection() {
    groupsJob?.cancel()
    groupsJob = coroutineScope.launch {
      OctopusSDK.groups.collect { groups ->
        lastGroups = groups
        eventEmitter.emitGroupsChanged(groups)
      }
    }
  }

  private fun startConnectionStateCollection() {
    connectionStateJob?.cancel()
    connectionStateJob = coroutineScope.launch {
      OctopusSDK.connectionState.collect { state ->
        lastConnectionState = state
        eventEmitter.emitConnectionStateChanged(state)
      }
    }
  }

  /**
   * Collects the process-static [OctopusSDK.isInitialisedFlow] for the whole module lifetime
   * (independent of `initialize`, so it also carries the pre-init `false` state). Mirrors the
   * Flutter plugin, which starts the same collection from `onAttachedToEngine`.
   */
  private fun startIsInitialisedCollection() {
    isInitialisedJob?.cancel()
    isInitialisedJob = coroutineScope.launch {
      OctopusSDK.isInitialisedFlow.collect { isInitialised ->
        eventEmitter.emitIsInitialisedChanged(isInitialised)
      }
    }
  }

  /**
   * Stops every collection when React Native tears the module down (a dev reload, or the host
   * destroying the React instance).
   *
   * [startIsInitialisedCollection] runs for the module's whole lifetime rather than only between
   * `initialize` and `stop`, and [OctopusSDK.isInitialisedFlow] is process-static: without this,
   * each reload would leave another collector alive, holding this module — and its
   * [ReactApplicationContext] — behind a flow that outlives them both.
   */
  override fun invalidate() {
    coroutineScope.cancel()
    super.invalidate()
  }

  // region Parity wave — client-object bridge

  /**
   * Fetches the bridge post linked to a client object, creating it on first call.
   *
   * The token provider is taken from [BridgeShareTokenBroker] rather than from a call
   * parameter: a `suspend` lambda cannot cross the React Native bridge, so JS registers one
   * signer globally (`addBridgeShareTokenRequestListener`) and every signing path — this one
   * and the create-post editor's prefilled share — consults it. When JS registered none,
   * `providerOrNull()` returns `null` and the native SDK creates the post unsigned, matching
   * the optional `tokenProvider` parameter's own default.
   */
  @ReactMethod
  fun fetchOrCreateClientObjectRelatedPost(clientPost: ReadableMap, promise: Promise) {
    val decoded = try {
      ClientObjectBridge.decodeClientPost(reactApplicationContext, clientPost)
    } catch (e: IllegalArgumentException) {
      promise.reject("INVALID_ARGS", e.message ?: "Invalid clientPost", e)
      return
    }
    coroutineScope.launch {
      try {
        val res = OctopusSDK.fetchOrCreateClientObjectRelatedPost(
          clientPost = decoded,
          tokenProvider = BridgeShareTokenBroker.providerOrNull()
        )
        when (res) {
          is OctopusResult.Success ->
            promise.resolve(ClientObjectBridge.serializeOctopusPost(res.data))

          is OctopusResult.Failure -> {
            val (code, message) = res.toClientPostBridgeError()
            promise.reject(code, message, null)
          }
        }
      } catch (e: Exception) {
        promise.reject("CLIENT_POST_ERROR", e.message ?: "Unknown error", e)
      }
    }
  }

  /**
   * Starts a per-subscription observation of the bridge post for [clientObjectId], forwarding
   * each emission (the post, or `null`) as a `clientObjectPostChanged` event tagged with
   * [observationId]. The first emission replays the current value to the JS listener that just
   * subscribed.
   */
  @ReactMethod
  fun startObservingClientObjectRelatedPost(
    observationId: String,
    clientObjectId: String,
    promise: Promise
  ) {
    clientObjectPostJobs.remove(observationId)?.cancel()
    // Built before the coroutine and inside a try/catch. Calling this before initialize()
    // throws; a synchronous throw out of a @ReactMethod is NOT turned into a promise
    // rejection by React Native — it surfaces as a red box and the promise is never settled,
    // so the `.catch` documented on addClientObjectRelatedPostListener would never run.
    // Rejecting explicitly is what makes that contract true, and it matches the iOS
    // `guard let octopus` branch, code string included.
    val flow = try {
      OctopusSDK.getClientObjectRelatedPostFlow(clientObjectId)
    } catch (e: Exception) {
      promise.reject(
        "START_OBSERVING_CLIENT_OBJECT_POST_ERROR",
        e.message ?: "Failed to start observing the client object related post",
        e
      )
      return
    }
    clientObjectPostJobs[observationId] = coroutineScope.launch {
      try {
        flow.collect { post ->
          eventEmitter.emitClientObjectPostChanged(
            observationId,
            post?.let { ClientObjectBridge.serializeOctopusPost(it) }
          )
        }
      } catch (e: CancellationException) {
        // Ordinary teardown (stopObservingClientObjectRelatedPost, or a re-subscribe on the
        // same id). Rethrow so cancellation keeps propagating — swallowing it would break
        // structured concurrency and log an error for an unsubscribe.
        throw e
      } catch (e: Exception) {
        android.util.Log.e(NAME, "Client object post observation failed", e)
      }
    }
    promise.resolve(null)
  }

  /** Tears down the observation started under [observationId]. Unknown ids are a no-op. */
  @ReactMethod
  fun stopObservingClientObjectRelatedPost(observationId: String, promise: Promise) {
    clientObjectPostJobs.remove(observationId)?.cancel()
    promise.resolve(null)
  }

  @ReactMethod
  fun registerNavigateToClientObjectCallback(promise: Promise) {
    ClientObjectBridge.registerNavigateCallback()
    promise.resolve(null)
  }

  @ReactMethod
  fun unregisterNavigateToClientObjectCallback(promise: Promise) {
    ClientObjectBridge.unregisterNavigateCallback()
    promise.resolve(null)
  }

  // endregion

  companion object {
    const val NAME = "OctopusReactNativeSdk"
  }

  init {
    OctopusEventEmitter.instance = eventEmitter
    startIsInitialisedCollection()
  }
}

private fun SyncFollowGroupStatus.toWireValue(): String = when (this) {
  SyncFollowGroupStatus.Applied -> "applied"
  SyncFollowGroupStatus.Skipped -> "skipped"
  SyncFollowGroupStatus.GroupNotFound -> "group_not_found"
  SyncFollowGroupStatus.NotFollowable -> "not_followable"
  SyncFollowGroupStatus.NotUnfollowable -> "not_unfollowable"
  SyncFollowGroupStatus.AlreadyFollowed -> "already_followed"
  SyncFollowGroupStatus.AlreadyUnfollowed -> "already_unfollowed"
  SyncFollowGroupStatus.UnknownError -> "unknown_error"
}

/**
 * Maps a failed `OctopusSDK.setReaction` result to the bridge (code, message) pair matching
 * `SetReactionErrorCode` in `src/types/setReactionError.ts`. `SetReactionError` values travel
 * inside [OctopusResult.Failure.InvalidArguments] — see the KDoc on `OctopusSDK.setReaction`.
 * An `else` branch (rather than an exhaustive `when`) follows this file's `syncFollowGroups`
 * precedent, staying forward-compatible with future sealed-subtype additions.
 */
private fun OctopusResult.Failure<SetReactionError>.toSetReactionBridgeError(): Pair<String, String> =
  when (this) {
    is OctopusResult.Failure.NoNetwork -> "NO_NETWORK" to "No network"
    is OctopusResult.Failure.UserNotAuthenticated -> "NOT_CONNECTED" to (reason ?: "User not authenticated")
    is OctopusResult.Failure.PermissionDenied -> "NOT_CONNECTED" to (reason ?: "Permission denied")
    is OctopusResult.Failure.StatusError -> "SERVER_ERROR" to (description ?: "Server error $code")
    is OctopusResult.Failure.ContentUnavailable -> "SERVER_ERROR" to "Content unavailable"
    is OctopusResult.Failure.InvalidArguments -> {
      val code = when (error) {
        is SetReactionError.UnknownReaction -> "UNKNOWN_REACTION"
        is SetReactionError.PostNotFound -> "POST_NOT_FOUND"
        else -> "SET_REACTION_ERROR"
      }
      code to error.errorMessage
    }
    else -> "SERVER_ERROR" to toString()
  }

// Parity wave — groups & entitlements

/**
 * Converts an [OctopusGroup] to its lean, cross-platform-shared wire shape matching
 * `OctopusGroup` in `src/types/group.ts`. Richer Android-only fields (parent id, dates,
 * description, sections…) are deliberately not exposed on this bridge.
 */
private fun OctopusGroup.toWritableMap(): WritableNativeMap {
  val map = WritableNativeMap()
  map.putString("id", id)
  map.putString("name", name)
  map.putBoolean("isFollowed", isFollowed)
  map.putBoolean("canChangeFollowStatus", canChangeFollowStatus)
  map.putBoolean("canAccess", canAccess)
  map.putBoolean("canCreateChildren", canCreateChildren)
  return map
}

/**
 * Maps a failed `OctopusSDK.followGroup` / `unfollowGroup` result to the bridge (code, message)
 * pair matching `GroupFollowUnfollowErrorCode` in `src/types/groupFollowUnfollowError.ts`.
 * `GroupFollowUnfollowError` values travel inside [OctopusResult.Failure.InvalidArguments].
 */
private fun OctopusResult.Failure<GroupFollowUnfollowError>.toGroupFollowUnfollowBridgeError():
  Pair<String, String> =
  when (this) {
    is OctopusResult.Failure.NoNetwork -> "NO_NETWORK" to "No network"
    is OctopusResult.Failure.UserNotAuthenticated -> "NOT_CONNECTED" to (reason ?: "User not authenticated")
    is OctopusResult.Failure.PermissionDenied -> "NOT_CONNECTED" to (reason ?: "Permission denied")
    is OctopusResult.Failure.StatusError -> "SERVER_ERROR" to (description ?: "Server error $code")
    is OctopusResult.Failure.ContentUnavailable -> "SERVER_ERROR" to "Content unavailable"
    is OctopusResult.Failure.InvalidArguments -> {
      val code = when (error) {
        is GroupFollowUnfollowError.MissingGroup -> "MISSING_GROUP"
        is GroupFollowUnfollowError.UnfollowableGroup -> "UNFOLLOWABLE_GROUP"
        is GroupFollowUnfollowError.GroupAlreadyFollowed -> "GROUP_ALREADY_FOLLOWED"
        is GroupFollowUnfollowError.GroupAlreadyUnfollowed -> "GROUP_ALREADY_UNFOLLOWED"
        is GroupFollowUnfollowError.LastFollowedGroup -> "LAST_FOLLOWED_GROUP"
        else -> "GROUP_FOLLOW_UNFOLLOW_ERROR"
      }
      code to error.errorMessage
    }
    else -> "GROUP_FOLLOW_UNFOLLOW_ERROR" to toString()
  }

/**
 * Maps a failed `OctopusSDK.refreshEntitlements` result to the bridge (code, message) pair
 * matching `RefreshEntitlementsErrorCode` in `src/types/refreshEntitlementsError.ts`.
 * `RefreshEntitlementsError` values travel inside [OctopusResult.Failure.InvalidArguments] —
 * see `RefreshEntitlementsUseCase`, which always wraps its business error that way, including
 * its own `NoNetwork` / `UserBanned` cases rather than the connection-level `OctopusResult.Failure`
 * ones.
 */
private fun OctopusResult.Failure<RefreshEntitlementsError>.toRefreshEntitlementsBridgeError():
  Pair<String, String> =
  when (this) {
    is OctopusResult.Failure.NoNetwork -> "NO_NETWORK" to "No network"
    is OctopusResult.Failure.UserNotAuthenticated -> "USER_NOT_CONNECTED" to (reason ?: "User not authenticated")
    is OctopusResult.Failure.PermissionDenied -> "USER_NOT_CONNECTED" to (reason ?: "Permission denied")
    is OctopusResult.Failure.StatusError -> "SERVER_ERROR" to (description ?: "Server error $code")
    is OctopusResult.Failure.ContentUnavailable -> "SERVER_ERROR" to "Content unavailable"
    is OctopusResult.Failure.InvalidArguments -> {
      val code = when (error) {
        is RefreshEntitlementsError.NoClientTokenProvider -> "NO_CLIENT_TOKEN_PROVIDER"
        is RefreshEntitlementsError.UserNotConnected -> "USER_NOT_CONNECTED"
        is RefreshEntitlementsError.NoNetwork -> "NO_NETWORK"
        is RefreshEntitlementsError.UserBanned -> "USER_BANNED"
        is RefreshEntitlementsError.ServerError -> "SERVER_ERROR"
        else -> "REFRESH_ENTITLEMENTS_ERROR"
      }
      code to error.errorMessage
    }
    else -> "REFRESH_ENTITLEMENTS_ERROR" to toString()
  }

/**
 * Maps an [OctopusPrefilledPost.ValidationError] to the matching
 * `NavigateToOctopusCreatePostErrorCode` in `src/types/navigateToOctopusCreatePostError.ts`.
 *
 * Internal (not private): [OctopusUIController.openUI] validates a `createPost` initial screen
 * with the same codes.
 */
internal fun OctopusPrefilledPost.ValidationError.toBridgeErrorCode(): String = when (this) {
  is OctopusPrefilledPost.ValidationError.TextTooShort -> "TEXT_TOO_SHORT"
  is OctopusPrefilledPost.ValidationError.TextTooLong -> "TEXT_TOO_LONG"
  OctopusPrefilledPost.ValidationError.CtaLabelEmpty -> "CTA_LABEL_EMPTY"
  OctopusPrefilledPost.ValidationError.CtaUrlEmpty -> "CTA_URL_EMPTY"
  OctopusPrefilledPost.ValidationError.ContentEmpty -> "NAVIGATE_TO_CREATE_POST_ERROR"
}
