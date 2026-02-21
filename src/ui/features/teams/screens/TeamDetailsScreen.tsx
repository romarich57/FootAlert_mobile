import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
  TeamDetailsTabContent,
  TeamHeader,
  TeamSeasonCompetitionPicker,
  TeamTabs,
} from '@ui/features/teams/components';
import { useTeamDetailsScreenModel } from '@ui/features/teams/hooks/useTeamDetailsScreenModel';
import { toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    stateWrap: {
      padding: 16,
    },
    stateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}

export function TeamDetailsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const model = useTeamDetailsScreenModel();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <TeamHeader
        team={model.team}
        isFollowed={model.isFollowed}
        onBack={model.onBack}
        onToggleFollow={model.handleToggleFollow}
        backLabel={t('teamDetails.actions.back')}
        followLabel={t('teamDetails.actions.follow')}
        unfollowLabel={t('teamDetails.actions.unfollow')}
      />

      <TeamTabs activeTab={model.activeTab} onChangeTab={model.handleChangeTab} tabs={model.tabs} />

      <TeamSeasonCompetitionPicker
        competitions={model.competitions}
        selectedLeagueId={model.selectedLeagueId}
        selectedSeason={model.selectedSeason}
        onSelectLeague={model.setLeague}
        onSelectSeason={model.setSeason}
        competitionLabel={t('teamDetails.filters.competition')}
        seasonLabel={t('teamDetails.filters.season')}
      />

      {model.isContextLoading ? (
        <View style={styles.stateWrap}>
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.loading')}</Text>
          </View>
        </View>
      ) : null}

      {model.isContextError ? (
        <View style={styles.stateWrap}>
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
            <Text style={styles.stateText}>{toDisplayValue(model.team.name)}</Text>
            <Text onPress={model.refetchContext} style={[styles.stateText, { color: colors.primary }]}> 
              {t('actions.retry')}
            </Text>
          </View>
        </View>
      ) : null}

      {!model.isContextLoading && !model.isContextError ? (
        <View style={styles.content}>
          <TeamDetailsTabContent
            activeTab={model.activeTab}
            teamId={model.teamId}
            team={model.team}
            hasLeagueSelection={model.hasLeagueSelection}
            labels={{
              noSelection: t('teamDetails.states.noSelection'),
            }}
            onPressMatch={model.handlePressMatch}
            onPressTeam={model.handlePressTeam}
            onPressPlayer={model.handlePressPlayer}
            overviewQuery={model.overviewQuery}
            matchesQuery={model.matchesQuery}
            standingsQuery={model.standingsQuery}
            statsQuery={model.statsQuery}
            transfersQuery={model.transfersQuery}
            squadQuery={model.squadQuery}
            trophiesQuery={model.trophiesQuery}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
