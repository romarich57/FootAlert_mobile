import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { TeamDetailsScreenView } from '@ui/features/teams/components/TeamDetailsScreenView';
import { useTeamDetailsScreenModel } from '@ui/features/teams/hooks/useTeamDetailsScreenModel';
import { useRefreshTeamDetailsOnFocus } from '@ui/features/teams/hooks/useRefreshTeamDetailsOnFocus';
import { useTeamDetailsTelemetry } from '@ui/features/teams/hooks/useTeamDetailsTelemetry';
import { useTeamNotificationPrefs } from '@ui/features/teams/hooks/useTeamNotificationPrefs';
import { createTeamDetailsScreenStyles } from '@ui/features/teams/screens/TeamDetailsScreen.styles';
import { useOfflineUiState } from '@ui/shared/hooks';

export function TeamDetailsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamDetailsScreenStyles(colors), [colors]);

  const model = useTeamDetailsScreenModel();
  const queryClient = useQueryClient();
  useRefreshTeamDetailsOnFocus({
    teamId: model.teamId,
    queryClient,
  });
  useTeamDetailsTelemetry(model);

  const {
    notificationPrefs,
    loadTeamNotificationPrefs,
    saveTeamNotificationPrefs,
  } = useTeamNotificationPrefs({
    teamId: model.teamId,
    isFollowed: model.isFollowed,
    closeModal: model.closeNotificationModal,
  });

  const openTeamNotificationModal = useCallback(() => {
    model.openNotificationModal();
    void loadTeamNotificationPrefs();
  }, [loadTeamNotificationPrefs, model]);

  const offlineUi = useOfflineUiState({
    hasData: model.hasCachedData,
    isLoading: model.isContextLoading,
    lastUpdatedAt: model.lastUpdatedAt,
  });
  const offlineLastUpdatedAt = offlineUi.lastUpdatedAt
    ? new Date(offlineUi.lastUpdatedAt).toISOString()
    : null;

  const standingsLogoUri = useMemo(
    () =>
      model.competitions.find(competition => competition.leagueId === model.standingsSelection.leagueId)?.leagueLogo ??
      null,
    [model.competitions, model.standingsSelection.leagueId],
  );

  return (
    <TeamDetailsScreenView
      model={model}
      styles={styles}
      offlineUi={offlineUi}
      offlineLastUpdatedAt={offlineLastUpdatedAt}
      standingsLogoUri={standingsLogoUri}
      notificationPrefs={notificationPrefs}
      labels={{
        error: t('teamDetails.states.error'),
        retry: t('actions.retry'),
        back: t('teamDetails.actions.back'),
        follow: t('teamDetails.actions.follow'),
        unfollow: t('teamDetails.actions.unfollow'),
        noSelection: t('teamDetails.states.noSelection'),
        selectCompetitionSeason: t('teamDetails.filters.selectCompetitionSeason'),
        done: t('common.done'),
      }}
      primaryColor={colors.primary}
      onOpenNotificationModal={openTeamNotificationModal}
      onSaveNotificationPrefs={saveTeamNotificationPrefs}
    />
  );
}
