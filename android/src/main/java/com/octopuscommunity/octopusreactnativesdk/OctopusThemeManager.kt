package com.octopuscommunity.octopusreactnativesdk

object OctopusThemeManager {
  private var themeConfig: OctopusThemeConfig? = null
  
  fun setThemeConfig(config: OctopusThemeConfig?) {
    themeConfig = config
  }
  
  fun getThemeConfig(): OctopusThemeConfig? = themeConfig
}
