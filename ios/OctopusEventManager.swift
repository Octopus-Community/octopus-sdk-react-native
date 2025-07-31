import React
import Octopus

class OctopusEventManager {
  private weak var eventEmitter: RCTEventEmitter?
  private var hasListeners = false

  init(eventEmitter: RCTEventEmitter) {
    self.eventEmitter = eventEmitter
  }

  func emitLoginRequired() {
    if hasListeners {
      eventEmitter?.sendEvent(withName: "loginRequired", body: nil)
    }
  }

  func emitEditUser(profileField: ConnectionMode.SSOConfiguration.ProfileField?) {
    if hasListeners {
      let fieldToEdit = ProfileFieldMapper.toReactNativeString(profileField)
      let eventBody = ["fieldToEdit": fieldToEdit]
      eventEmitter?.sendEvent(withName: "editUser", body: eventBody)
    }
  }

  func emitUserTokenRequest(requestId: String) {
    if hasListeners {
      let eventBody = ["requestId": requestId]
      eventEmitter?.sendEvent(withName: "userTokenRequest", body: eventBody)
    }
  }

  func startObserving() {
    hasListeners = true
  }

  func stopObserving() {
    hasListeners = false
  }

  func supportedEvents() -> [String] {
    return ["loginRequired", "editUser", "userTokenRequest"]
  }
}
