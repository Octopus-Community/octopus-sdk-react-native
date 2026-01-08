import Octopus
import OctopusUI
import SwiftUI
import UIKit
import React

class OctopusUIManager {
  private weak var presentedViewController: UIViewController?

  func openUI(octopus: OctopusSDK, theme: OctopusUI.OctopusTheme?, logoSource: [String: Any]?) throws {
    guard let presentingViewController = RCTPresentedViewController() else {
      throw NSError(domain: "OPEN_UI_ERROR", code: 0, userInfo: [NSLocalizedDescriptionKey: "Could not find presenting view controller"])
    }

    let octopusHomeScreen = OctopusHomeScreen(octopus: octopus)
    let hostingController = UIHostingController(rootView: AnyView(octopusHomeScreen))
    hostingController.modalPresentationStyle = .fullScreen

    // Apply theme if provided
    if let theme = theme {
      // Apply theme immediately (without logo) to avoid delay
      hostingController.rootView = AnyView(OctopusHomeScreen(octopus: octopus).environment(\.octopusTheme, theme))
      
      // Then load logo asynchronously and update theme if logo loads
      if let logoSource = logoSource {
        loadLogo(from: logoSource) { [weak hostingController] logoImage in
          DispatchQueue.main.async {
            if let logoImage = logoImage {
              let updatedTheme = OctopusUI.OctopusTheme(
                colors: theme.colors,
                fonts: theme.fonts,
                assets: OctopusUI.OctopusTheme.Assets(logo: logoImage)
              )
              hostingController?.rootView = AnyView(OctopusHomeScreen(octopus: octopus).environment(\.octopusTheme, updatedTheme))
            } else {
              // Theme is already applied, no need to do anything
            }
          }
        }
      }
    }

    presentedViewController = hostingController

    presentingViewController.present(hostingController, animated: true)
  }
  
  private func loadLogo(from source: [String: Any], completion: @escaping (UIImage?) -> Void) {
    // Handle React Native image source with URI (from Image.resolveAssetSource)
    guard let uri = source["uri"] as? String else {
      completion(nil)
      return
    }
    
    // Remote URL
    if uri.hasPrefix("http") {
      guard let url = URL(string: uri) else {
        completion(nil)
        return
      }
      
      URLSession.shared.dataTask(with: url) { data, response, error in
        guard let data = data, error == nil else {
          completion(nil)
          return
        }
        
        let image = UIImage(data: data)
        completion(image)
      }.resume()
    } else {
      // Local file path (from Image.resolveAssetSource)
      if let image = UIImage(contentsOfFile: uri) {
        completion(image)
      } else {
        // Fallback: try to load from bundle using the filename
        let filename = (uri as NSString).lastPathComponent
        let nameWithoutExtension = (filename as NSString).deletingPathExtension
        let image = UIImage(named: nameWithoutExtension)
        completion(image)
      }
    }
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
