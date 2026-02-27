import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { TeamOverviewData, TeamTopPlayer } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';
import type { ThemeColors } from '@ui/shared/theme/theme';

import { resolveStatValueVariant, shortName, toDecimal } from './overviewSelectors';
import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

type SeasonStatCard = {
  key: 'rank' | 'points' | 'played' | 'goalDiff';
  iconName: string;
  label: string;
  value: number | null;
};

type OverviewSeasonOverviewCardProps = {
  styles: TeamOverviewStyles;
  colors: ThemeColors;
  t: (key: string) => string;
  seasonStatCards: SeasonStatCard[];
  seasonLineup: TeamOverviewData['seasonLineup'] | null | undefined;
};

function PlayerBubble({
  player,
  styles,
}: {
  player: TeamTopPlayer | null;
  styles: TeamOverviewStyles;
}) {
  return (
    <View style={styles.lineupPlayer}>
      <View style={styles.lineupAvatarBlock}>
        <View style={styles.lineupAvatarWrap}>
          {player?.photo ? <AppImage source={{ uri: player.photo }} style={styles.lineupAvatar} /> : null}
        </View>
        {typeof player?.rating === 'number' ? (
          <View style={styles.lineupRating}>
            <Text style={styles.lineupRatingText}>{toDecimal(player.rating, 1)}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.lineupName}>
        {shortName(player?.name)}
      </Text>
    </View>
  );
}

export function OverviewSeasonOverviewCard({
  styles,
  colors,
  t,
  seasonStatCards,
  seasonLineup,
}: OverviewSeasonOverviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.cardTitle}>{t('teamDetails.overview.seasonStats')}</Text>
        <Text style={styles.sectionSubtitle}>{t('teamDetails.overview.estimatedLineup')}</Text>
      </View>

      <View style={styles.statsGrid}>
        {seasonStatCards.map(card => {
          const variant = resolveStatValueVariant(card.key, card.value);
          const valueVariantStyle =
            variant === 'positive'
              ? styles.statValuePositive
              : variant === 'negative'
                ? styles.statValueNegative
                : styles.statValueNeutral;

          return (
            <View key={`season-stat-${card.key}`} style={styles.statCell}>
              <View style={styles.statLabelRow}>
                <MaterialCommunityIcons
                  testID={`team-overview-season-stat-icon-${card.key}`}
                  name={card.iconName}
                  size={14}
                  color={colors.textMuted}
                  style={styles.statIcon}
                />
                <Text numberOfLines={1} style={styles.statLabel}>
                  {card.label}
                </Text>
              </View>
              <Text style={[styles.statValue, valueVariantStyle]}>{toDisplayNumber(card.value)}</Text>
            </View>
          );
        })}
      </View>

      {(seasonLineup?.attackers?.length ?? 0) > 0 ||
        (seasonLineup?.midfielders?.length ?? 0) > 0 ||
        (seasonLineup?.defenders?.length ?? 0) > 0 ||
        seasonLineup?.goalkeeper ? (
        <View style={styles.pitch}>
          <View style={styles.lineupRow}>
            {(seasonLineup?.attackers ?? []).map(player => (
              <PlayerBubble key={`att-${player.playerId}`} player={player} styles={styles} />
            ))}
          </View>
          <View style={styles.pitchHalfLine} />
          <View style={styles.lineupRow}>
            {(seasonLineup?.midfielders ?? []).map(player => (
              <PlayerBubble key={`mid-${player.playerId}`} player={player} styles={styles} />
            ))}
          </View>
          <View style={styles.lineupRow}>
            {(seasonLineup?.defenders ?? []).map(player => (
              <PlayerBubble key={`def-${player.playerId}`} player={player} styles={styles} />
            ))}
          </View>
          <View style={styles.lineupRow}>
            <PlayerBubble player={seasonLineup?.goalkeeper ?? null} styles={styles} />
          </View>
        </View>
      ) : (
        <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
      )}
    </View>
  );
}
