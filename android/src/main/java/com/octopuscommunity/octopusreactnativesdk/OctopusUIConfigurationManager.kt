package com.octopuscommunity.octopusreactnativesdk

object OctopusUIConfigurationManager {
  private var uiConfiguration: OctopusUIConfiguration? = null
  
  fun setUIConfiguration(config: OctopusUIConfiguration?) {
    uiConfiguration = config
  }
  
  fun getUIConfiguration(): OctopusUIConfiguration? = uiConfiguration
}

