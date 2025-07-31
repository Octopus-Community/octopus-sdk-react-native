import Octopus
import OctopusUI
import SwiftUI
import UIKit

@objc(OctopusReactNativeSdk)
class OctopusReactNativeSdk: RCTEventEmitter {

  // MARK: - Properties

  private var octopusSDK: OctopusSDK?
  private lazy var uiManager = OctopusUIManager()
  private lazy var eventManager = OctopusEventManager(eventEmitter: self)
  private let sdkInitializer = OctopusSDKInitializer()
  private var ssoAuthenticator: OctopusSSOAuthenticator?

  // MARK: - Initialization

  @objc(initialize:withResolver:withRejecter:)
  func initialize(options: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    do {
      self.octopusSDK = try sdkInitializer.initialize(options: options, eventManager: eventManager)
      self.ssoAuthenticator = OctopusSSOAuthenticator(octopusSDK: self.octopusSDK!, eventManager: eventManager)
      resolve(nil)
    } catch {
      reject("INITIALIZE_ERROR", "Failed to initialize Octopus SDK: \(error.localizedDescription)", error)
    }
  }

  // MARK: - User authentication

  @objc(connectUser:withResolver:withRejecter:)
  func connectUser(params: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let authenticator = ssoAuthenticator else {
      reject("CONNECT_USER_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }

    Task {
      do {
        try await authenticator.connectUser(params: params)
        resolve(nil)
      } catch {
        reject("CONNECT_USER_ERROR", "Failed to connect user: \(error.localizedDescription)", error)
      }
    }

  }

  @objc(completeUserTokenRequest:withToken:withResolver:withRejecter:)
  func completeUserTokenRequest(requestId: String, token: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let authenticator = ssoAuthenticator else {
      reject("PROVIDE_TOKEN_ERROR", "SDK not initialized", nil)
      return
    }

    authenticator.completeTokenRequest(requestId: requestId, token: token)
    resolve(nil)
  }

  @objc(cancelUserTokenRequest:withResolver:withRejecter:)
  func cancelUserTokenRequest(requestId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let authenticator = ssoAuthenticator else {
      reject("PROVIDE_TOKEN_ERROR", "SDK not initialized", nil)
      return
    }

    authenticator.cancelTokenRequest(requestId: requestId)
    resolve(nil)
  }

  @objc(disconnectUser:withRejecter:)
  func disconnectUser(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let authenticator = ssoAuthenticator else {
      reject("DISCONNECT_USER_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }

    do {
      try authenticator.disconnectUser()
      resolve(nil)
    } catch {
      reject("DISCONNECT_USER_ERROR", "Failed to disconnect user: \(error.localizedDescription)", error)
    }

  }

  // MARK: - UI management

  @objc(openUI:withRejecter:)
  func openUI(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    guard let octopus = octopusSDK else {
      reject("OPEN_UI_ERROR", "SDK not initialized. Call initialize() first.", nil)
      return
    }

    DispatchQueue.main.async {
      do {
        try self.uiManager.openUI(octopus: octopus)
        resolve(nil)
      } catch {
        reject("OPEN_UI_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc(closeUI:withRejecter:)
  func closeUI(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    DispatchQueue.main.async {
      do {
        try self.uiManager.closeUI()
        resolve(nil)
      } catch {
        reject("CLOSE_UI_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Lifecycle management

  deinit {
    cleanup()
  }

  private func cleanup() {
    uiManager.cleanup()
    octopusSDK = nil
  }

  @objc override func invalidate() {
    cleanup()
    super.invalidate()
  }

  // MARK: - RCTEventEmitter overrides

  @objc override func supportedEvents() -> [String]! {
    return eventManager.supportedEvents()
  }

  @objc override func startObserving() {
    eventManager.startObserving()
  }

  @objc override func stopObserving() {
    eventManager.stopObserving()
  }
}
