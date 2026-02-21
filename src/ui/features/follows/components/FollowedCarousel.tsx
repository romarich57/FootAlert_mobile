import { memo, useMemo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FollowedCarouselProps<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  emptyState: ReactElement;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      minHeight: 246,
      paddingTop: 18,
    },
    content: {
      paddingHorizontal: 20,
      gap: 14,
    },
    emptyContainer: {
      paddingHorizontal: 20,
    },
    track: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
      paddingTop: 14,
    },
  });
}

export const FollowedCarousel = memo(function FollowedCarousel<T>({
  items,
  keyExtractor,
  renderItem,
  emptyState,
}: FollowedCarouselProps<T>) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>{emptyState}</View>
      ) : (
        <FlashList
          data={items}
          horizontal
          keyExtractor={keyExtractor}
          renderItem={({ item }) => renderItem(item)}
          contentContainerStyle={styles.content}
          showsHorizontalScrollIndicator={false}
        />
      )}
    </View>
  );
}) as <T>(props: FollowedCarouselProps<T>) => ReactElement;
