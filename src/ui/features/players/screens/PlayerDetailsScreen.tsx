import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { RootStackParamList } from '@ui/app/navigation/types';

import { PlayerHeader } from '@ui/features/players/components/PlayerHeader';
import { PlayerTabs, PlayerTabType } from '@ui/features/players/components/PlayerTabs';
import { PlayerProfileTab } from '@ui/features/players/components/PlayerProfileTab';
import { PlayerMatchesTab } from '@ui/features/players/components/PlayerMatchesTab';
import { PlayerStatsTab } from '@ui/features/players/components/PlayerStatsTab';
import { PlayerCareerTab } from '@ui/features/players/components/PlayerCareerTab';
import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';

import { usePlayerDetailsScreenModel } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';
import { useOfflineUiState } from '@ui/shared/hooks';

type PlayerDetailsScreenRouteProp = RouteProp<RootStackParamList, 'PlayerDetails'>;
type PlayerDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlayerDetails'>;

export function PlayerDetailsScreen() {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const route = useRoute<PlayerDetailsScreenRouteProp>();
    const navigation = useNavigation<PlayerDetailsScreenNavigationProp>();

    const { playerId } = route.params;
    const [activeTab, setActiveTab] = useState<PlayerTabType>('profil');
    const screenModel = usePlayerDetailsScreenModel({ playerId, activeTab });
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
    const handleShare = useCallback(() => {
        // TODO: Implement share logic.
    }, []);
    const handlePressMatch = useCallback((fixtureId: string) => {
        navigation.navigate('MatchDetails', { matchId: fixtureId });
    }, [navigation]);

    if (offlineUi.showOfflineNoCache) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ScreenStateView state="offline" lastUpdatedAt={offlineLastUpdatedAt} />
            </View>
        );
    }

    if (screenModel.isProfileLoading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
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
                />
            );
            break;
        case 'matchs':
            tabContent = screenModel.isMatchesLoading ? (
                <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : (
                <PlayerMatchesTab
                    matches={screenModel.matches}
                    onPressMatch={handlePressMatch}
                />
            );
            break;
        case 'stats':
            tabContent = screenModel.isStatsLoading || !screenModel.stats ? (
                <ActivityIndicator style={styles.loader} color={colors.primary} />
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
                <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : (
                <PlayerCareerTab
                    seasons={screenModel.careerSeasons}
                    teams={screenModel.careerTeams}
                    nationality={profile.nationality ?? undefined}
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
                onBack={handleBack}
                onShare={handleShare}
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
    loader: {
        marginTop: 40,
    },
    offlineBannerWrap: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
});
