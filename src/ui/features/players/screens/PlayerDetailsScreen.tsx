import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { safeNavigateEntity, sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import {
    getNotificationSubscriptions,
    upsertNotificationSubscriptions,
} from '@data/endpoints/notificationsApi';
import {
    buildNotificationSubscriptions,
    hydrateNotificationToggles,
    type AlertTypeMap,
} from '@data/notifications/subscriptionMappings';

import { PlayerHeader } from '@ui/features/players/components/PlayerHeader';
import { PlayerTabs, PlayerTabType } from '@ui/features/players/components/PlayerTabs';
import { PlayerProfileTab } from '@ui/features/players/components/PlayerProfileTab';
import { PlayerMatchesTab } from '@ui/features/players/components/PlayerMatchesTab';
import { PlayerStatsTab } from '@ui/features/players/components/PlayerStatsTab';
import { PlayerCareerTab } from '@ui/features/players/components/PlayerCareerTab';
import {
    PlayerNotificationModal,
    type PlayerNotificationPrefs,
} from '@ui/features/players/components/PlayerNotificationModal';
import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';

import { PlayerDetailsSkeleton } from '@ui/features/players/components/PlayerDetailsSkeleton';
import { usePlayerDetailsScreenModel } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';
import { useOfflineUiState } from '@ui/shared/hooks';

type PlayerAlertPrefKey = Exclude<keyof PlayerNotificationPrefs, 'enabled'>;

const PLAYER_NOTIFICATION_DEFAULTS: PlayerNotificationPrefs = {
    enabled: false,
    startingLineup: true,
    goals: true,
    assists: true,
    yellowCards: true,
    redCards: true,
    missedPenalty: true,
    transfers: true,
    substitution: true,
    matchRating: true,
};

const PLAYER_NOTIFICATION_TOGGLE_DEFAULTS: Omit<PlayerNotificationPrefs, 'enabled'> = {
    startingLineup: PLAYER_NOTIFICATION_DEFAULTS.startingLineup,
    goals: PLAYER_NOTIFICATION_DEFAULTS.goals,
    assists: PLAYER_NOTIFICATION_DEFAULTS.assists,
    yellowCards: PLAYER_NOTIFICATION_DEFAULTS.yellowCards,
    redCards: PLAYER_NOTIFICATION_DEFAULTS.redCards,
    missedPenalty: PLAYER_NOTIFICATION_DEFAULTS.missedPenalty,
    transfers: PLAYER_NOTIFICATION_DEFAULTS.transfers,
    substitution: PLAYER_NOTIFICATION_DEFAULTS.substitution,
    matchRating: PLAYER_NOTIFICATION_DEFAULTS.matchRating,
};

const PLAYER_ALERT_MAP: AlertTypeMap<PlayerAlertPrefKey> = {
    startingLineup: 'starting_lineup',
    goals: 'goal',
    assists: 'assist',
    yellowCards: 'yellow_card',
    redCards: 'red_card',
    missedPenalty: 'missed_penalty',
    transfers: 'transfer',
    substitution: 'substitution',
    matchRating: 'match_rating',
};

type PlayerDetailsScreenRouteProp = RouteProp<RootStackParamList, 'PlayerDetails'>;
type PlayerDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlayerDetails'>;

export function PlayerDetailsScreen() {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const route = useRoute<PlayerDetailsScreenRouteProp>();
    const navigation = useNavigation<PlayerDetailsScreenNavigationProp>();

    const safePlayerId = sanitizeNumericEntityId(route.params.playerId);
    const queryClient = useQueryClient();

    useFocusEffect(
        useCallback(() => {
            if (!safePlayerId) return;
            // Invalide uniquement les queries stale du joueur pour éviter les refetch inutiles
            const filters = { stale: true } as const;
            queryClient.invalidateQueries({ queryKey: ['player_details', safePlayerId], ...filters });
            queryClient.invalidateQueries({ queryKey: ['player_stats', 'v2', safePlayerId], ...filters });
            queryClient.invalidateQueries({ queryKey: ['player_career_aggregate', safePlayerId], ...filters });
        }, [queryClient, safePlayerId]),
    );

    const [activeTab, setActiveTab] = useState<PlayerTabType>('profil');
    const screenModel = usePlayerDetailsScreenModel({
        playerId: safePlayerId ?? '',
        activeTab,
    });
    const [notificationPrefs, setNotificationPrefs] = useState<PlayerNotificationPrefs>({
        ...PLAYER_NOTIFICATION_DEFAULTS,
        enabled: screenModel.isPlayerFollowed,
    });

    const loadPlayerNotificationPrefs = useCallback(async () => {
        if (!safePlayerId) {
            return;
        }

        try {
            const subscriptions = await getNotificationSubscriptions({
                scopeKind: 'player',
                scopeId: safePlayerId,
            });
            const toggles = hydrateNotificationToggles(
                PLAYER_NOTIFICATION_TOGGLE_DEFAULTS,
                PLAYER_ALERT_MAP,
                subscriptions,
            );
            const hasEnabledAlert = Object.values(toggles).some(Boolean);
            setNotificationPrefs({
                enabled: hasEnabledAlert || screenModel.isPlayerFollowed,
                ...toggles,
            });
        } catch {
            setNotificationPrefs(current => ({
                ...current,
                enabled: screenModel.isPlayerFollowed,
            }));
        }
    }, [safePlayerId, screenModel.isPlayerFollowed]);

    const openPlayerNotificationModal = useCallback(() => {
        screenModel.openNotificationModal();
        void loadPlayerNotificationPrefs();
    }, [loadPlayerNotificationPrefs, screenModel]);

    const handleSavePlayerNotificationPrefs = useCallback((prefs: PlayerNotificationPrefs) => {
        setNotificationPrefs(prefs);
        if (!safePlayerId) {
            screenModel.closeNotificationModal();
            return;
        }

        const { enabled, ...toggles } = prefs;
        void upsertNotificationSubscriptions({
            scopeKind: 'player',
            scopeId: safePlayerId,
            subscriptions: buildNotificationSubscriptions(
                toggles,
                PLAYER_ALERT_MAP,
                { disableAll: !enabled },
            ),
        }).finally(() => {
            screenModel.closeNotificationModal();
        });
    }, [safePlayerId, screenModel]);
    const offlineUi = useOfflineUiState({
        hasData: screenModel.hasCachedData,
        isLoading:
            screenModel.isProfileLoading ||
            screenModel.isMatchesLoading ||
            screenModel.isStatsLoading ||
            screenModel.isCareerLoading,
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

    if (!safePlayerId) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.text }}>{t('playerDetails.states.loadError')}</Text>
            </View>
        );
    }

    if (offlineUi.showOfflineNoCache) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ScreenStateView state="offline" lastUpdatedAt={offlineLastUpdatedAt} />
            </View>
        );
    }

    if (screenModel.isProfileLoading) {
        return <PlayerDetailsSkeleton />;
    }

    if (screenModel.isProfileError || !screenModel.profile) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.text }}>{t('playerDetails.states.loadError')}</Text>
            </View>
        );
    }
    const profile = screenModel.profile;

    let tabContent: React.ReactNode = null;
    switch (activeTab) {
        case 'profil':
            tabContent = (
                <PlayerProfileTab
                    profile={profile}
                    competitionStats={screenModel.profileCompetitionStats}
                    characteristics={screenModel.characteristics}
                    positions={screenModel.profilePositions}
                    trophiesByClub={screenModel.profileTrophiesByClub}
                    onPressCompetition={handlePressCompetition}
                />
            );
            break;
        case 'matchs':
            tabContent = screenModel.isMatchesLoading ? (
                <PlayerDetailsSkeleton />
            ) : (
                <PlayerMatchesTab
                    matches={screenModel.matches}
                    onPressMatch={handlePressMatch}
                    onPressCompetition={handlePressCompetition}
                    onPressTeam={handlePressTeam}
                />
            );
            break;
        case 'stats':
            tabContent = screenModel.isStatsLoading || !screenModel.stats ? (
                <PlayerDetailsSkeleton />
            ) : (
                <PlayerStatsTab
                    stats={screenModel.stats}
                    leagueName={screenModel.statsLeagueName}
                    competitions={screenModel.statsCompetitions}
                    selectedSeason={screenModel.statsSelectedSeason}
                    selectedLeagueId={screenModel.statsSelectedLeagueId}
                    onSelectLeagueSeason={screenModel.setStatsLeagueSeason}
                />
            );
            break;
        case 'carriere':
            tabContent = screenModel.isCareerLoading ? (
                <PlayerDetailsSkeleton />
            ) : (
                <PlayerCareerTab
                    seasons={screenModel.careerSeasons}
                    teams={screenModel.careerTeams}
                    nationality={profile.nationality ?? undefined}
                    onPressTeam={handlePressTeam}
                />
            );
            break;
        default:
            tabContent = null;
            break;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <PlayerHeader
                profile={profile}
                isFollowed={screenModel.isPlayerFollowed}
                onBack={handleBack}
                onToggleFollow={screenModel.handleToggleFollow}
                onOpenNotificationModal={openPlayerNotificationModal}
                onPressTeam={handlePressTeam}
            />
            <PlayerTabs
                selectedTab={activeTab}
                onChangeTab={setActiveTab}
            />
            {offlineUi.showOfflineBanner ? (
                <View style={styles.offlineBannerWrap}>
                    <ScreenStateView state="offline" lastUpdatedAt={offlineLastUpdatedAt} />
                </View>
            ) : null}
            {tabContent}

            <PlayerNotificationModal
                visible={screenModel.isNotificationModalOpen}
                initialPrefs={notificationPrefs}
                onClose={screenModel.closeNotificationModal}
                onSave={handleSavePlayerNotificationPrefs}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offlineBannerWrap: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
});
