import { Image, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { PlayerProfileTabStyles } from '@ui/features/players/components/profile/PlayerProfileTab.styles';
import type { CompetitionKpiItem, TranslateFn } from '@ui/features/players/components/profile/playerProfile.helpers';
import type { PlayerProfileCompetitionStats } from '@ui/features/players/types/players.types';
import { getRatingColor, toDisplayValue, toSeasonLabel } from '@ui/features/players/utils/playerDisplay';

type PlayerProfileCompetitionCardProps = {
  competitionStats: PlayerProfileCompetitionStats | null;
  competitionKpis: CompetitionKpiItem[];
  styles: PlayerProfileTabStyles;
  t: TranslateFn;
  textColor: string;
  textMutedColor: string;
  primaryContrast: string;
  borderColor: string;
};

export function PlayerProfileCompetitionCard({
  competitionStats,
  competitionKpis,
  styles,
  t,
  textColor,
  textMutedColor,
  primaryContrast,
  borderColor,
}: PlayerProfileCompetitionCardProps) {
  const competitionSeason = competitionStats ? toSeasonLabel(competitionStats.season) : '';
  const competitionRating = toDisplayValue(competitionStats?.rating);

  return (
    <View style={styles.card} testID="player-profile-competition-card">
      <View style={styles.cardTitleRow}>
        <MaterialCommunityIcons name="chart-box-outline" size={18} color={textColor} />
        <Text style={styles.cardTitle}>{t('playerDetails.profile.labels.latestCompetitionStats')}</Text>
      </View>

      {competitionStats ? (
        <>
          <View style={styles.competitionHeader}>
            <View style={styles.competitionLogoWrap}>
              {competitionStats.leagueLogo ? (
                <Image source={{ uri: competitionStats.leagueLogo }} style={styles.competitionLogo} resizeMode="contain" />
              ) : (
                <MaterialCommunityIcons name="shield-outline" size={18} color={textMutedColor} />
              )}
            </View>
            <View style={styles.competitionMeta}>
              <Text style={styles.competitionName} numberOfLines={1}>
                {toDisplayValue(competitionStats.leagueName)}
              </Text>
              {competitionSeason ? <Text style={styles.competitionSeason}>{competitionSeason}</Text> : null}
            </View>
          </View>

          <View style={styles.competitionKpis} testID="player-profile-competition-stats">
            {competitionKpis.map(kpi => (
              <View key={kpi.id} style={styles.competitionKpi}>
                <View style={styles.competitionKpiLabelRow}>
                  <MaterialCommunityIcons name={kpi.icon} size={12} color={textMutedColor} />
                  <Text style={styles.competitionKpiLabel}>{kpi.label}</Text>
                </View>
                <Text style={styles.competitionKpiValue} testID={`player-profile-competition-${kpi.id}-value`}>
                  {kpi.value}
                </Text>
              </View>
            ))}
            <View style={styles.competitionKpi}>
              <View style={styles.competitionKpiLabelRow}>
                <MaterialCommunityIcons name="star-outline" size={12} color={textMutedColor} />
                <Text style={styles.competitionKpiLabel}>{t('playerDetails.stats.labels.rating')}</Text>
              </View>
              <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(competitionStats.rating) || borderColor }]}>
                <Text style={[styles.ratingBadgeText, { color: primaryContrast }]} testID="player-profile-competition-rating-value">
                  {competitionRating}
                </Text>
              </View>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.helperText}>{t('playerDetails.profile.states.noCompetitionStats')}</Text>
      )}
    </View>
  );
}
