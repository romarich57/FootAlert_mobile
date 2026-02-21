import DeviceInfo from 'react-native-device-info';

export function getAppVersionLabel(): string {
  const version = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();

  if (!buildNumber) {
    return version;
  }

  return `${version} (${buildNumber})`;
}
