import { Text, View } from 'react-native';

import { AppPressable } from '@ui/shared/components';

type SearchResultsStateProps = {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  styles: {
    stateContainer: object;
    stateText: object;
    retryButton: object;
    retryText: object;
  };
};

export function SearchResultsState({
  message,
  retryLabel,
  onRetry,
  styles,
}: SearchResultsStateProps) {
  return (
    <View style={styles.stateContainer}>
      <Text style={styles.stateText}>{message}</Text>
      {retryLabel && onRetry ? (
        <AppPressable
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          testID="search-results-retry-button"
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
        </AppPressable>
      ) : null}
    </View>
  );
}
