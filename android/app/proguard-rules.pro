# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Remove release logs.
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
}

# Keep required React Native bridge classes.
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Keep app BuildConfig fields used by react-native-config through reflection in release-like variants.
-keep class com.footalert.app.BuildConfig { *; }
-keep class com.lugg.RNCConfig.** { *; }

# Keep security-native modules wired by reflection.
-keep class com.gantix.JailMonkey.** { *; }
-keep class com.reactnativesslpublickeypinning.** { *; }

# Keep Kotlin metadata required by reflection.
-keep class kotlin.Metadata { *; }
