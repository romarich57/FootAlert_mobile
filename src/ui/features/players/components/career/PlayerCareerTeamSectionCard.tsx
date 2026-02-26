import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { PlayerCareerTeamLogo } from '@ui/features/players/components/career/PlayerCareerTeamLogo';
import type { PlayerCareerTabStyles } from '@ui/features/players/components/career/PlayerCareerTab.styles';
import {
  formatLabelValue,
  formatStatValue,
} from '@ui/features/players/components/career/playerCareer.utils';
import type { PlayerCareerTeam } from '@ui/features/players/types/players.types';

type PlayerCareerTeamSectionCardProps = {
  sectionTitle: string;
  sectionTeams: PlayerCareerTeam[];
  styles: PlayerCareerTabStyles;
  iconColor: string;
};

export function PlayerCareerTeamSectionCard({
  sectionTitle,
  sectionTeams,
  styles,
  iconColor,
}: PlayerCareerTeamSectionCardProps) {
  if (sectionTeams.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{sectionTitle}</Text>
        <View style={styles.metricHeader}>
          <View style={styles.metricHeaderCell}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={21} color={iconColor} />
          </View>
          <View style={styles.metricHeaderCell}>
            <MaterialCommunityIcons name="soccer" size={21} color={iconColor} />
          </View>
        </View>
      </View>

      {sectionTeams.map((team, index) => {
        const matches = formatStatValue(team.matches);
        const goals = formatStatValue(team.goals);

        return (
          <View
            key={`team-${team.team.id ?? team.team.name ?? 'unknown'}-${team.period ?? index}`}
            style={[styles.teamRow, index > 0 ? styles.rowSeparator : null]}
          >
            <View style={styles.teamIdentity}>
              <PlayerCareerTeamLogo logo={team.team.logo} styles={styles} />
              <View style={styles.seasonIdentity}>
                {formatLabelValue(team.team.name) ? (
                  <Text style={styles.teamName} numberOfLines={1}>
                    {formatLabelValue(team.team.name)}
                  </Text>
                ) : null}
                {formatLabelValue(team.period) ? (
                  <Text style={styles.subText}>{formatLabelValue(team.period)}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.teamStats}>
              <View style={styles.teamStatCell}>
                {matches ? <Text style={styles.teamStatValue}>{matches}</Text> : null}
              </View>
              <View style={styles.teamStatCell}>
                {goals ? <Text style={styles.teamStatValue}>{goals}</Text> : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

type PlayerCareerTeamLegendProps = {
  styles: PlayerCareerTabStyles;
  iconColor: string;
  matchesPlayedLabel: string;
  goalsLabel: string;
};

export function PlayerCareerTeamLegend({
  styles,
  iconColor,
  matchesPlayedLabel,
  goalsLabel,
}: PlayerCareerTeamLegendProps) {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color={iconColor} />
        <Text style={styles.legendText}>{matchesPlayedLabel}</Text>
      </View>
      <View style={styles.legendItem}>
        <MaterialCommunityIcons name="soccer" size={18} color={iconColor} />
        <Text style={styles.legendText}>{goalsLabel}</Text>
      </View>
    </View>
  );
}
