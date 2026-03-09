import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import { formatRating, type RatingVariant } from '@ui/features/matches/details/components/tabs/lineups/lineupFormatters';

type LineupRatingChipProps = {
  styles: MatchDetailsTabStyles;
  rating: number | null | undefined;
  variant: RatingVariant;
  testId?: string;
  extraStyle?: StyleProp<ViewStyle>;
};

export function LineupRatingChip({
  styles,
  rating,
  variant,
  testId,
  extraStyle,
}: LineupRatingChipProps) {
  if (rating === null || rating === undefined) {
    return null;
  }

  const chipStyle =
    variant === 'elite'
      ? styles.lineupRatingChipElite
      : variant === 'good'
        ? styles.lineupRatingChipGood
        : variant === 'warning'
          ? styles.lineupRatingChipWarning
          : styles.lineupRatingChipNeutral;

  return (
    <View style={[styles.lineupRatingChip, chipStyle, extraStyle]} testID={testId}>
      <Text style={styles.lineupRatingChipText}>{formatRating(rating)}</Text>
    </View>
  );
}
