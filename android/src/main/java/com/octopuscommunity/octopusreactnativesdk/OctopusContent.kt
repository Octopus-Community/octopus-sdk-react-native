package com.octopuscommunity.octopusreactnativesdk

import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.toColorInt
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.octopuscommunity.sdk.domain.model.CreatePostScreenInfo
import com.octopuscommunity.sdk.ui.OctopusImagesDefaults
import com.octopuscommunity.sdk.ui.OctopusTheme
import com.octopuscommunity.sdk.ui.OctopusTypography
import com.octopuscommunity.sdk.ui.OctopusTypographyDefaults
import com.octopuscommunity.sdk.ui.components.NavigationIconType
import com.octopuscommunity.sdk.ui.components.OctopusTopAppBarDefaults
import com.octopuscommunity.sdk.ui.components.UrlOpeningStrategy
import com.octopuscommunity.sdk.ui.OctopusDestination
import com.octopuscommunity.sdk.ui.home.OctopusHomeContent
import com.octopuscommunity.sdk.ui.home.OctopusHomeDefaults
import com.octopuscommunity.sdk.ui.home.OctopusHomeScreen
import com.octopuscommunity.sdk.ui.navigateToOctopusActivity
import com.octopuscommunity.sdk.ui.navigateToOctopusActivityByClientUserId
import com.octopuscommunity.sdk.ui.navigateToOctopusCreatePost
import com.octopuscommunity.sdk.ui.navigateToOctopusGroup
import com.octopuscommunity.sdk.ui.navigateToOctopusPost
import com.octopuscommunity.sdk.ui.navigateToOctopusProfileByClientUserId
import com.octopuscommunity.sdk.ui.octopusComposables
import com.octopuscommunity.sdk.ui.octopusDarkColorScheme
import com.octopuscommunity.sdk.ui.octopusLightColorScheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL
import java.util.concurrent.ConcurrentHashMap

// Cache for loaded images to avoid reloading on recomposition
private val imageCache = ConcurrentHashMap<String, Painter>()

// Cache for drawable resources list to avoid repeated reflection
private var cachedDrawableResources: List<String>? = null

/**
 * Ouvre une URL externe par défaut, en Custom Tab (parité avec l'ouvreur natif du SDK).
 * Fallback ACTION_VIEW si aucune app compatible Custom Tabs, puis échec silencieux
 * si aucune app ne peut ouvrir l'URL (comportement aligné sur OctopusUIController.openUrlInBrowser).
 */
