import { Text, View } from 'react-native';

import type { TeamOverviewCoachPerformance } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue, toPercent } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';

import { toDecimal } from './overviewSelectors';
import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

type OverviewCoachPerformanceCardProps = {
  styles: TeamOverviewStyles;
  t: (key: string) => string;
  coachPerformance: TeamOverviewCoachPerformance | null;
};

export function OverviewCoachPerformanceCard({
  styles,
  t,
  coachPerformance,
}: OverviewCoachPerformanceCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('teamDetails.overview.coachPerformance')}</Text>

      {coachPerformance?.coach ? (
        <>
          <View style={styles.coachHeader}>
            <View style={styles.coachAvatarWrap}>
              {coachPerformance.coach.photo ? (
                <AppImage source={{ uri: coachPerformance.coach.photo }} style={styles.coachAvatar} />
              ) : null}
            </View>
            <View style={styles.coachInfoWrap}>
              <Text numberOfLines={1} style={styles.coachName}>
                {toDisplayValue(coachPerformance.coach.name)}
              </Text>
              <Text style={styles.coachMeta}>
                {toDisplayValue(coachPerformance.played)} {t('teamDetails.labels.played')}
              </Text>
            </View>
          </View>

          <View style={styles.coachStatsRow}>
            <View style={styles.coachStat}>
              <Text style={styles.coachStatLabel}>{t('teamDetails.overview.coachWinRate')}</Text>
              <Text style={styles.coachStatValue}>{toPercent(coachPerformance.winRate)}</Text>
            </View>
            <View style={styles.coachStat}>
              <Text style={styles.coachStatLabel}>{t('teamDetails.overview.coachPointsPerMatch')}</Text>
              <Text style={styles.coachStatValue}>{toDecimal(coachPerformance.pointsPerMatch, 2)}</Text>
            </View>
          </View>

          <Text style={styles.coachRecord}>
            {`${toDisplayNumber(coachPerformance.wins)}G • ${toDisplayNumber(coachPerformance.draws)}N • ${toDisplayNumber(coachPerformance.losses)}D`}
          </Text>
        </>
      ) : (
        <Text style={styles.stateText}>{t('teamDetails.overview.coachNoData')}</Text>
      )}
    </View>
  );
}
