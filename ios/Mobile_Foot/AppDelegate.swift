import UIKit
import Security
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Darwin

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
#if !DEBUG
    guard passesReleaseSecurityChecks() else {
      return false
    }
#endif

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Mobile_Foot",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  private func passesReleaseSecurityChecks() -> Bool {
    if isDebuggerAttached() {
      return false
    }

    if isJailbroken() {
      return false
    }

    if isRuntimeHookDetected() {
      return false
    }

    if !isCodeSignatureValid() {
      return false
    }

    return true
  }

  private func isDebuggerAttached() -> Bool {
    var info = kinfo_proc()
    var size = MemoryLayout<kinfo_proc>.stride
    var name: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]

    let result = name.withUnsafeMutableBufferPointer { pointer in
      sysctl(pointer.baseAddress, u_int(pointer.count), &info, &size, nil, 0)
    }

    if result != 0 {
      return false
    }

    return (info.kp_proc.p_flag & P_TRACED) != 0
  }

  private func isJailbroken() -> Bool {
    #if targetEnvironment(simulator)
    return false
    #else
    let suspiciousPaths = [
      "/Applications/Cydia.app",
      "/Library/MobileSubstrate/MobileSubstrate.dylib",
      "/bin/bash",
      "/usr/sbin/sshd",
      "/etc/apt",
      "/private/var/lib/apt/"
    ]

    for path in suspiciousPaths where FileManager.default.fileExists(atPath: path) {
      return true
    }

    let testPath = "/private/footalert_jb_probe.txt"
    do {
      try "probe".write(toFile: testPath, atomically: true, encoding: .utf8)
      try FileManager.default.removeItem(atPath: testPath)
      return true
    } catch {
      return false
    }
    #endif
  }

  private func isRuntimeHookDetected() -> Bool {
    let suspiciousLibraries = [
      "frida",
      "substrate",
      "cynject",
      "libhooker",
      "xposed"
    ]

    for index in 0..<_dyld_image_count() {
      guard let cName = _dyld_get_image_name(index) else {
        continue
      }

      let imageName = String(cString: cName).lowercased()
      if suspiciousLibraries.contains(where: { imageName.contains($0) }) {
        return true
      }
    }

    return false
  }

  private func isCodeSignatureValid() -> Bool {
    var code: SecCode?
    guard SecCodeCopySelf([], &code) == errSecSuccess, let secCode = code else {
      return false
    }

    guard SecCodeCheckValidity(secCode, SecCSFlags(), nil) == errSecSuccess else {
      return false
    }

    var signingInfo: CFDictionary?
    let status = SecCodeCopySigningInformation(secCode, SecCSFlags(), &signingInfo)
    guard status == errSecSuccess,
          let info = signingInfo as? [String: Any] else {
      return false
    }

    guard let identifier = info[kSecCodeInfoIdentifier as String] as? String,
          let bundleIdentifier = Bundle.main.bundleIdentifier else {
      return false
    }

    guard identifier == bundleIdentifier else {
      return false
    }

    guard let teamIdentifier = info[kSecCodeInfoTeamIdentifier as String] as? String,
          !teamIdentifier.isEmpty else {
      return false
    }

    if let expectedTeamIdentifier = resolveExpectedTeamIdentifier(),
       expectedTeamIdentifier != teamIdentifier {
      return false
    }

    return true
  }

  private func resolveExpectedTeamIdentifier() -> String? {
    guard let rawValue = Bundle.main.object(forInfoDictionaryKey: "FootAlertExpectedTeamIdentifier") as? String else {
      return nil
    }

    let normalized = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
    return normalized.isEmpty ? nil : normalized
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
