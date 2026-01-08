package com.octopuscommunity.octopusreactnativesdk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.octopuscommunity.sdk.ui.OctopusDrawablesDefaults
import com.octopuscommunity.sdk.ui.OctopusTheme
import com.octopuscommunity.sdk.ui.home.OctopusHomeScreen
import com.octopuscommunity.sdk.ui.octopusComposables
import com.octopuscommunity.sdk.ui.octopusDarkColorScheme
import com.octopuscommunity.sdk.ui.octopusLightColorScheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL

class OctopusUIActivity : ComponentActivity() {
    private val closeUIReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerCloseUIReceiver()
        setContent {
            OctopusUI(onBack = { finish() })
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(closeUIReceiver)
    }

    private fun registerCloseUIReceiver() {
        val intentFilter = IntentFilter(OctopusUIController.CLOSE_UI_ACTION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(closeUIReceiver, intentFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(closeUIReceiver, intentFilter)
        }
    }
}

@Composable
private fun OctopusUI(onBack: () -> Unit) {
    val themeConfig = OctopusThemeManager.getThemeConfig()
    val context = LocalContext.current

    // Function to detect if system is in dark mode
    fun isSystemInDarkTheme(): Boolean {
        return (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }

    // Only apply custom theming if theme config is provided
    if (themeConfig != null) {
        // Create color scheme based on theme config
        val colorScheme = if (isSystemInDarkTheme()) {
            octopusDarkColorScheme()
        } else {
            octopusLightColorScheme()
        }.let { octopusColorScheme ->
            octopusColorScheme.copy(
                primary = themeConfig.primaryColor?.let {
                    Color(android.graphics.Color.parseColor(it))
                } ?: octopusColorScheme.primary,
                primaryLow = themeConfig.primaryLowContrastColor?.let {
                    Color(android.graphics.Color.parseColor(it))
                } ?: octopusColorScheme.primaryLow,
                primaryHigh = themeConfig.primaryHighContrastColor?.let {
                    Color(android.graphics.Color.parseColor(it))
                } ?: octopusColorScheme.primaryHigh,
                onPrimary = themeConfig.onPrimaryColor?.let {
                    Color(android.graphics.Color.parseColor(it))
                } ?: octopusColorScheme.onPrimary
            )
        }

        // Handle logo loading using built-in Android capabilities
        var logoPainter by remember { mutableStateOf<Painter?>(null) }

        LaunchedEffect(themeConfig.logoSource) {
            themeConfig.logoSource?.let { logoSource ->
                val uri = logoSource.getString("uri")
                if (uri != null) {
                    logoPainter = loadImageFromUri(uri)
                } else {
                    logoPainter = null
                }
            }
        }

        // Create drawables based on theme config
        val drawables = if (logoPainter != null) {
            OctopusDrawablesDefaults.drawables(logo = logoPainter)
        } else {
            OctopusDrawablesDefaults.drawables()
        }

        // Apply custom theme
        OctopusTheme(
            colorScheme = colorScheme,
            drawables = drawables
        ) {
            OctopusUIContent(onBack = onBack)
        }
    } else {
        // No theme config - let the native SDK inherit the React Native app's theme colors
        OctopusUIContent(onBack = onBack)
    }
}

@Composable
private fun OctopusUIContent(onBack: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize()) {
        val navController = rememberNavController()

        NavHost(
            navController = navController,
            startDestination = "OctopusHome"
        ) {
            composable(route = "OctopusHome") {
                OctopusHomeScreen(
                    navController = navController,
                    backIcon = true,
                    onBack = onBack
                )
            }
            octopusComposables(
                navController = navController,
                onNavigateToLogin = {
                    OctopusEventEmitter.instance?.emitLoginRequired()
                },
                onNavigateToProfileEdit = { fieldToEdit ->
                    OctopusEventEmitter.instance?.emitEditUser(fieldToEdit)
                }
            )
        }
    }
}

private suspend fun loadImageFromUri(uri: String): Painter? {
    return withContext(Dispatchers.IO) {
        try {
            val url = URL(uri)
            val inputStream = url.openStream()
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()

            if (bitmap != null) {
                BitmapPainter(bitmap.asImageBitmap())
            } else {
                Log.w("OctopusUI", "Failed to decode bitmap from URI: $uri")
                null
            }
        } catch (e: Exception) {
            Log.e("OctopusUI", "Error loading image from URI: $uri", e)
            null
        }
    }
}