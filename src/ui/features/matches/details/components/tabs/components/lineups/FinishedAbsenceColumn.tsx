import { Text, View } from 'react-native';

import { AppPressable } from '@ui/shared/components';
import type { MatchLineupTeam } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import {
  normalizeAbsence,
  resolveAbsenceTagLabel,
  sanitizeAbsenceText,
} from '@ui/features/matches/details/components/tabs/lineups/lineupAbsenceMappers';

type FinishedAbsenceColumnProps = {
  styles: MatchDetailsTabStyles;
  team: MatchLineupTeam;
  t: (key: string) => string;
  onPressPlayer?: (playerId: string) => void;
};

export function FinishedAbsenceColumn({
  styles,
  team,
  t,
  onPressPlayer,
}: FinishedAbsenceColumnProps) {
  if (team.absences.length === 0) {
    return null;
  }

  return (
    <View style={styles.lineupColumnList}>
      {team.absences.map((rawAbsence, index) => {
        const absence = normalizeAbsence(rawAbsence);
        const displayName = sanitizeAbsenceText(absence.name, t) ?? t('matchDetails.values.unavailable');
        const tags = [
          resolveAbsenceTagLabel(absence.reason, t),
          resolveAbsenceTagLabel(absence.status, t),
          resolveAbsenceTagLabel(absence.type, t),
        ].filter((tag): tag is string => Boolean(tag));
        const dedupedTags = tags.filter((tag, tagIndex) => tags.indexOf(tag) === tagIndex);
        const displayTags = dedupedTags.length > 0 ? dedupedTags : [t('matchDetails.values.unavailable')];
        const key = `${team.teamId}-absence-${absence.id ?? absence.name}-${index}`;
        const rowContent = (
          <View style={styles.rosterRow}>
            <Text style={styles.rosterName} numberOfLines={1}>
              {displayName}
            </Text>
            {displayTags.map(tag => (
              <Text key={`${key}-${tag}`} style={styles.newsText}>
                {tag}
              </Text>
            ))}
          </View>
        );

        if (absence.id && onPressPlayer) {
          return (
            <AppPressable
              key={`${key}-press`}
              onPress={() => onPressPlayer(absence.id ?? '')}
              accessibilityRole='button'
              accessibilityLabel={displayName}
            >
              {rowContent}
            </AppPressable>
          );
        }

        return <View key={key}>{rowContent}</View>;
      })}
    </View>
  );
}
