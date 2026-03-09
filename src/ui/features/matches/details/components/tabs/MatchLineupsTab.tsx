import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type {
  MatchLifecycleState,
  MatchLineupTeam,
} from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { MatchDetailsDatasetErrorReason } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import { FinishedLineups } from '@ui/features/matches/details/components/tabs/components/lineups/FinishedLineups';
import { CompactLineupsPanel } from '@ui/features/matches/details/components/tabs/components/lineups/CompactLineupsPanel';

type MatchLineupsTabProps = {
  styles: MatchDetailsTabStyles;
  lifecycleState: MatchLifecycleState;
  lineupTeams: MatchLineupTeam[];
  onRefreshLineups?: () => void;
  isLineupsRefetching?: boolean;
  hasLineupsError?: boolean;
  lineupsErrorReason?: MatchDetailsDatasetErrorReason;
  lineupsDataSource?: 'query' | 'fixture_fallback' | 'none';
  onPressPlayer?: (playerId: string) => void;
  onPressTeam?: (teamId: string) => void;
};

export function MatchLineupsTab({
  styles,
  lifecycleState,
  lineupTeams,
  onRefreshLineups,
  isLineupsRefetching,
  hasLineupsError = false,
  lineupsErrorReason = 'none',
  lineupsDataSource,
  onPressPlayer,
  onPressTeam,
}: MatchLineupsTabProps) {
  const { t } = useTranslation();
  const showFinishedLayout = lifecycleState === 'finished';
  const lineupsEmptyStateKey =
    hasLineupsError && lineupsErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.lineups'
      : hasLineupsError
        ? 'matchDetails.states.datasetErrors.lineups'
        : 'matchDetails.values.unavailable';

  return (
    <View style={styles.content}>
      {lineupTeams.length === 0 ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{t('matchDetails.tabs.lineups')}</Text>
            {onRefreshLineups ? (
              <Pressable onPress={onRefreshLineups} disabled={isLineupsRefetching}>
                <Text style={styles.metricLabel}>
                  {isLineupsRefetching ? t('matchDetails.live.updating') : t('actions.retry')}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.emptyText}>{t(lineupsEmptyStateKey)}</Text>
        </View>
      ) : null}

      {lineupTeams.length > 0 && showFinishedLayout ? (
        <FinishedLineups
          styles={styles}
          lineupTeams={lineupTeams}
          t={t}
          onPressPlayer={onPressPlayer}
          onPressTeam={onPressTeam}
        />
      ) : null}

      {lineupTeams.length > 0 && lineupsDataSource === 'fixture_fallback' ? (
        <View style={styles.card}>
          <Text style={styles.newsText}>{t('matchDetails.states.fallbackSource')}</Text>
        </View>
      ) : null}

      {lineupTeams.length > 0 && !showFinishedLayout ? (
        <CompactLineupsPanel
          styles={styles}
          lineupTeams={lineupTeams}
          lifecycleState={lifecycleState}
          t={t}
          onPressPlayer={onPressPlayer}
          onPressTeam={onPressTeam}
        />
      ) : null}
    </View>
  );
}
