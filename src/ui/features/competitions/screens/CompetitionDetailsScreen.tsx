import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import { mapLeagueDtoToCompetition } from '@data/mappers/competitionsMapper';

import { useFollowedCompetitions } from '../hooks/useFollowedCompetitions';
import { useCompetitionSeasons } from '../hooks/useCompetitionSeasons';

import { CompetitionHeader } from '../components/CompetitionHeader';
import { CompetitionTabs, type CompetitionTabKey } from '../components/CompetitionTabs';

import { CompetitionStandingsTab } from '../components/CompetitionStandingsTab';
import { CompetitionMatchesTab } from '../components/CompetitionMatchesTab';
import { CompetitionPlayerStatsTab } from '../components/CompetitionPlayerStatsTab';
import { CompetitionTeamStatsTab } from '../components/CompetitionTeamStatsTab';
import { CompetitionTransfersTab } from '../components/CompetitionTransfersTab';
import { CompetitionTotwTab } from '../components/CompetitionTotwTab';
import { CompetitionSeasonsTab } from '../components/CompetitionSeasonsTab';

type CompetitionDetailsScreenRouteProp = RouteProp<RootStackParamList, 'CompetitionDetails'>;

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            flex: 1,
        },
        centerContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        errorText: {
            color: colors.danger,
            fontSize: 16,
        },
    });
}

export function CompetitionDetailsScreen() {
    const route = useRoute<CompetitionDetailsScreenRouteProp>();
    const navigation = useNavigation();
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { competitionId, competition: routeCompetition } = route.params;
    const numericCompetitionId = Number(competitionId);

    const competitionQuery = useQuery({
        queryKey: queryKeys.competitions.detailsHeader(competitionId),
        queryFn: async ({ signal }) => {
            const dto = await fetchLeagueById(competitionId, signal);
            return mapLeagueDtoToCompetition(dto);
        },
        enabled: !routeCompetition || routeCompetition.id !== competitionId,
        staleTime: 12 * 60 * 60 * 1000,
    });

    const competition = useMemo(() => {
        if (routeCompetition && routeCompetition.id === competitionId) {
            return routeCompetition;
        }
        return competitionQuery.data ?? null;
    }, [competitionId, competitionQuery.data, routeCompetition]);

    const [activeTab, setActiveTab] = useState<CompetitionTabKey>('standings');
    const { toggleFollow, followedIds } = useFollowedCompetitions();
    const isCompFollowed = followedIds.includes(competitionId);

    // To select the default season correctly, we use the custom hook
    const { data: seasons, isLoading: seasonsLoading } = useCompetitionSeasons(numericCompetitionId);

    // Default season is the current one or the most recent one
    const defaultSeason = useMemo(() => {
        if (!seasons || seasons.length === 0) return new Date().getFullYear();
        const current = seasons.find(s => s.current);
        return current ? current.year : seasons[0].year; // Array is sorted descending in hook
    }, [seasons]);

    const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

    const actualSeason = selectedSeason ?? defaultSeason;

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleToggleFollow = useCallback(() => {
        toggleFollow(competitionId);
    }, [competitionId, toggleFollow]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'standings':
                return <CompetitionStandingsTab competitionId={numericCompetitionId} season={actualSeason} />;
            case 'matches':
                return <CompetitionMatchesTab competitionId={numericCompetitionId} season={actualSeason} />;
            case 'playerStats':
                return <CompetitionPlayerStatsTab competitionId={numericCompetitionId} season={actualSeason} />;
            case 'teamStats':
                return <CompetitionTeamStatsTab competitionId={numericCompetitionId} season={actualSeason} />;
            case 'transfers':
                return <CompetitionTransfersTab competitionId={numericCompetitionId} season={actualSeason} />;
            case 'totw':
                return <CompetitionTotwTab competitionId={numericCompetitionId} season={actualSeason} />;
            case 'seasons':
                return (
                    <CompetitionSeasonsTab
                        competitionId={numericCompetitionId}
                        currentSeason={actualSeason}
                        onSeasonSelect={(newSeason) => {
                            setSelectedSeason(newSeason);
                            setActiveTab('standings'); // Optional: redirect to standings when season changed
                        }}
                    />
                );
            default:
                return null;
        }
    };

    if (!competition && competitionQuery.isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!competition) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{t('competitionDetails.states.loadError')}</Text>
            </View>
        );
    }

    if (seasonsLoading) {
        return (
            <View style={styles.container}>
                <CompetitionHeader
                    competition={competition}
                    currentSeason={defaultSeason}
                    availableSeasons={[]}
                    isFollowed={isCompFollowed}
                    onBack={handleBack}
                    onToggleFollow={handleToggleFollow}
                    onOpenSeasonPicker={() => setActiveTab('seasons')}
                />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CompetitionHeader
                competition={competition}
                currentSeason={actualSeason}
                availableSeasons={seasons?.map(s => s.year) || []}
                isFollowed={isCompFollowed}
                onBack={handleBack}
                onToggleFollow={handleToggleFollow}
                onOpenSeasonPicker={() => setActiveTab('seasons')}
            />

            <CompetitionTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <View style={styles.content}>
                {renderTabContent()}
            </View>
        </View>
    );
}
