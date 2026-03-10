export type PrefetchGuardInput = {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
  isConnectionExpensive?: boolean | null;
  lowPowerMode?: boolean | null;
};

export type PrefetchGuardState = {
  isOffline: boolean;
  networkLiteMode: boolean;
  batteryLiteMode: boolean;
  allowImmediate: boolean;
  allowIdle: boolean;
};

export function resolvePrefetchGuardState({
  isConnected,
  isInternetReachable,
  isConnectionExpensive,
  lowPowerMode,
}: PrefetchGuardInput): PrefetchGuardState {
  const isOffline = isConnected === false || isInternetReachable === false;
  const networkLiteMode = isOffline || isConnectionExpensive === true;
  const batteryLiteMode = lowPowerMode === true;

  return {
    isOffline,
    networkLiteMode,
    batteryLiteMode,
    allowImmediate: !isOffline,
    allowIdle: !networkLiteMode && !batteryLiteMode,
  };
}