private fun openUrlInCustomTab(context: Context, url: String) {
  val uri = Uri.parse(url)
  try {
    CustomTabsIntent.Builder().build().launchUrl(context, uri)
  } catch (e: Exception) {
    try {
      context.startActivity(
        Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    } catch (e2: Exception) {
      Log.w("OctopusContent", "No app can open URL: $url", e2)
    }
  }
}

/** Shared composable for both fullscreen Activity and embedded ViewManager. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun OctopusContent(
  modifier: Modifier = Modifier,
  backButton: Boolean = false,
  interceptUrls: Boolean = false,
  interceptProfileTaps: Boolean = false,
  onBack: () -> Unit = {},
  linkPath: String? = null,
  createPostInfo: CreatePostScreenInfo? = null,
  initialScreen: BridgeInitialScreen? = null,
  // Embedded-path-only fallback (see OctopusUIViewManager / OctopusBottomInsetResolver, issue
  // #120): the bottom inset that overlaps the mount point, in pixels. Ignored whenever the host
  // configured `ui.bottomSafeAreaInset` at all (OctopusUIConfigurationManager), including an
  // explicit 0 — an absent configuration is what makes this fallback apply, not a small one.
  // The fullscreen path (OctopusActivity) never passes this, so it stays additive as before.
  mountPointBottomInsetPx: Int = 0,

  // Parity wave — navigation & theme. Per-call overrides for the embedded path (RN's analog
  // of Flutter's embeddedView); the fullscreen path (OctopusActivity) never passes these, so
  // it keeps relying on the global OctopusTopAppBarManager config as before.
  /**
   * `null` (default) falls back to the global `topAppBar` title configured at `initialize()`,
   * then to the community name — unchanged from before this wave. A non-null value overrides
   * both for this call only.
   */
  navBarTitleOverride: String? = null,
  /** `null` (default) falls back to the global `topAppBar` config, then to `false`. */
  titleCenteredOverride: Boolean? = null,
  /** `null` (default) falls back to the global `topAppBar` config, then to `false`. */
  navBarPrimaryColorOverride: Boolean? = null,
  /**
   * When `false`, mounts the no-chrome [OctopusHomeContent] instead of [OctopusHomeScreen] —
   * the host is then expected to render its own title chrome. Mirrors the Flutter Android
   * embedding's `showNavBar`. Not consulted by the fullscreen path, which always shows a top
   * app bar.
   */
  showNavBar: Boolean = true,
  /**
   * Overrides the top app bar's leading icon regardless of [backButton]. `null` (default)
   * keeps the native default: a back arrow gated by [backButton]. Has no effect when
   * [showNavBar] is `false` — [OctopusHomeContent] renders no top app bar to put an icon on.
   */
  navBarLeadingAction: NavigationIconType? = null,
) {
  val context = LocalContext.current

  // Snapshot-state read: a setThemeMode() / system change or a re-initialize() while this UI is
  // on screen recomposes it with the new config.
  val storedThemeConfig = OctopusThemeManager.getThemeConfig()

  // Function to detect if system is in dark mode
  fun isSystemInDarkTheme(): Boolean {
    return (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
  }

  // The scheme JS sent (forced by setThemeMode, else the one it observes) wins; the Activity's
  // configuration is the fallback. A dual-mode theme is re-selected for that mode here, at
  // render time — parseThemeConfig picked a set once at initialize(), which is exactly what
  // went stale after a mode change (rn#215).
  val isDarkMode = when (storedThemeConfig?.colorScheme) {
    "dark" -> true
    "light" -> false
    else -> isSystemInDarkTheme()
  }
  val themeConfig = storedThemeConfig?.resolvedFor(isDarkMode)

  // Handle logo loading using built-in Android capabilities
  var logoPainter by remember { mutableStateOf<Painter?>(null) }

  LaunchedEffect(themeConfig?.logoSource) {
    themeConfig?.logoSource?.let { logoSource ->
      val uri = logoSource.getString("uri")
      if (uri != null) {
        logoPainter = loadImageFromUri(uri, context)
      } else {
        logoPainter = null
      }
    } ?: run {
      // No theme config or no logo source
      logoPainter = null
    }
  }

  // Create images based on theme config
  val currentLogo = logoPainter
  val images = if (currentLogo != null) {
    OctopusImagesDefaults.images(logo = { currentLogo })
  } else {
    OctopusImagesDefaults.images()
  }

  // Resolve the theme-wide font overrides once: the family is a `res/font/` resource
  // name that only this context can look up, and both are needed twice below — for the
  // typography and for the nav-bar title style.
  val resolvedFontFamily = resolveFontFamily(themeConfig?.fonts?.fontFamily, context)
  val resolvedFontWeight = themeConfig?.fonts?.fontWeight?.let { FontWeight(it.coerceIn(100, 900)) }

  // Create typography based on theme config
  val typography = createCustomTypography(themeConfig, resolvedFontFamily, resolvedFontWeight)
  val uiConfiguration = OctopusUIConfigurationManager.getUIConfiguration()
  val topAppBarConfig = OctopusTopAppBarManager.getConfig()

  // An explicit host configuration always wins, including an explicit 0 (see
  // OctopusSDKInitializer.parseUIConfiguration: a `0` reaches here as a non-null
  // OctopusUIConfiguration, distinct from an absent one). Only when the host configured
  // nothing at all do we fall back to the geometric mount-point resolution — issue #120.
  val bottomContentPadding = uiConfiguration?.bottomContentPadding?.toFloat()?.dp
    ?: mountPointBottomInsetPx.takeIf { it > 0 }?.let { with(LocalDensity.current) { it.toDp() } }

  // Unified Profile activation switch. The native SDK keys the feature on this callback
  // being non-null, so it stays null unless the host asked to take profile taps over:
  // handing it a callback that emits into a JS side with no listener would replace the
  // SDK's own profile screens with a dead end.
  val onNavigateToProfile: ((clientUserId: String) -> Unit)? = if (interceptProfileTaps) {
    { clientUserId -> OctopusEventEmitter.instance?.emitNavigateToProfile(clientUserId) }
  } else {
    null
  }

  // Parity wave — client-object bridge. Same activation switch as `onNavigateToProfile`
  // above: the native SDK keys the bridge post's "view object" button on this callback being
  // non-null, so it stays null until JS registers a handler
  // (`setNavigateToClientObjectCallback`). Read here, at composition — a registration made
  // while the UI is already on screen only takes effect the next time it opens, which is what
  // the JS doc says.
  val onNavigateToClientObject: ((String) -> Unit)? = ClientObjectBridge.navigateCallbackOrNull()

  // Resolve the final color scheme (base + custom overrides) once, so it can be
  // reused for both the theme colors and the colored nav-bar background.
  //
  // The base palette is picked from the *host background* when there is one, and only
  // otherwise from the requested / system color scheme. This mirrors the native SDK's own
  // fallback resolution (Android SDK 1.12.1+, `ColorScheme.toOctopusColorScheme`), which
  // this wrapper bypasses by always handing `OctopusTheme` an explicit palette: keyed on
  // the system setting alone, a light-only host running on a device in dark mode got the
  // dark palette — near-black `primaryLow` behind unread notifications, gray-based text
  // tuned for a dark surface — painted over its light background. Tracking the background
  // keeps every slot the host did not set in contrast with the surface it is drawn on.
  // Hosts passing a background per mode are unaffected: their background already agrees
  // with the scheme it was declared for.
  val hostBackground = themeConfig?.backgroundColor?.let { Color(it.toColorInt()) }
  val baseColorScheme = when {
    hostBackground != null ->
      if (hostBackground.luminance() < 0.5f) octopusDarkColorScheme() else octopusLightColorScheme()
    isDarkMode -> octopusDarkColorScheme()
    else -> octopusLightColorScheme()
  }
  val resolvedColorScheme = baseColorScheme.copy(
    primary = themeConfig?.primaryColor?.let { Color(it.toColorInt()) } ?: baseColorScheme.primary,
    primaryLow = themeConfig?.primaryLowContrastColor?.let { Color(it.toColorInt()) } ?: baseColorScheme.primaryLow,
    primaryHigh = themeConfig?.primaryHighContrastColor?.let { Color(it.toColorInt()) } ?: baseColorScheme.primaryHigh,
    onPrimary = themeConfig?.onPrimaryColor?.let { Color(it.toColorInt()) } ?: baseColorScheme.onPrimary,
    link = themeConfig?.linkColor?.let { Color(it.toColorInt()) } ?: baseColorScheme.link,
    background = hostBackground ?: baseColorScheme.background
  )

  // The top app bar title has no dedicated typography role of its own: the SDK renders it
  // with the ambient `LocalTextStyle` unless a style is passed explicitly, and the style
  // we pass REPLACES that ambient style instead of merging with it. A bare
  // `TextStyle(fontFamily = ...)` would therefore drop the ambient font size too, so a
  // complete style has to be supplied — and the ambient one is not readable from this call
  // site, only from inside the title slot.
  //
  // Known consequence, matching Flutter: basing the style on the resolved `body1` means a
  // host that sets only a font override also gets the nav-bar title at body1's size,
  // smaller than the default title size. `textStyles.body1.fontSize` is the knob to take
  // it back. Documented on `OctopusFonts.fontFamily` and in the changeset.
  //
  // Only build an explicit style at all when a font override is requested, so the default
  // path keeps the ambient style untouched.
  val navBarTitleTextStyle = if (resolvedFontFamily != null || resolvedFontWeight != null) {
    typography.body1.copy(
      fontFamily = resolvedFontFamily ?: typography.body1.fontFamily,
      fontWeight = resolvedFontWeight ?: typography.body1.fontWeight
    )
  } else {
    null
  }
  val octopusTopAppBarTitle = navBarTitleTextStyle?.let {
    OctopusTopAppBarDefaults.title(textStyle = it)
  }

  // Parity wave — navigation & theme: a per-call override wins over the global topAppBar
  // config, which wins over the plain default — same precedence for all three overrides.
  val effectiveColoredBackground = navBarPrimaryColorOverride ?: topAppBarConfig?.coloredBackground ?: false

  // Build a primary-colored top app bar when requested; otherwise use the default.
  val octopusTopAppBar = if (effectiveColoredBackground) {
    OctopusTopAppBarDefaults.topAppBar(
      title = octopusTopAppBarTitle ?: OctopusTopAppBarDefaults.title(),
      colors = TopAppBarDefaults.topAppBarColors(
        containerColor = resolvedColorScheme.primary,
        titleContentColor = resolvedColorScheme.onPrimary,
        navigationIconContentColor = resolvedColorScheme.onPrimary,
        actionIconContentColor = resolvedColorScheme.onPrimary
      )
    )
  } else {
    OctopusTopAppBarDefaults.topAppBar(
      title = octopusTopAppBarTitle ?: OctopusTopAppBarDefaults.title()
    )
  }

  // Apply theme with custom colors, logo, typography, content padding, and top app bar
  OctopusTheme(
    colorScheme = resolvedColorScheme,
    images = images,
    typography = typography,
    topAppBar = octopusTopAppBar
  ) {
    val navController = rememberNavController()

    NavHost(
      modifier = modifier,
      navController = navController,
      startDestination = "OctopusHome"
    ) {
      composable(route = "OctopusHome") {
        val contentPadding = if (bottomContentPadding != null) {
          OctopusHomeDefaults.contentPadding(bottom = bottomContentPadding)
        } else {
          OctopusHomeDefaults.contentPadding()
        }
        val resolvedOnNavigateToUrl = { url: String ->
          if (interceptUrls) {
            OctopusEventEmitter.instance?.emitNavigateToUrl(url)
            UrlOpeningStrategy.HandledByApp
          } else {
            openUrlInCustomTab(context, url)
            UrlOpeningStrategy.HandledByApp
          }
        }
        if (showNavBar) {
          OctopusHomeScreen(
            navController = navController,
            titleText = navBarTitleOverride ?: topAppBarConfig
              ?.takeIf { it.titleType == "text" }
              ?.titleText,
            titleCentered = titleCenteredOverride ?: topAppBarConfig?.centered ?: false,
            contentPadding = contentPadding,
            backIcon = backButton,
            leadingNavigationIcon = navBarLeadingAction,
            onBack = onBack,
            onNavigateToLogin = {
              OctopusEventEmitter.instance?.emitLoginRequired()
            },
            onNavigateToProfileEdit = { fieldToEdit ->
              OctopusEventEmitter.instance?.emitEditUser(fieldToEdit)
            },
            onNavigateToUrl = resolvedOnNavigateToUrl,
            onNavigateToProfile = onNavigateToProfile,
            onNavigateToClientObject = onNavigateToClientObject
          )
        } else {
          // Mirrors the Flutter Android embedding's `showNavBar = false` branch: no top app
          // bar at all, so titleText/titleCentered/backIcon/navBarLeadingAction have nothing
          // to apply to and are dropped here on purpose.
          OctopusHomeContent(
            navController = navController,
            contentPadding = contentPadding,
            onNavigateToLogin = {
              OctopusEventEmitter.instance?.emitLoginRequired()
            },
            onNavigateToProfileEdit = { fieldToEdit ->
              OctopusEventEmitter.instance?.emitEditUser(fieldToEdit)
            },
            onNavigateToUrl = resolvedOnNavigateToUrl,
            onNavigateToProfile = onNavigateToProfile,
            onNavigateToClientObject = onNavigateToClientObject
          )
        }
      }
      octopusComposables(
        navController = navController,
        // Propagate the host bottom content padding to the SDK sub-screens too
        // (post/comment detail, create-post, …), not just the main feed above. The
        // embedded platform view consumes the system-bar insets, so without this the
        // post-detail's bottom comment composer renders inside the gesture nav area
        // and gets clipped — same gap Flutter fixed in flutter#147 (issue #54).
        container = { _, content ->
          OctopusTheme {
            // Gate on > 0 like Flutter does: an explicit host 0 must stay a true
            // no-op, not a zero-padding Box wrapping the screen.
            val subScreenBottomPadding = bottomContentPadding?.takeIf { it > 0.dp }
            if (subScreenBottomPadding != null) {
              Box(Modifier.padding(bottom = subScreenBottomPadding)) {
                content()
              }
            } else {
              content()
            }
          }
        },
        onBack = onBack,
        onNavigateToLogin = {
          OctopusEventEmitter.instance?.emitLoginRequired()
        },
        onNavigateToProfileEdit = { fieldToEdit ->
          OctopusEventEmitter.instance?.emitEditUser(fieldToEdit)
        },
        onNavigateToUrl = { url: String ->
          if (interceptUrls) {
            OctopusEventEmitter.instance?.emitNavigateToUrl(url)
            UrlOpeningStrategy.HandledByApp
          } else {
            openUrlInCustomTab(context, url)
            UrlOpeningStrategy.HandledByApp
          }
        },
        onNavigateToProfile = onNavigateToProfile,
        onNavigateToClientObject = onNavigateToClientObject
      )
    }

    linkPath?.takeIf { it.isNotBlank() }?.let { link ->
      LaunchedEffect(link) {
        try {
          navController.navigate(Uri.parse("octopus-sdk://$link"))
        } catch (e: Exception) {
          Log.w("OctopusContent", "Deep link navigation failed: $link", e)
        }
      }
    }

    createPostInfo?.let { info ->
      LaunchedEffect(info) {
        try {
          navController.navigateToOctopusCreatePost(info)
        } catch (e: Exception) {
          Log.w("OctopusContent", "navigateToOctopusCreatePost failed", e)
        }
      }
    }

    // Bridge-mode initial screens navigate on top of the home destination, so the system back
    // from the initial screen reaches the main feed — consistent with the shipped createPost
    // and notification deep-link behavior above.
    initialScreen?.let { screen ->
      LaunchedEffect(screen) {
        try {
          when (screen) {
            is BridgeInitialScreen.Post ->
              navController.navigateToOctopusPost(postId = screen.postId)
            is BridgeInitialScreen.Group ->
              navController.navigateToOctopusGroup(groupId = screen.groupId)
            is BridgeInitialScreen.MemberActivity ->
              screen.clientUserId
                ?.let { navController.navigateToOctopusActivityByClientUserId(it) }
                ?: screen.profileId?.let { navController.navigateToOctopusActivity(it) }
            is BridgeInitialScreen.Profile ->
              screen.clientUserId
                ?.let { navController.navigateToOctopusProfileByClientUserId(it) }
                // No id: the connected user's own, editable profile.
                ?: navController.navigate(OctopusDestination.CurrentUserProfileGraph)
          }
        } catch (e: Exception) {
          Log.w("OctopusContent", "Initial screen navigation failed: $screen", e)
        }
      }
    }
  }
}

/**
 * Resolves a theme-wide `fontFamily` from a native Android font resource.
 *
 * The name is never resolved from the JavaScript bundle: the SDK's screens are a Compose
 * tree, so the font has to be a resource the host app ships under `res/font/` — which is
 * what linking it with `react-native-asset` does. `res/font/my_brand_font.ttf` is passed
 * as `'my_brand_font'`. When nothing matches, log a warning and keep the SDK's own font
 * rather than dropping the request silently.
 */
private fun resolveFontFamily(name: String?, context: Context): FontFamily? {
  if (name.isNullOrBlank()) return null
  return try {
    val resId = context.resources.getIdentifier(name, "font", context.packageName)
    if (resId != 0) {
      FontFamily(Font(resId))
    } else {
      Log.w(
        "OctopusContent",
        "theme.fonts.fontFamily '$name' was not found under res/font/ in the host app; " +
          "keeping the default SDK font. Resource names are lowercase with underscores " +
          "only, and carry no file extension."
      )
      null
    }
  } catch (e: Exception) {
    Log.w("OctopusContent", "theme.fonts.fontFamily '$name' could not be resolved", e)
    null
  }
}

private fun createCustomTypography(
  themeConfig: OctopusThemeConfig?,
  fontFamily: FontFamily?,
  fontWeight: FontWeight?
): OctopusTypography {
  val defaultTypography = OctopusTypographyDefaults.typography()

  if (themeConfig?.fonts == null) {
    return defaultTypography
  }

  val fontsConfig = themeConfig.fonts!!
  val textStyles = fontsConfig.textStyles

  // Create custom typography based on new unified font configuration. A theme-wide
  // family/weight is enough on its own: it applies to every slot, with or without a
  // per-style entry.
  if ((textStyles != null && textStyles.isNotEmpty()) || fontFamily != null || fontWeight != null) {
    return OctopusTypographyDefaults.typography(
      title1 = createTextStyle(textStyles?.get("title1"), defaultTypography.title1, fontFamily, fontWeight),
      title2 = createTextStyle(textStyles?.get("title2"), defaultTypography.title2, fontFamily, fontWeight),
      body1 = createTextStyle(textStyles?.get("body1"), defaultTypography.body1, fontFamily, fontWeight),
      body2 = createTextStyle(textStyles?.get("body2"), defaultTypography.body2, fontFamily, fontWeight),
      caption1 = createTextStyle(textStyles?.get("caption1"), defaultTypography.caption1, fontFamily, fontWeight),
      caption2 = createTextStyle(textStyles?.get("caption2"), defaultTypography.caption2, fontFamily, fontWeight)
    )
  }

  return defaultTypography
}

/**
 * Builds one typography slot from its per-style config plus the theme-wide overrides.
 *
 * A resolved theme-wide [fontFamily] wins over the style's own `fontType`: `fontType` can
 * only name one of three *system* families, so an arbitrary registered family is the more
 * specific request. When the family did not resolve, [fontFamily] arrives null and the
 * slot falls back to its `fontType` exactly as before.
 */
private fun createTextStyle(
  textStyleConfig: OctopusTextStyleConfig?,
  defaultStyle: TextStyle,
  fontFamily: FontFamily? = null,
  fontWeight: FontWeight? = null
): TextStyle {
  if (textStyleConfig == null && fontFamily == null && fontWeight == null) {
    return defaultStyle
  }

  val resolvedFontFamily = when {
    fontFamily != null -> fontFamily
    // No per-style config at all: only a theme-wide weight brought us here, so leave the
    // default slot's family untouched.
    textStyleConfig == null -> defaultStyle.fontFamily
    else -> when (textStyleConfig.fontType) {
      "serif" -> FontFamily.Serif
      "monospace" -> FontFamily.Monospace
      "default" -> FontFamily.Default
      else -> FontFamily.Default
    }
  }

  val fontSize = textStyleConfig?.fontSize?.let {
    // Use points directly as sp (1 point ≈ 1 sp on Android)
    it.sp
  } ?: defaultStyle.fontSize

  return defaultStyle.copy(
    fontFamily = resolvedFontFamily,
    fontSize = fontSize,
    fontWeight = fontWeight ?: defaultStyle.fontWeight
  )
}

private suspend fun loadImageFromUri(uri: String, context: Context): Painter? {
  // Check cache first
  imageCache[uri]?.let { return it }

  return withContext(Dispatchers.IO) {
    try {
      val result = when {
        // Network URLs - load directly
        uri.startsWith("http://", ignoreCase = true) ||
          uri.startsWith("https://", ignoreCase = true) -> {
          loadFromNetwork(uri)
        }
        // Everything else - try as React Native asset
        else -> {
          loadReactNativeAsset(uri, context)
        }
      }

      result?.also { imageCache[uri] = it }
    } catch (e: Exception) {
      Log.w("OctopusActivity", "Failed to load image from URI: $uri", e)
      null
    }
  }
}

private fun loadFromNetwork(url: String): Painter? {
  return try {
    URL(url).openStream().use { inputStream ->
      val bitmap = BitmapFactory.decodeStream(inputStream)
      bitmap?.let { BitmapPainter(it.asImageBitmap()) }
    }
  } catch (e: Exception) {
    Log.w("OctopusActivity", "Failed to load image from network: $url", e)
    null
  }
}

private fun loadReactNativeAsset(assetName: String, context: Context): Painter? {
  return try {
    // First try: Direct drawable resource lookup (most common case)
    val drawableResult = loadFromDrawableResources(assetName, context)
    if (drawableResult != null) {
      return drawableResult
    }

    // Second try: Assets folder with strategic path checking
    loadFromAssetsFolder(assetName, context)
  } catch (e: Exception) {
    Log.w("OctopusActivity", "Failed to load asset: $assetName", e)
    null
  }
}

private fun loadFromAssetsFolder(assetName: String, context: Context): Painter? {
  // Check if assetName already has extension
  val hasExtension = assetName.contains(".")
  val extensions = if (hasExtension) listOf("") else listOf("png", "jpg", "jpeg", "webp")

  val folders = listOf(
    "",
    "drawable-mdpi",
    "drawable-hdpi",
    "drawable-xhdpi",
    "drawable-xxhdpi",
    "drawable-xxxhdpi",
    "drawable"
  )

  for (folder in folders) {
    for (ext in extensions) {
      val filename = if (ext.isEmpty()) assetName else "$assetName.$ext"
      val path = if (folder.isEmpty()) filename else "$folder/$filename"

      try {
        context.assets.open(path).use { inputStream ->
          val bitmap = BitmapFactory.decodeStream(inputStream)
          if (bitmap != null) {
            return BitmapPainter(bitmap.asImageBitmap())
          }
        }
      } catch (e: Exception) {
        // Continue to next path
      }
    }
  }

  return null
}

private fun loadFromDrawableResources(assetName: String, context: Context): Painter? {
  return try {
    // Try exact match first
    val resourceId = context.resources.getIdentifier(
      assetName, "drawable", context.packageName
    )
    if (resourceId != 0) {
      return loadBitmapFromResource(context, resourceId)
    }

    // Fallback: fuzzy search (only if exact match fails)
    val drawableResources = getAllDrawableResources(context)
    for (resourceName in drawableResources) {
      if (isResourceNameMatch(resourceName, assetName)) {
        val resId = context.resources.getIdentifier(
          resourceName, "drawable", context.packageName
        )
        if (resId != 0) {
          return loadBitmapFromResource(context, resId)
        }
      }
    }

    null
  } catch (e: Exception) {
    null
  }
}

private fun loadBitmapFromResource(context: Context, resourceId: Int): Painter? {
  return try {
    val bitmap = BitmapFactory.decodeResource(context.resources, resourceId)
    bitmap?.let { BitmapPainter(it.asImageBitmap()) }
  } catch (e: Exception) {
    null
  }
}

private fun getAllDrawableResources(context: Context): List<String> {
  // Return cached result if available
  cachedDrawableResources?.let { return it }

  return try {
    val packageName = context.packageName
    val drawableResources = mutableListOf<String>()

    // Get all drawable resources by scanning the R.drawable class
    val drawableClass = Class.forName("$packageName.R\$drawable")
    val fields = drawableClass.declaredFields

    for (field in fields) {
      if (field.type == Int::class.javaPrimitiveType) {
        drawableResources.add(field.name)
      }
    }

    // Cache for future use
    cachedDrawableResources = drawableResources
    drawableResources
  } catch (e: Exception) {
    Log.w("OctopusActivity", "Failed to get drawable resources", e)
    emptyList()
  }
}

private fun isResourceNameMatch(resourceName: String, assetName: String): Boolean {
  val normalizedResourceName = resourceName.lowercase()
  val normalizedAssetName = assetName.lowercase()

  // Only check if one contains the other - removed dangerous generic patterns
  return normalizedResourceName.contains(normalizedAssetName) ||
    normalizedAssetName.contains(normalizedResourceName)
}
