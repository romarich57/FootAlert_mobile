import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { TFunction } from 'i18next';

import { AppPressable } from '@ui/shared/components';
import { formatMatchRound } from '@ui/shared/utils/formatMatchRound';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { MatchPreMatchCompetitionMetaPayload } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type MatchCompetitionMetaCardProps = {
  styles: MatchDetailsTabStyles;
  colors: ThemeColors;
  t: TFunction;
  payload: MatchPreMatchCompetitionMetaPayload;
  onPressCompetition?: (competitionId: string) => void;
};

export function MatchCompetitionMetaCard({
  styles,
  colors,
  t,
  payload,
  onPressCompetition,
}: MatchCompetitionMetaCardProps) {
  const roundLabel = payload.competitionRound ? formatMatchRound(payload.competitionRound, t) : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.preMatch.competitionMeta.title')}</Text>

      <View style={styles.preMatchGridContainer}>
        {payload.competitionId && onPressCompetition ? (
          <AppPressable
            style={[styles.preMatchGridItem, styles.preMatchGridItemFull]}
            onPress={() => onPressCompetition(payload.competitionId ?? '')}
            accessibilityRole='button'
            accessibilityLabel={payload.competitionName ?? t('matchDetails.values.unavailable')}
          >
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.league')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>
              {payload.competitionName ?? t('matchDetails.values.unavailable')}
              {payload.competitionType ? ` · ${payload.competitionType}` : ''}
            </Text>
          </AppPressable>
        ) : (
          <View style={[styles.preMatchGridItem, styles.preMatchGridItemFull]}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.league')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>
              {payload.competitionName ?? t('matchDetails.values.unavailable')}
              {payload.competitionType ? ` · ${payload.competitionType}` : ''}
            </Text>
          </View>
        )}

        {roundLabel ? (
          <View style={styles.preMatchGridItem}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="shape-outline" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.roundTitle')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>{roundLabel}</Text>
          </View>
        ) : null}

        {payload.referee ? (
          <View style={styles.preMatchGridItem}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="card-account-details-outline" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.referee')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>{payload.referee}</Text>
          </View>
        ) : null}

        <View style={[styles.preMatchGridItem, styles.preMatchGridItemFull]}>
          <View style={styles.preMatchGridIconRow}>
            <MaterialCommunityIcons name="calendar-clock-outline" size={18} color={colors.primary} />
            <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.date')}</Text>
          </View>
          <Text style={styles.preMatchGridValue}>
            {payload.kickoffDisplay ?? t('matchDetails.values.unavailable')}
          </Text>
        </View>
      </View>
    </View>
  );
}
