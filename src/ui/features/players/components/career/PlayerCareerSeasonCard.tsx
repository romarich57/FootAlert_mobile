import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { PlayerCareerTeamLogo } from '@ui/features/players/components/career/PlayerCareerTeamLogo';
import type { PlayerCareerTabStyles } from '@ui/features/players/components/career/PlayerCareerTab.styles';
import {
  formatLabelValue,
  formatRatingValue,
  formatSeasonValue,
  formatStatValue,
} from '@ui/features/players/components/career/playerCareer.utils';
import type { PlayerCareerSeason } from '@ui/features/players/types/players.types';
import { getRatingColor } from '@ui/features/players/utils/playerDisplay';

type PlayerCareerSeasonCardProps = {
  seasonRows: PlayerCareerSeason[];
  languageTag: string;
  styles: PlayerCareerTabStyles;
  title: string;
  emptyLabel: string;
  iconColor: string;
};

export function PlayerCareerSeasonCard({
  seasonRows,
  languageTag,
  styles,
  title,
  emptyLabel,
  iconColor,
}: PlayerCareerSeasonCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.metricHeader}>
          <View style={styles.metricHeaderCell}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color={iconColor} />
          </View>
          <View style={styles.metricHeaderCell}>
            <MaterialCommunityIcons name="soccer" size={20} color={iconColor} />
          </View>
          <View style={styles.metricHeaderCell}>
            <MaterialCommunityIcons name="shoe-cleat" size={20} color={iconColor} />
          </View>
          <View style={styles.metricHeaderCell}>
            <MaterialCommunityIcons name="star" size={20} color={iconColor} />
          </View>
        </View>
      </View>

      {seasonRows.length === 0 ? (
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      ) : (
        seasonRows.map((season, index) => {
          const ratingLabel = formatRatingValue(season.rating, languageTag);

          return (
            <View
              key={`season-${season.season ?? 'unknown'}-${season.team.id ?? season.team.name ?? 'unknown'}-${season.matches ?? 'na'}-${season.goals ?? 'na'}-${season.assists ?? 'na'}-${season.rating ?? 'na'}`}
              style={[styles.seasonRow, index > 0 ? styles.rowSeparator : null]}
            >
              <PlayerCareerTeamLogo logo={season.team.logo} styles={styles} />

              <View style={styles.seasonIdentity}>
                {formatLabelValue(season.team.name) ? (
                  <Text style={styles.teamName} numberOfLines={1}>
                    {formatLabelValue(season.team.name)}
                  </Text>
                ) : null}
                {formatSeasonValue(season.season) ? (
                  <Text style={styles.subText}>{formatSeasonValue(season.season)}</Text>
                ) : null}
              </View>

              <View style={styles.seasonStats}>
                <View style={styles.statCell}>
                  {formatStatValue(season.matches) ? (
                    <Text style={styles.statValue}>{formatStatValue(season.matches)}</Text>
                  ) : null}
                </View>
                <View style={styles.statCell}>
                  {formatStatValue(season.goals) ? (
                    <Text style={styles.statValue}>{formatStatValue(season.goals)}</Text>
                  ) : null}
                </View>
                <View style={styles.statCell}>
                  {formatStatValue(season.assists) ? (
                    <Text style={styles.statValue}>{formatStatValue(season.assists)}</Text>
                  ) : null}
                </View>
                {ratingLabel ? (
                  <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(season.rating) }]}>
                    <Text style={styles.ratingText}>{ratingLabel}</Text>
                  </View>
                ) : (
                  <View style={styles.ratingPlaceholder} />
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
