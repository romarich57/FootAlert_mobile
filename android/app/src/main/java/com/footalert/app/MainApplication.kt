package com.footalert.app

import android.app.Application
import android.content.pm.PackageManager
import android.os.Build
import android.os.Debug
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import java.security.MessageDigest

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    enforceReleaseIntegrityChecks()
    loadReactNative(this)
  }

  private fun enforceReleaseIntegrityChecks() {
    if (BuildConfig.DEBUG) {
      return
    }

    if (Debug.isDebuggerConnected()) {
      throw IllegalStateException("Debugger detected in release runtime.")
    }

    val expectedSignature = BuildConfig.EXPECTED_RELEASE_SIGNATURE_SHA256.trim().lowercase()
    if (expectedSignature.isEmpty()) {
      return
    }

    val actualSignature = resolveSigningCertificateSha256()?.trim()?.lowercase()
    if (actualSignature.isNullOrEmpty() || actualSignature != expectedSignature) {
      throw SecurityException("Application signature verification failed.")
    }
  }

  private fun resolveSigningCertificateSha256(): String? {
    return try {
      val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
      } else {
        @Suppress("DEPRECATION")
        packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
      }

      val signatureBytes = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        packageInfo.signingInfo?.apkContentsSigners?.firstOrNull()?.toByteArray()
      } else {
        @Suppress("DEPRECATION")
        packageInfo.signatures?.firstOrNull()?.toByteArray()
      }

      signatureBytes?.let(::sha256Hex)
    } catch (_: Exception) {
      null
    }
  }

  private fun sha256Hex(bytes: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
    val output = StringBuilder(digest.size * 2)
    for (byte in digest) {
      output.append(String.format("%02x", byte))
    }
    return output.toString()
  }
}
