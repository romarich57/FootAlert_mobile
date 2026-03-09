import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';
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
import { TeamDetailsSkeleton } from '@ui/features/teams/components/TeamDetailsSkeleton';
import { useTeamDetailsScreenModel } from '@ui/features/teams/hooks/useTeamDetailsScreenModel';
import { useOfflineUiState } from '@ui/shared/hooks';
import { toDisplayValue } from '@ui/features/teams/utils/teamDisplay';

type TeamDetailsScreenModel = ReturnType<typeof useTeamDetailsScreenModel>;
type TeamOfflineUiState = ReturnType<typeof useOfflineUiState>;

type TeamDetailsScreenLabels = {
  error: string;
  retry: string;
  back: string;
  follow: string;
  unfollow: string;
  noSelection: string;
  selectCompetitionSeason: string;
  done: string;
};

type TeamDetailsScreenViewProps = {
  model: TeamDetailsScreenModel;
  styles: {
    container: object;
    content: object;
    stateWrap: object;
    stateCard: object;
    stateText: object;
  };
  offlineUi: TeamOfflineUiState;
  offlineLastUpdatedAt: string | null;
  standingsLogoUri: string | null;
  notificationPrefs: TeamNotificationPrefs;
  labels: TeamDetailsScreenLabels;
  primaryColor: string;
  onOpenNotificationModal: () => void;
  onSaveNotificationPrefs: (prefs: TeamNotificationPrefs) => void;
};

export function TeamDetailsScreenView({
  model,
  styles,
  offlineUi,
  offlineLastUpdatedAt,
  standingsLogoUri,
  notificationPrefs,
  labels,
  primaryColor,
  onOpenNotificationModal,
  onSaveNotificationPrefs,
}: TeamDetailsScreenViewProps) {
  if (!model.isValidTeamId) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.stateWrap}>
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{labels.error}</Text>
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
        onOpenNotificationModal={onOpenNotificationModal}
        backLabel={labels.back}
        followLabel={labels.follow}
        unfollowLabel={labels.unfollow}
      />

      <TeamTabs activeTab={model.activeTab} onChangeTab={model.handleChangeTab} tabs={model.tabs} />

      {offlineUi.showOfflineBanner ? (
        <View style={styles.stateWrap}>
          <ScreenStateView state='offline' lastUpdatedAt={offlineLastUpdatedAt} />
        </View>
      ) : null}

      {!offlineUi.showOfflineNoCache &&
      model.activeTab !== 'overview' &&
      model.activeTab !== 'squad' &&
      model.activeTab !== 'transfers' &&
      model.activeTab !== 'standings' ? (
        <TeamCompetitionSeasonSelector
          competitions={model.competitions}
          selectedLeagueId={model.contentSelection.leagueId}
          selectedSeason={model.contentSelection.season}
          onSelect={model.setContentLeagueSeason}
          modalTitle={labels.selectCompetitionSeason}
          doneLabel={labels.done}
        />
      ) : null}

      {!offlineUi.showOfflineNoCache && model.activeTab === 'transfers' ? (
        <TeamSeasonDropdown
          seasons={model.allSeasons}
          selectedSeason={model.transfersSeason}
          onSelectSeason={model.setTransfersSeason}
        />
      ) : null}

      {!offlineUi.showOfflineNoCache && model.activeTab === 'standings' ? (
        <TeamSeasonDropdown
          seasons={model.standingsSeasons}
          selectedSeason={model.standingsSelection.season}
          onSelectSeason={model.setStandingsSeason}
          logoUri={standingsLogoUri}
        />
      ) : null}

      {offlineUi.showOfflineNoCache ? (
        <View style={styles.stateWrap}>
          <ScreenStateView state='offline' lastUpdatedAt={offlineLastUpdatedAt} />
        </View>
      ) : null}

      {!offlineUi.showOfflineNoCache && model.isContextLoading ? <TeamDetailsSkeleton /> : null}

      {!offlineUi.showOfflineNoCache && model.isContextError ? (
        <View style={styles.stateWrap}>
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{labels.error}</Text>
            <Text style={styles.stateText}>{toDisplayValue(model.team.name)}</Text>
            <Text onPress={model.refetchContext} style={[styles.stateText, { color: primaryColor }]}>
              {labels.retry}
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
            hasContentSelection={model.hasContentSelection}
            hasStandingsSelection={model.hasStandingsSelection}
            competitions={model.competitions}
            selectedSeason={model.contentSelection.season}
            labels={{
              noSelection: labels.noSelection,
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
        onSave={onSaveNotificationPrefs}
      />
    </SafeAreaView>
  );
}
