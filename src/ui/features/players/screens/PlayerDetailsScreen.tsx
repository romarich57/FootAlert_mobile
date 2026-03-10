import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { getPlayerPrefetchStrategies } from '@data/prefetch/entityPrefetchOrchestrator';
import { usePrefetchOnMount } from '@data/prefetch/usePrefetchOnMount';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { safeNavigateEntity, sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import { PlayerDetailsScreenView } from '@ui/features/players/components/PlayerDetailsScreenView';
import type { PlayerTabType } from '@ui/features/players/components/PlayerTabs';
import { usePlayerDetailsScreenModel } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';
import { usePlayerDetailsScreenEffects } from '@ui/features/players/hooks/usePlayerDetailsScreenEffects';
import { usePlayerNotificationPrefs } from '@ui/features/players/hooks/usePlayerNotificationPrefs';
import { useOfflineUiState } from '@ui/shared/hooks';

type PlayerDetailsScreenRouteProp = RouteProp<RootStackParamList, 'PlayerDetails'>;
type PlayerDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlayerDetails'>;

export function PlayerDetailsScreen() {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const route = useRoute<PlayerDetailsScreenRouteProp>();
    const navigation = useNavigation<PlayerDetailsScreenNavigationProp>();

    const safePlayerId = sanitizeNumericEntityId(route.params.playerId);
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<PlayerTabType>('profil');
    const screenModel = usePlayerDetailsScreenModel({
        playerId: safePlayerId ?? '',
        activeTab,
        followSource: route.params.followSource,
    });
    const prefetchStrategies = useMemo(
        () =>
            getPlayerPrefetchStrategies({
                playerId: safePlayerId ?? '',
                teamId: screenModel.profile?.team.id ?? null,
                season: screenModel.selectedSeason,
            }),
        [safePlayerId, screenModel.profile?.team.id, screenModel.selectedSeason],
    );
    usePrefetchOnMount(prefetchStrategies);
    usePlayerDetailsScreenEffects({
        safePlayerId,
        activeTab,
        screenModel,
        queryClient,
    });

    const {
        notificationPrefs,
        loadPlayerNotificationPrefs,
        savePlayerNotificationPrefs,
    } = usePlayerNotificationPrefs({
        playerId: safePlayerId,
        isPlayerFollowed: screenModel.isPlayerFollowed,
        closeModal: screenModel.closeNotificationModal,
    });

    const openPlayerNotificationModal = useCallback(() => {
        screenModel.openNotificationModal();
        void loadPlayerNotificationPrefs();
    }, [loadPlayerNotificationPrefs, screenModel]);

    const offlineUi = useOfflineUiState({
        hasData: screenModel.hasCachedData,
        isLoading:
            !screenModel.hasCachedData &&
            (
                screenModel.isProfileLoading ||
                screenModel.isMatchesLoading ||
                screenModel.isStatsLoading ||
                screenModel.isCareerLoading
            ),
        lastUpdatedAt: screenModel.lastUpdatedAt,
    });
    const offlineLastUpdatedAt = offlineUi.lastUpdatedAt
        ? new Date(offlineUi.lastUpdatedAt).toISOString()
        : null;

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);
    const handlePressMatch = useCallback((fixtureId: string) => {
        safeNavigateEntity(navigation, 'MatchDetails', fixtureId);
    }, [navigation]);
    const handlePressTeam = useCallback((teamId: string) => {
        safeNavigateEntity(navigation, 'TeamDetails', teamId);
    }, [navigation]);
    const handlePressCompetition = useCallback((competitionId: string) => {
        safeNavigateEntity(navigation, 'CompetitionDetails', competitionId);
    }, [navigation]);
    return (
        <PlayerDetailsScreenView
            safePlayerId={safePlayerId}
            backgroundColor={colors.background}
            textColor={colors.text}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            screenModel={screenModel}
            offlineUi={offlineUi}
            offlineLastUpdatedAt={offlineLastUpdatedAt}
            notificationPrefs={notificationPrefs}
            loadErrorText={t('playerDetails.states.loadError')}
            onBack={handleBack}
            onPressMatch={handlePressMatch}
            onPressTeam={handlePressTeam}
            onPressCompetition={handlePressCompetition}
            onOpenNotificationModal={openPlayerNotificationModal}
            onSaveNotificationPrefs={savePlayerNotificationPrefs}
        />
    );
}
