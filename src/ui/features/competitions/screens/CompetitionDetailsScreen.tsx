import { useMemo } from 'react';
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
        stateText: {
            color: colors.textMuted,
            fontSize: 15,
            textAlign: 'center',
            paddingHorizontal: 24,
        },
    });
}

export function CompetitionDetailsScreen() {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const screenModel = useCompetitionDetailsScreenModel();

    const renderTabContent = () => {
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
                return screenModel.totwData ? (
                  <CompetitionTotwTab totw={screenModel.totwData} />
                ) : (
                  <View style={styles.centerContainer}>
                    <Text style={styles.stateText}>{t('competitionDetails.totw.unavailable')}</Text>
                  </View>
                );
            default:
                return null;
        }
    };

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

    if (screenModel.isAvailabilityLoading && !screenModel.availabilitySnapshot) {
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
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>{t('competitionDetails.states.loading')}</Text>
          </View>
        </View>
      );
    }

    if (
      !screenModel.isAvailabilityLoading &&
      screenModel.availabilitySnapshot &&
      !screenModel.hasAnyAvailableTab
    ) {
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
          <View style={styles.centerContainer}>
            <Text style={styles.stateText}>{t('competitionDetails.states.noAvailableData')}</Text>
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

            {screenModel.tabs.length > 0 ? (
              <CompetitionTabs
                  activeTab={screenModel.activeTab}
                  tabs={screenModel.tabs}
                  onTabChange={screenModel.setActiveTab}
              />
            ) : null}

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
