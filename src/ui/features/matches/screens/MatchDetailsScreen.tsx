import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { MatchDetailsHeader } from '@ui/features/matches/details/components/MatchDetailsHeader';
import { MatchDetailsTabContent } from '@ui/features/matches/details/components/MatchDetailsTabContent';
import { MatchDetailsTabs } from '@ui/features/matches/details/components/MatchDetailsTabs';
import { useMatchDetailsScreenModel } from '@ui/features/matches/details/hooks/useMatchDetailsScreenModel';
import type { ThemeColors } from '@ui/shared/theme/theme';

function createStyles(colors: ThemeColors, topInset: number) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    infoText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    retryText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    headerWrap: {
      paddingHorizontal: 12,
      paddingTop: topInset + 12,
      paddingBottom: 8,
      backgroundColor: colors.background,
    },
    body: {
      backgroundColor: colors.background,
    },
  });
}

export function MatchDetailsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
  const model = useMatchDetailsScreenModel();

  if (!model.safeMatchId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.infoText}>{t('matchDetails.states.error')}</Text>
      </View>
    );
  }

  if (model.isInitialLoading && !model.fixture) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.infoText}>{t('matchDetails.states.loading')}</Text>
      </View>
    );
  }

  if (model.isInitialError && !model.fixture) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.infoText}>{t('matchDetails.states.error')}</Text>
        <Pressable onPress={model.onRetryAll}>
          <Text style={styles.retryText}>{t('actions.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!model.fixture) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.infoText}>{t('matchDetails.states.error')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
      <View style={styles.headerWrap}>
        <MatchDetailsHeader
          fixture={model.fixture}
          lifecycleState={model.lifecycleState}
          statusLabel={model.statusLabel}
          kickoffLabel={model.kickoffLabel}
          countdownLabel={model.countdownLabel}
          onBack={() => model.navigation.goBack()}
        />
      </View>

      <MatchDetailsTabs
        tabs={model.tabs}
        activeTab={model.activeTab}
        onChangeTab={model.setActiveTab}
      />

      <View style={styles.body}>
        <MatchDetailsTabContent
          activeTab={model.activeTab}
          lifecycleState={model.lifecycleState}
          fixture={model.fixture}
          events={model.events}
          statistics={model.statistics}
          lineupTeams={model.lineupTeams}
          predictions={model.predictions}
          winPercent={model.winPercent}
          homePlayersStats={model.homePlayersStats}
          awayPlayersStats={model.awayPlayersStats}
          standings={model.standings}
          homeTeamId={model.homeTeamId}
          awayTeamId={model.awayTeamId}
          headToHead={model.headToHead}
          isLiveRefreshing={model.isLiveRefreshing}
          onRefreshLineups={model.onRefreshLineups}
          isLineupsRefetching={model.isLineupsRefetching}
          datasetErrors={model.datasetErrors}
          datasetErrorReasons={model.datasetErrorReasons}
          dataSources={model.dataSources}
          statsRowsByPeriod={model.statsRowsByPeriod}
          statsAvailablePeriods={model.statsAvailablePeriods}
          preMatchTab={model.preMatchTab}
        />
      </View>
    </ScrollView>
  );
}
