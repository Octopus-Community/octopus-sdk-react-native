import Octopus
import OctopusUI
import SwiftUI
import UIKit
import React

class OctopusUIManager {
  private weak var presentedViewController: UIViewController?

  func openUI(octopus: OctopusSDK) throws {
    guard let presentingViewController = RCTPresentedViewController() else {
      throw NSError(domain: "OPEN_UI_ERROR", code: 0, userInfo: [NSLocalizedDescriptionKey: "Could not find presenting view controller"])
    }

    let octopusHomeScreen = OctopusHomeScreen(octopus: octopus)
    let hostingController = UIHostingController(rootView: octopusHomeScreen)
    hostingController.modalPresentationStyle = .fullScreen

    presentedViewController = hostingController

    presentingViewController.present(hostingController, animated: true)
  }

  func closeUI() throws {
    guard let presentedVC = presentedViewController else {
      throw NSError(domain: "CLOSE_UI_ERROR", code: 0, userInfo: [NSLocalizedDescriptionKey: "No UI is currently presented"])
    }

    presentedVC.dismiss(animated: true) {
      self.presentedViewController = nil
    }
  }

  func cleanup() {
    if let presentedVC = presentedViewController {
      presentedVC.dismiss(animated: false, completion: nil)
      presentedViewController = nil
    }
  }
}
