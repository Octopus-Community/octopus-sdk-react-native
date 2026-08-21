package com.octopuscommunity.octopusreactnativesdk

object OctopusTopAppBarManager {
  private var config: OctopusTopAppBarConfig? = null

  fun setConfig(config: OctopusTopAppBarConfig?) {
    this.config = config
  }

  fun getConfig(): OctopusTopAppBarConfig? = config
}
