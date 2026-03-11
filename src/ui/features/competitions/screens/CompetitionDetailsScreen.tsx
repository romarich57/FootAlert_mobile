import { useMemo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getCompetitionPrefetchStrategies } from '@data/prefetch/entityPrefetchOrchestrator';
import { usePrefetchOnMount } from '@data/prefetch/usePrefetchOnMount';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { FreshnessIndicator } from '@ui/shared/components';
import { useOfflineUiState } from '@ui/shared/hooks';
import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionDetailsTelemetry } from '../hooks/useCompetitionDetailsTelemetry';
import { useCompetitionDetailsScreenModel } from '../hooks/useCompetitionDetailsScreenModel';

import { CompetitionHeader } from '../components/CompetitionHeader';
import { CompetitionTabs } from '../components/CompetitionTabs';
import { CompetitionSeasonPickerModal } from '../components/CompetitionSeasonPickerModal';
import { CompetitionNotificationModal } from '../components/CompetitionNotificationModal';
import type { CompetitionTabKey } from '../components/CompetitionTabs';
import { useCompetitionNotificationPrefs } from '../hooks/useCompetitionNotificationPrefs';
import { renderCompetitionDetailsTab } from './competitionDetailsTabRegistry';

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            flex: 1,
        },
        tabPanel: {
            flex: 1,
        },
        hiddenTabPanel: {
            display: 'none',
        },
        centerContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        freshnessWrap: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            alignItems: 'flex-start',
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
    const prefetchStrategies = useMemo(
        () =>
            getCompetitionPrefetchStrategies({
                competitionId: screenModel.safeCompetitionId ?? '',
                season: screenModel.actualSeason,
            }),
        [screenModel.actualSeason, screenModel.safeCompetitionId],
    );
    usePrefetchOnMount(prefetchStrategies);
    useCompetitionDetailsTelemetry(screenModel);
    const [visitedTabs, setVisitedTabs] = useState<CompetitionTabKey[]>([screenModel.activeTab]);
    const {
        notificationPrefs,
        loadCompetitionNotificationPrefs,
        saveCompetitionNotificationPrefs,
    } = useCompetitionNotificationPrefs({
        competitionId: screenModel.safeCompetitionId,
        isCompetitionFollowed: screenModel.isCompetitionFollowed,
        closeModal: screenModel.closeNotificationModal,
    });

    useEffect(() => {
        setVisitedTabs(current => (
            current.includes(screenModel.activeTab)
                ? current.filter(tab => screenModel.tabs.includes(tab))
                : [...current.filter(tab => screenModel.tabs.includes(tab)), screenModel.activeTab]
        ));
    }, [screenModel.activeTab, screenModel.tabs]);

    const openCompetitionNotificationModal = useCallback(() => {
        screenModel.openNotificationModal();
        void loadCompetitionNotificationPrefs();
    }, [loadCompetitionNotificationPrefs, screenModel]);

    const {
        activeTab,
        numericCompetitionId,
        actualSeason,
        handlePressTeam,
        handlePressMatch,
        handlePressPlayer,
    } = screenModel;
    const offlineUi = useOfflineUiState({
        hasData: screenModel.hasCachedData,
        isLoading: screenModel.isCompetitionQueryLoading && !screenModel.hasCachedData,
        lastUpdatedAt: screenModel.lastUpdatedAt,
    });
    const offlineLastUpdatedAt = offlineUi.lastUpdatedAt
        ? new Date(offlineUi.lastUpdatedAt).toISOString()
        : null;

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

    if (
        screenModel.seasonsLoading &&
        !screenModel.hasCachedData &&
        screenModel.availableSeasons.length === 0
    ) {
        return (
            <View style={styles.container}>
                <CompetitionHeader
                    competition={screenModel.competition}
                    currentSeason={screenModel.defaultSeason}
                    availableSeasons={[]}
                    isFollowed={screenModel.isCompetitionFollowed}
                    onBack={screenModel.handleBack}
                    onToggleFollow={screenModel.handleToggleFollow}
                    onOpenNotificationModal={openCompetitionNotificationModal}
                    onOpenSeasonPicker={screenModel.openSeasonPicker}
                />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (screenModel.isCompetitionStructureLoading && !screenModel.hasCachedData) {
        return (
            <View style={styles.container}>
                <CompetitionHeader
                    competition={screenModel.competition}
                    currentSeason={screenModel.actualSeason}
                    availableSeasons={screenModel.availableSeasons}
                    isFollowed={screenModel.isCompetitionFollowed}
                    onBack={screenModel.handleBack}
                    onToggleFollow={screenModel.handleToggleFollow}
                    onOpenNotificationModal={openCompetitionNotificationModal}
                    onOpenSeasonPicker={screenModel.openSeasonPicker}
                />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
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
                onOpenNotificationModal={openCompetitionNotificationModal}
                onOpenSeasonPicker={screenModel.openSeasonPicker}
            />

            <CompetitionTabs
                activeTab={screenModel.activeTab}
                tabs={screenModel.tabs}
                onTabChange={screenModel.setActiveTab}
                labelOverrides={{ standings: screenModel.standingsTabLabelKey }}
            />
            {offlineUi.showOfflineBanner ? (
                <View style={styles.freshnessWrap}>
                    <ScreenStateView state='offline' lastUpdatedAt={offlineLastUpdatedAt} />
                </View>
            ) : null}
            {!offlineUi.showOfflineBanner ? (
                <View style={styles.freshnessWrap}>
                    <FreshnessIndicator
                        lastUpdatedAt={screenModel.lastUpdatedAt}
                        visible={Boolean(screenModel.lastUpdatedAt)}
                    />
                </View>
            ) : null}

            <View style={styles.content}>
                {visitedTabs.map(tab => (
                    <View
                        key={tab}
                        style={[styles.tabPanel, tab === activeTab ? null : styles.hiddenTabPanel]}
                    >
                        {renderCompetitionDetailsTab({
                            activeTab: tab,
                            competitionId: numericCompetitionId,
                            season: actualSeason,
                            allowBracket: screenModel.isCupCompetitionType,
                            onPressTeam: handlePressTeam,
                            onPressMatch: handlePressMatch,
                            onPressPlayer: handlePressPlayer,
                        })}
                    </View>
                ))}
            </View>

            <CompetitionSeasonPickerModal
                isVisible={screenModel.isSeasonPickerOpen}
                seasons={screenModel.availableSeasons}
                selectedSeason={screenModel.actualSeason}
                onClose={screenModel.closeSeasonPicker}
                onSelectSeason={screenModel.selectSeason}
            />

            <CompetitionNotificationModal
                visible={screenModel.isNotificationModalOpen}
                initialPrefs={notificationPrefs}
                onClose={screenModel.closeNotificationModal}
                onSave={saveCompetitionNotificationPrefs}
            />
        </View>
    );
}
