import React from 'react';
import { Text, View } from 'react-native';

import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';
import { PlayerHeader } from '@ui/features/players/components/PlayerHeader';
import {
  PlayerNotificationModal,
  type PlayerNotificationPrefs,
} from '@ui/features/players/components/PlayerNotificationModal';
import { PlayerDetailsSkeleton } from '@ui/features/players/components/PlayerDetailsSkeleton';
import { PlayerDetailsTabContent } from '@ui/features/players/components/PlayerDetailsTabContent';
import { PlayerTabs, type PlayerTabType } from '@ui/features/players/components/PlayerTabs';
import { usePlayerDetailsScreenModel } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';
import { playerDetailsScreenStyles } from '@ui/features/players/screens/PlayerDetailsScreen.styles';
import { FreshnessIndicator } from '@ui/shared/components';
import { useOfflineUiState } from '@ui/shared/hooks';

type PlayerDetailsScreenModel = ReturnType<typeof usePlayerDetailsScreenModel>;
type PlayerOfflineUiState = ReturnType<typeof useOfflineUiState>;

type PlayerDetailsScreenViewProps = {
  safePlayerId: string | null;
  backgroundColor: string;
  textColor: string;
  activeTab: PlayerTabType;
  onChangeTab: (tab: PlayerTabType) => void;
  screenModel: PlayerDetailsScreenModel;
  offlineUi: PlayerOfflineUiState;
  offlineLastUpdatedAt: string | null;
  notificationPrefs: PlayerNotificationPrefs;
  loadErrorText: string;
  onBack: () => void;
  onPressMatch: (fixtureId: string) => void;
  onPressTeam: (teamId: string) => void;
  onPressCompetition: (competitionId: string) => void;
  onOpenNotificationModal: () => void;
  onSaveNotificationPrefs: (prefs: PlayerNotificationPrefs) => void;
};

export function PlayerDetailsScreenView({
  safePlayerId,
  backgroundColor,
  textColor,
  activeTab,
  onChangeTab,
  screenModel,
  offlineUi,
  offlineLastUpdatedAt,
  notificationPrefs,
  loadErrorText,
  onBack,
  onPressMatch,
  onPressTeam,
  onPressCompetition,
  onOpenNotificationModal,
  onSaveNotificationPrefs,
}: PlayerDetailsScreenViewProps) {
  const isRefetchingSilently =
    screenModel.hasCachedData &&
    (
      screenModel.isProfileLoading ||
      screenModel.isMatchesLoading ||
      screenModel.isStatsLoading ||
      screenModel.isCareerLoading
    );

  if (!safePlayerId) {
    return (
      <View style={[playerDetailsScreenStyles.center, { backgroundColor }]}>
        <Text style={{ color: textColor }}>{loadErrorText}</Text>
      </View>
    );
  }

  if (offlineUi.showOfflineNoCache) {
    return (
      <View style={[playerDetailsScreenStyles.center, { backgroundColor }]}>
        <ScreenStateView state='offline' lastUpdatedAt={offlineLastUpdatedAt} />
      </View>
    );
  }

  if (screenModel.isProfileLoading && !screenModel.profile && !screenModel.hasCachedData) {
    return <PlayerDetailsSkeleton />;
  }

  if (!screenModel.profile || (screenModel.isProfileError && !screenModel.hasCachedData)) {
    return (
      <View style={[playerDetailsScreenStyles.center, { backgroundColor }]}>
        <Text style={{ color: textColor }}>{loadErrorText}</Text>
      </View>
    );
  }

  return (
    <View
      style={[playerDetailsScreenStyles.container, { backgroundColor }]}
      testID='player-details-screen'
    >
      <PlayerHeader
        profile={screenModel.profile}
        isFollowed={screenModel.isPlayerFollowed}
        onBack={onBack}
        onToggleFollow={screenModel.handleToggleFollow}
        onOpenNotificationModal={onOpenNotificationModal}
        onPressTeam={onPressTeam}
      />
      <PlayerTabs selectedTab={activeTab} onChangeTab={onChangeTab} />
      {offlineUi.showOfflineBanner ? (
        <View style={playerDetailsScreenStyles.offlineBannerWrap}>
          <ScreenStateView state='offline' lastUpdatedAt={offlineLastUpdatedAt} />
        </View>
      ) : null}
      {!offlineUi.showOfflineBanner ? (
        <View style={playerDetailsScreenStyles.offlineBannerWrap}>
          <FreshnessIndicator
            lastUpdatedAt={screenModel.lastUpdatedAt}
            isRefreshing={isRefetchingSilently}
            visible={Boolean(screenModel.lastUpdatedAt || isRefetchingSilently)}
          />
        </View>
      ) : null}
      <PlayerDetailsTabContent
        activeTab={activeTab}
        profile={screenModel.profile}
        screenModel={screenModel}
        onPressMatch={onPressMatch}
        onPressTeam={onPressTeam}
        onPressCompetition={onPressCompetition}
      />
      <PlayerNotificationModal
        visible={screenModel.isNotificationModalOpen}
        initialPrefs={notificationPrefs}
        onClose={screenModel.closeNotificationModal}
        onSave={onSaveNotificationPrefs}
      />
    </View>
  );
}
