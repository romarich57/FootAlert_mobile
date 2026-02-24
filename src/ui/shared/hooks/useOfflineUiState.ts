import { useMemo } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';

type UseOfflineUiStateParams = {
  hasData: boolean;
  isLoading: boolean;
  lastUpdatedAt?: number | null;
};

type OfflineUiState = {
  isOffline: boolean;
  showOfflineBanner: boolean;
  showOfflineNoCache: boolean;
  lastUpdatedAt: number | null;
};

export function useOfflineUiState({
  hasData,
  isLoading,
  lastUpdatedAt = null,
}: UseOfflineUiStateParams): OfflineUiState {
  const netInfo = useNetInfo();

  return useMemo(() => {
    const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
    const showOfflineBanner = isOffline && hasData;
    const showOfflineNoCache = isOffline && !hasData && !isLoading;

    return {
      isOffline,
      showOfflineBanner,
      showOfflineNoCache,
      lastUpdatedAt,
    };
  }, [hasData, isLoading, lastUpdatedAt, netInfo.isConnected, netInfo.isInternetReachable]);
}
