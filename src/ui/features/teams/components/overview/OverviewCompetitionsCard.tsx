import { Text, View } from 'react-native';

import { toDisplaySeasonLabel, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';

import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

type CompetitionForSeason = {
  leagueId: string;
  leagueLogo: string | null;
  leagueName: string | null;
  season: number | null;
};

type OverviewCompetitionsCardProps = {
  styles: TeamOverviewStyles;
  t: (key: string) => string;
  competitionsForSeason: CompetitionForSeason[];
};

export function OverviewCompetitionsCard({
  styles,
  t,
  competitionsForSeason,
}: OverviewCompetitionsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('teamDetails.overview.competitions')}</Text>
      {competitionsForSeason.length > 0 ? (
        <View style={styles.competitionsList}>
          {competitionsForSeason.map(competitionItem => (
            <View key={`competition-${competitionItem.leagueId}-${competitionItem.season}`} style={styles.competitionRow}>
              {competitionItem.leagueLogo ? (
                <AppImage source={{ uri: competitionItem.leagueLogo }} style={styles.competitionLogo} />
              ) : null}
              <View style={styles.competitionTextWrap}>
                <Text numberOfLines={1} style={styles.competitionName}>
                  {toDisplayValue(competitionItem.leagueName)}
                </Text>
                <Text style={styles.competitionSeason}>{toDisplaySeasonLabel(competitionItem.season)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
      )}
    </View>
  );
}
