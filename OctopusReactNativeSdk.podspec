require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
octopus_version = '1.16.0'

Pod::Spec.new do |s|
  s.name         = "OctopusReactNativeSdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Octopus-Community/octopus-sdk-react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

# Use install_modules_dependencies helper to install the dependencies if React Native version >=0.71.0.
# See https://github.com/facebook/react-native/blob/febf6b7f33fdb4904669f99d795eba4c0f95d7bf/scripts/cocoapods/new_architecture.rb#L79.
if respond_to?(:install_modules_dependencies, true)
  install_modules_dependencies(s)
else
  s.dependency "React-Core"
end

  # The native iOS SDK is consumed through Swift Package Manager, not CocoaPods trunk
  # (which stops accepting new publications). React Native's `spm_dependency`
  # (scripts/cocoapods/spm.rb, RN >= 0.75) attaches the package to this pod's target
  # during `pod install`, so the app keeps a plain CocoaPods setup.
  unless respond_to?(:spm_dependency, true)
    raise "OctopusReactNativeSdk needs React Native's `spm_dependency` helper (React Native 0.75 or later) " \
          "to fetch the native Octopus SDK with Swift Package Manager. Make sure your Podfile requires " \
          "react-native/scripts/react_native_pods.rb."
  end

  # Internal tooling (native-dev): inert unless both variables are set. During a
  # native dev-source window the package resolves from one revision of another repository.
  octopus_dev_url = ENV['OCTOPUS_IOS_DEV_PACKAGE_URL'].to_s
  octopus_dev_revision = ENV['OCTOPUS_IOS_DEV_REVISION'].to_s
  if octopus_dev_url.empty? || octopus_dev_revision.empty?
    # Keep the exact pin equal to the `exact:` pin in Package.swift.
    spm_dependency(s,
      url: 'https://github.com/Octopus-Community/octopus-sdk-swift.git',
      requirement: { kind: 'exactVersion', version: octopus_version },
      products: ['Octopus', 'OctopusUI']
    )
  else
    spm_dependency(s,
      url: octopus_dev_url,
      requirement: { kind: 'revision', revision: octopus_dev_revision },
      products: ['Octopus', 'OctopusUI']
    )
  end
end
