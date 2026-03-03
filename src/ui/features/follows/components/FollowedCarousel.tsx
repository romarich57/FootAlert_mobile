import { memo, useCallback, useMemo, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

const ITEM_GAP = 14;

type FollowedCarouselProps<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  emptyState: ReactElement;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      minHeight: 140,
      paddingTop: 18,
    },
    content: {
      paddingHorizontal: 20,
    },
    emptyContainer: {
      paddingHorizontal: 20,
    },
    separator: {
      width: ITEM_GAP,
    },
    track: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
      paddingTop: 14,
    },
  });
}

function ItemSeparator({ width }: { width: number }) {
  return <View style={{ width }} />;
}

export const FollowedCarousel = memo(function FollowedCarousel<T>({
  items,
  keyExtractor,
  renderItem,
  emptyState,
}: FollowedCarouselProps<T>) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const renderCarouselItem = useCallback<ListRenderItem<T>>(
    ({ item }) => renderItem(item),
    [renderItem],
  );

  const renderSeparator = useCallback(
    () => <ItemSeparator width={ITEM_GAP} />,
    [],
  );

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>{emptyState}</View>
      ) : (
        <FlashList
          data={items}
          horizontal
          keyExtractor={keyExtractor}
          renderItem={renderCarouselItem}
          estimatedItemSize={144}
          contentContainerStyle={styles.content}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={renderSeparator}
        />
      )}
    </View>
  );
}) as <T>(props: FollowedCarouselProps<T>) => ReactElement;
