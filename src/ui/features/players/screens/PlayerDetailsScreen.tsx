import React, { useState } from 'react';
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

import { usePlayerDetails } from '@ui/features/players/hooks/usePlayerDetails';
import { usePlayerMatches } from '@ui/features/players/hooks/usePlayerMatches';
import { usePlayerStats } from '@ui/features/players/hooks/usePlayerStats';
import { usePlayerCareer } from '@ui/features/players/hooks/usePlayerCareer';

type PlayerDetailsScreenRouteProp = RouteProp<RootStackParamList, 'PlayerDetails'>;
type PlayerDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlayerDetails'>;

export function PlayerDetailsScreen() {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const route = useRoute<PlayerDetailsScreenRouteProp>();
    const navigation = useNavigation<PlayerDetailsScreenNavigationProp>();

    const { playerId } = route.params;
    const currentDate = new Date();
    const currentSeason = currentDate.getUTCMonth() + 1 >= 7
        ? currentDate.getUTCFullYear()
        : currentDate.getUTCFullYear() - 1;

    const [activeTab, setActiveTab] = useState<PlayerTabType>('profil');
    const isMatchesTabActive = activeTab === 'matchs';
    const isStatsTabActive = activeTab === 'stats';
    const isCareerTabActive = activeTab === 'carriere';

    // Fetch core player details (needed for Header and Profile)
    const {
        profile,
        characteristics,
        seasonStats: basicSeasonStats,
        isLoading: isProfileLoading,
        isError: isProfileError
    } = usePlayerDetails(playerId, currentSeason);

    // Fetch matches conditionally if tab is selected or preload
    const { matches, isLoading: isMatchesLoading } = usePlayerMatches(
        playerId,
        profile?.team.id ?? '',
        currentSeason,
        isMatchesTabActive && Boolean(profile?.team.id)
    );

    // Fetch deep stats
    const { stats, isLoading: isStatsLoading } = usePlayerStats(playerId, currentSeason, isStatsTabActive);

    // Fetch career
    const { careerSeasons, careerTeams, isLoading: isCareerLoading } = usePlayerCareer(playerId, isCareerTabActive);

    if (isProfileLoading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (isProfileError || !profile) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.text }}>{t('playerDetails.states.loadError')}</Text>
            </View>
        );
    }

    const handleBack = () => navigation.goBack();
    const handleShare = () => { /* Implement share logic */ };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profil':
                return (
                    <PlayerProfileTab
                        profile={profile}
                        stats={basicSeasonStats}
                        characteristics={characteristics}
                    />
                );
            case 'matchs':
                if (isMatchesLoading) return <ActivityIndicator style={styles.loader} color={colors.primary} />;
                return (
                    <PlayerMatchesTab
                        matches={matches}
                        onPressMatch={(fixtureId) => navigation.navigate('MatchDetails', { matchId: fixtureId })}
                    />
                );
            case 'stats':
                if (isStatsLoading || !stats) return <ActivityIndicator style={styles.loader} color={colors.primary} />;
                return (
                    <PlayerStatsTab
                        stats={stats}
                        leagueName={profile.league.name}
                        seasonText={`${currentSeason}/${currentSeason + 1}`}
                    />
                );
            case 'carriere':
                if (isCareerLoading) return <ActivityIndicator style={styles.loader} color={colors.primary} />;
                return (
                    <PlayerCareerTab
                        seasons={careerSeasons}
                        teams={careerTeams}
                    />
                );
            default:
                return null;
        }
    };

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
            {renderTabContent()}
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
});
