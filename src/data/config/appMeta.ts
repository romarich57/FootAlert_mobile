import DeviceInfo from 'react-native-device-info';

export function getAppVersion(): string {
  return DeviceInfo.getVersion();
}

export function getAppVersionLabel(): string {
  const version = getAppVersion();
  const buildNumber = DeviceInfo.getBuildNumber();

  if (!buildNumber) {
    return version;
  }

  return `${version} (${buildNumber})`;
}
