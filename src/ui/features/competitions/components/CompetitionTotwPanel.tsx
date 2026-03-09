import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionTotw } from '../hooks/useCompetitionTotw';
import { CompetitionTotwTab } from './CompetitionTotwTab';

type CompetitionTotwPanelProps = {
  competitionId: number;
  season: number;
  onPressPlayer?: (playerId: string) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: 24,
    },
    errorText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}

export function CompetitionTotwPanel({
  competitionId,
  season,
  onPressPlayer,
}: CompetitionTotwPanelProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const totwQuery = useCompetitionTotw(competitionId, season);

  if (totwQuery.isLoading && !totwQuery.data) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (totwQuery.error) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.errorText}>{t('competitionDetails.totw.unavailable')}</Text>
      </View>
    );
  }

  const totw = totwQuery.data ?? {
    formation: '4-3-3' as const,
    season,
    averageRating: 0,
    state: 'unavailable' as const,
    players: [],
    placeholderSlots: [],
  };

  return <CompetitionTotwTab totw={totw} onPressPlayer={onPressPlayer} />;
}
