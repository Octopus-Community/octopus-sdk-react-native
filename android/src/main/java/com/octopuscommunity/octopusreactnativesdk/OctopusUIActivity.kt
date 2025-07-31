package com.octopuscommunity.octopusreactnativesdk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.rememberNavController
import com.octopuscommunity.sdk.ui.OctopusDestination
import com.octopuscommunity.sdk.ui.octopusComposables

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
      OctopusUI()
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
private fun OctopusUI() {
  Box(modifier = Modifier.fillMaxSize()) {
    val navController = rememberNavController()

    NavHost(
      navController = navController,
      startDestination = OctopusDestination.Home
    ) {
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
