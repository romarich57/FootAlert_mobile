import React, { useCallback, useMemo, useState } from 'react';
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

import { usePlayerDetailsScreenModel } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';

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

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);
    const handleShare = useCallback(() => {
        // TODO: Implement share logic.
    }, []);
    const handlePressMatch = useCallback((fixtureId: string) => {
        navigation.navigate('MatchDetails', { matchId: fixtureId });
    }, [navigation]);

    const seasonText = useMemo(
        () => `${screenModel.currentSeason}/${screenModel.currentSeason + 1}`,
        [screenModel.currentSeason],
    );

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
                    stats={screenModel.basicSeasonStats}
                    characteristics={screenModel.characteristics}
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
                    leagueName={profile.league.name}
                    seasonText={seasonText}
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
});
