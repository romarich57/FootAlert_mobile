import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
  getNotificationSubscriptions,
  upsertNotificationSubscriptions,
} from '@data/endpoints/notificationsApi';
import {
  buildNotificationSubscriptions,
  hydrateNotificationToggles,
  type AlertTypeMap,
} from '@data/notifications/subscriptionMappings';
import {
  TeamCompetitionSeasonSelector,
  TeamDetailsTabContent,
  TeamHeader,
  TeamSeasonDropdown,
  TeamTabs,
} from '@ui/features/teams/components';
import {
  TeamNotificationModal,
  type TeamNotificationPrefs,
} from '@ui/features/teams/components/TeamNotificationModal';
import { useTeamDetailsScreenModel } from '@ui/features/teams/hooks/useTeamDetailsScreenModel';
import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';
import { useOfflineUiState } from '@ui/shared/hooks';
import { toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { TeamDetailsSkeleton } from '@ui/features/teams/components/TeamDetailsSkeleton';

type TeamAlertPrefKey = Exclude<keyof TeamNotificationPrefs, 'enabled'>;

const TEAM_NOTIFICATION_DEFAULTS: TeamNotificationPrefs = {
  enabled: false,
  matchStart: true,
  halftime: true,
  matchEnd: true,
  goals: true,
  redCards: true,
  missedPenalty: true,
  transfers: true,
  lineups: true,
  matchReminder: true,
};

const TEAM_NOTIFICATION_TOGGLE_DEFAULTS: Omit<TeamNotificationPrefs, 'enabled'> = {
  matchStart: TEAM_NOTIFICATION_DEFAULTS.matchStart,
  halftime: TEAM_NOTIFICATION_DEFAULTS.halftime,
  matchEnd: TEAM_NOTIFICATION_DEFAULTS.matchEnd,
  goals: TEAM_NOTIFICATION_DEFAULTS.goals,
  redCards: TEAM_NOTIFICATION_DEFAULTS.redCards,
  missedPenalty: TEAM_NOTIFICATION_DEFAULTS.missedPenalty,
  transfers: TEAM_NOTIFICATION_DEFAULTS.transfers,
  lineups: TEAM_NOTIFICATION_DEFAULTS.lineups,
  matchReminder: TEAM_NOTIFICATION_DEFAULTS.matchReminder,
};

const TEAM_ALERT_MAP: AlertTypeMap<TeamAlertPrefKey> = {
  matchStart: 'match_start',
  halftime: 'halftime',
  matchEnd: 'match_end',
  goals: 'goal',
  redCards: 'red_card',
  missedPenalty: 'missed_penalty',
  transfers: 'transfer',
  lineups: 'lineup',
  matchReminder: 'match_reminder',
};

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
    loadingIndicator: {
      alignSelf: 'center',
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
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      if (!model.teamId) return;
      // Invalide uniquement les queries stale des onglets teams pour éviter les refetch inutiles
      const filters = { stale: true } as const;
      queryClient.invalidateQueries({ queryKey: ['team_overview', model.teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_matches', model.teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_stats', model.teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_standings', model.teamId], ...filters });
    }, [queryClient, model.teamId]),
  );
  const [notificationPrefs, setNotificationPrefs] = useState<TeamNotificationPrefs>({
    ...TEAM_NOTIFICATION_DEFAULTS,
    enabled: model.isFollowed,
  });

  const loadTeamNotificationPrefs = useCallback(async () => {
    if (!model.teamId) {
      return;
    }

    try {
      const subscriptions = await getNotificationSubscriptions({
        scopeKind: 'team',
        scopeId: model.teamId,
      });
      const toggles = hydrateNotificationToggles(
        TEAM_NOTIFICATION_TOGGLE_DEFAULTS,
        TEAM_ALERT_MAP,
        subscriptions,
      );
      const hasEnabledAlert = Object.values(toggles).some(Boolean);
      setNotificationPrefs({
        enabled: hasEnabledAlert || model.isFollowed,
        ...toggles,
      });
    } catch {
      setNotificationPrefs(current => ({
        ...current,
        enabled: model.isFollowed,
      }));
    }
  }, [model.isFollowed, model.teamId]);

  const openTeamNotificationModal = useCallback(() => {
    model.openNotificationModal();
    void loadTeamNotificationPrefs();
  }, [loadTeamNotificationPrefs, model]);

  const handleSaveTeamNotificationPrefs = useCallback((prefs: TeamNotificationPrefs) => {
    setNotificationPrefs(prefs);
    if (!model.teamId) {
      model.closeNotificationModal();
      return;
    }

    const { enabled, ...toggles } = prefs;
    void upsertNotificationSubscriptions({
      scopeKind: 'team',
      scopeId: model.teamId,
      subscriptions: buildNotificationSubscriptions(
        toggles,
        TEAM_ALERT_MAP,
        { disableAll: !enabled },
      ),
    }).finally(() => {
      model.closeNotificationModal();
    });
  }, [model]);

  const offlineUi = useOfflineUiState({
    hasData: model.hasCachedData,
    isLoading: model.isContextLoading,
    lastUpdatedAt: model.lastUpdatedAt,
  });
  const offlineLastUpdatedAt = offlineUi.lastUpdatedAt
    ? new Date(offlineUi.lastUpdatedAt).toISOString()
    : null;

  const allSeasons = useMemo(
    () => Array.from(new Set(model.competitions.flatMap(c => c.seasons))).sort((a, b) => b - a),
    [model.competitions]
  );
  const standingsLogoUri = useMemo(
    () =>
      model.competitions.find(competition => competition.leagueId === model.selectedLeagueId)?.leagueLogo ??
      null,
    [model.competitions, model.selectedLeagueId],
  );

  if (!model.isValidTeamId) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.stateWrap}>
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <TeamHeader
        team={model.team}
        isFollowed={model.isFollowed}
        onBack={model.onBack}
        onToggleFollow={model.handleToggleFollow}
        onOpenNotificationModal={openTeamNotificationModal}
        backLabel={t('teamDetails.actions.back')}
        followLabel={t('teamDetails.actions.follow')}
        unfollowLabel={t('teamDetails.actions.unfollow')}
      />

      <TeamTabs activeTab={model.activeTab} onChangeTab={model.handleChangeTab} tabs={model.tabs} />

      {offlineUi.showOfflineBanner ? (
        <View style={styles.stateWrap}>
          <ScreenStateView state="offline" lastUpdatedAt={offlineLastUpdatedAt} />
        </View>
      ) : null}

      {!offlineUi.showOfflineNoCache &&
        model.activeTab !== 'overview' &&
        model.activeTab !== 'squad' &&
        model.activeTab !== 'transfers' &&
        model.activeTab !== 'standings' ? (
        <TeamCompetitionSeasonSelector
          competitions={model.competitions}
          selectedLeagueId={model.selectedLeagueId}
          selectedSeason={model.selectedSeason}
          onSelect={model.setLeagueSeason}
          modalTitle={t('teamDetails.filters.selectCompetitionSeason')}
          doneLabel={t('common.done')}
        />
      ) : null}

      {!offlineUi.showOfflineNoCache && model.activeTab === 'transfers' ? (
        <TeamSeasonDropdown
          seasons={allSeasons}
          selectedSeason={model.selectedSeason}
          onSelectSeason={model.setSeason}
        />
      ) : null}

      {!offlineUi.showOfflineNoCache && model.activeTab === 'standings' ? (
        <TeamSeasonDropdown
          seasons={model.standingsSeasons}
          selectedSeason={model.selectedSeason}
          onSelectSeason={model.setSeason}
          logoUri={standingsLogoUri}
        />
      ) : null}

      {offlineUi.showOfflineNoCache ? (
        <View style={styles.stateWrap}>
          <ScreenStateView state="offline" lastUpdatedAt={offlineLastUpdatedAt} />
        </View>
      ) : null}

      {!offlineUi.showOfflineNoCache && model.isContextLoading ? (
        <TeamDetailsSkeleton />
      ) : null}

      {!offlineUi.showOfflineNoCache && model.isContextError ? (
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

      {!offlineUi.showOfflineNoCache && !model.isContextLoading && !model.isContextError ? (
        <View style={styles.content}>
          <TeamDetailsTabContent
            activeTab={model.activeTab}
            teamId={model.teamId}
            team={model.team}
            hasLeagueSelection={model.hasLeagueSelection}
            competitions={model.competitions}
            selectedSeason={model.selectedSeason}
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
          />
        </View>
      ) : null}

      <TeamNotificationModal
        visible={model.isNotificationModalOpen}
        initialPrefs={notificationPrefs}
        onClose={model.closeNotificationModal}
        onSave={handleSaveTeamNotificationPrefs}
      />
    </SafeAreaView>
  );
}
