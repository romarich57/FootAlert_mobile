import { Pressable, Text, View } from 'react-native';

import type { TeamMatchItem } from '@ui/features/teams/types/teams.types';
import { toDisplayDate, toDisplayHour, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';

import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

type OverviewNextMatchCardProps = {
  styles: TeamOverviewStyles;
  t: (key: string) => string;
  nextMatch: TeamMatchItem | null;
  onPressMatch: (matchId: string) => void;
  onPressTeam: (teamId: string) => void;
};

export function OverviewNextMatchCard({
  styles,
  t,
  nextMatch,
  onPressMatch,
  onPressTeam,
}: OverviewNextMatchCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('teamDetails.overview.nextMatch')}</Text>

      {nextMatch ? (
        <>
          <View style={styles.nextMetaRow}>
            <Text style={styles.nextMeta}>{toDisplayDate(nextMatch.date)}</Text>
            <View style={styles.leaguePill}>
              <Text numberOfLines={1} style={styles.leaguePillText}>
                {toDisplayValue(nextMatch.leagueName)}
              </Text>
            </View>
          </View>

          <View style={styles.nextMatchRow}>
            <Pressable
              onPress={() => {
                if (nextMatch.homeTeamId) {
                  onPressTeam(nextMatch.homeTeamId);
                }
              }}
              style={styles.teamSide}
            >
              <View style={styles.teamBadge}>
                {nextMatch.homeTeamLogo ? (
                  <AppImage source={{ uri: nextMatch.homeTeamLogo }} style={styles.teamBadgeImage} />
                ) : null}
              </View>
              <Text numberOfLines={2} style={styles.teamName}>
                {toDisplayValue(nextMatch.homeTeamName)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (nextMatch.fixtureId) {
                  onPressMatch(nextMatch.fixtureId);
                }
              }}
              style={styles.kickoffWrap}
            >
              <Text style={styles.kickoff}>{toDisplayHour(nextMatch.date)}</Text>
              <Text style={styles.kickoffLabel}>{t('teamDetails.overview.kickoff')}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (nextMatch.awayTeamId) {
                  onPressTeam(nextMatch.awayTeamId);
                }
              }}
              style={styles.teamSide}
            >
              <View style={styles.teamBadge}>
                {nextMatch.awayTeamLogo ? (
                  <AppImage source={{ uri: nextMatch.awayTeamLogo }} style={styles.teamBadgeImage} />
                ) : null}
              </View>
              <Text numberOfLines={2} style={styles.teamName}>
                {toDisplayValue(nextMatch.awayTeamName)}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
      )}
    </View>
  );
}
