import { useMemo, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionDetailsScreenModel } from '../hooks/useCompetitionDetailsScreenModel';

import { CompetitionHeader } from '../components/CompetitionHeader';
import { CompetitionTabs } from '../components/CompetitionTabs';
import { CompetitionSeasonPickerModal } from '../components/CompetitionSeasonPickerModal';

import { CompetitionStandingsTab } from '../components/CompetitionStandingsTab';
import { CompetitionMatchesTab } from '../components/CompetitionMatchesTab';
import { CompetitionPlayerStatsTab } from '../components/CompetitionPlayerStatsTab';
import { CompetitionTeamStatsTab } from '../components/CompetitionTeamStatsTab';
import { CompetitionTransfersTab } from '../components/CompetitionTransfersTab';
import { CompetitionTotwTab } from '../components/CompetitionTotwTab';

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
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const screenModel = useCompetitionDetailsScreenModel();

    const renderTabContent = useCallback(() => {
        switch (screenModel.activeTab) {
            case 'standings':
                return (
                  <CompetitionStandingsTab
                    competitionId={screenModel.numericCompetitionId}
                    season={screenModel.actualSeason}
                  />
                );
            case 'matches':
                return (
                  <CompetitionMatchesTab
                    competitionId={screenModel.numericCompetitionId}
                    season={screenModel.actualSeason}
                  />
                );
            case 'playerStats':
                return (
                  <CompetitionPlayerStatsTab
                    competitionId={screenModel.numericCompetitionId}
                    season={screenModel.actualSeason}
                  />
                );
            case 'teamStats':
                return (
                  <CompetitionTeamStatsTab
                    competitionId={screenModel.numericCompetitionId}
                    season={screenModel.actualSeason}
                  />
                );
            case 'transfers':
                return (
                  <CompetitionTransfersTab
                    competitionId={screenModel.numericCompetitionId}
                    season={screenModel.actualSeason}
                  />
                );
            case 'totw':
                return screenModel.totwData ? <CompetitionTotwTab totw={screenModel.totwData} /> : null;
            default:
                return null;
        }
    }, [screenModel]);

    if (!screenModel.competition && screenModel.isCompetitionQueryLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!screenModel.safeCompetitionId) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{t('competitionDetails.states.loadError')}</Text>
            </View>
        );
    }

    if (!screenModel.competition) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{t('competitionDetails.states.loadError')}</Text>
            </View>
        );
    }

    if (screenModel.seasonsLoading) {
        return (
            <View style={styles.container}>
                <CompetitionHeader
                    competition={screenModel.competition}
                    currentSeason={screenModel.defaultSeason}
                    availableSeasons={[]}
                    isFollowed={screenModel.isCompetitionFollowed}
                    onBack={screenModel.handleBack}
                    onToggleFollow={screenModel.handleToggleFollow}
                    onOpenSeasonPicker={screenModel.openSeasonPicker}
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
                competition={screenModel.competition}
                currentSeason={screenModel.actualSeason}
                availableSeasons={screenModel.availableSeasons}
                isFollowed={screenModel.isCompetitionFollowed}
                onBack={screenModel.handleBack}
                onToggleFollow={screenModel.handleToggleFollow}
                onOpenSeasonPicker={screenModel.openSeasonPicker}
            />

            <CompetitionTabs
                activeTab={screenModel.activeTab}
                tabs={screenModel.tabs}
                onTabChange={screenModel.setActiveTab}
            />

            <View style={styles.content}>
                {renderTabContent()}
            </View>

            <CompetitionSeasonPickerModal
                isVisible={screenModel.isSeasonPickerOpen}
                seasons={screenModel.availableSeasons}
                selectedSeason={screenModel.actualSeason}
                onClose={screenModel.closeSeasonPicker}
                onSelectSeason={screenModel.selectSeason}
            />
        </View>
    );
}
