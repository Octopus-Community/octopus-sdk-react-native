package com.octopuscommunity.octopusreactnativesdk

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

object OctopusThemeManager {
  // Snapshot state, not a plain field: `OctopusContent` reads the config inside composition,
  // so an `updateColorScheme()` (setThemeMode / system change) or a re-`initialize()` while the
  // UI is on screen recomposes it in place instead of waiting for the next open.
  // (`state`, not `themeConfig`: a delegated property named like the explicit getter below would
  // generate a clashing JVM `getThemeConfig`.)
  private var state by mutableStateOf<OctopusThemeConfig?>(null)

  fun setThemeConfig(config: OctopusThemeConfig?) {
    state = config
  }

  fun getThemeConfig(): OctopusThemeConfig? = state
}
