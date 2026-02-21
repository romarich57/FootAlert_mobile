import {
  RESULTS,
  checkNotifications,
  openSettings,
  requestNotifications,
  type PermissionStatus,
} from 'react-native-permissions';

export type NotificationsPermissionStatus = PermissionStatus;

export function isNotificationsPermissionGranted(status: NotificationsPermissionStatus): boolean {
  return status === RESULTS.GRANTED;
}

export async function getNotificationsPermissionStatus(): Promise<NotificationsPermissionStatus> {
  try {
    const result = await checkNotifications();
    return result.status;
  } catch {
    return RESULTS.UNAVAILABLE;
  }
}

export async function requestNotificationsPermission(): Promise<NotificationsPermissionStatus> {
  try {
    const result = await requestNotifications(['alert', 'badge', 'sound']);
    return result.status;
  } catch {
    return RESULTS.UNAVAILABLE;
  }
}

export async function openNotificationsSettings(): Promise<void> {
  try {
    await openSettings('notifications');
  } catch {
    await openSettings('application');
  }
}
