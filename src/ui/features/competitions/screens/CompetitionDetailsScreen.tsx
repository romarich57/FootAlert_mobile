import { useMemo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import {
    getNotificationSubscriptions,
    upsertNotificationSubscriptions,
} from '@data/endpoints/notificationsApi';
import {
    buildNotificationSubscriptions,
    hydrateNotificationToggles,
    type AlertTypeMap,
} from '@data/notifications/subscriptionMappings';
import { useCompetitionDetailsScreenModel } from '../hooks/useCompetitionDetailsScreenModel';

import { CompetitionHeader } from '../components/CompetitionHeader';
import { CompetitionTabs } from '../components/CompetitionTabs';
import { CompetitionSeasonPickerModal } from '../components/CompetitionSeasonPickerModal';
import {
    CompetitionNotificationModal,
    type CompetitionNotificationPrefs,
} from '../components/CompetitionNotificationModal';

import { CompetitionStandingsTab } from '../components/CompetitionStandingsTab';
import { CompetitionMatchesTab } from '../components/CompetitionMatchesTab';
import { CompetitionPlayerStatsTab } from '../components/CompetitionPlayerStatsTab';
import { CompetitionTeamStatsTab } from '../components/CompetitionTeamStatsTab';
import { CompetitionTransfersTab } from '../components/CompetitionTransfersTab';
import { CompetitionTotwPanel } from '../components/CompetitionTotwPanel';
import type { CompetitionTabKey } from '../components/CompetitionTabs';

type CompetitionAlertPrefKey = Exclude<keyof CompetitionNotificationPrefs, 'enabled'>;

const COMPETITION_NOTIFICATION_DEFAULTS: CompetitionNotificationPrefs = {
    enabled: false,
    matchStart: true,
    halftime: false,
    matchEnd: true,
    goals: true,
    redCards: true,
    missedPenalty: false,
    transfers: true,
    lineups: false,
    matchReminder: false,
};

const COMPETITION_NOTIFICATION_TOGGLE_DEFAULTS: Omit<CompetitionNotificationPrefs, 'enabled'> = {
    matchStart: COMPETITION_NOTIFICATION_DEFAULTS.matchStart,
    halftime: COMPETITION_NOTIFICATION_DEFAULTS.halftime,
    matchEnd: COMPETITION_NOTIFICATION_DEFAULTS.matchEnd,
    goals: COMPETITION_NOTIFICATION_DEFAULTS.goals,
    redCards: COMPETITION_NOTIFICATION_DEFAULTS.redCards,
    missedPenalty: COMPETITION_NOTIFICATION_DEFAULTS.missedPenalty,
    transfers: COMPETITION_NOTIFICATION_DEFAULTS.transfers,
    lineups: COMPETITION_NOTIFICATION_DEFAULTS.lineups,
    matchReminder: COMPETITION_NOTIFICATION_DEFAULTS.matchReminder,
};

const COMPETITION_ALERT_MAP: AlertTypeMap<CompetitionAlertPrefKey> = {
    matchStart: 'match_start',
    halftime: 'halftime',
    matchEnd: 'match_end',
    goals: 'goal',
    redCards: 'red_card',
    missedPenalty: 'missed_penalty',
    transfers: 'transfer',
    lineups: 'lineup',
    matchReminder: 'match_reminder',
};

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
    const [notificationPrefs, setNotificationPrefs] = useState<CompetitionNotificationPrefs>({
        ...COMPETITION_NOTIFICATION_DEFAULTS,
        enabled: screenModel.isCompetitionFollowed,
    });
    const [visitedTabs, setVisitedTabs] = useState<CompetitionTabKey[]>([screenModel.activeTab]);

    useEffect(() => {
        setVisitedTabs(current => (
            current.includes(screenModel.activeTab)
                ? current.filter(tab => screenModel.tabs.includes(tab))
                : [...current.filter(tab => screenModel.tabs.includes(tab)), screenModel.activeTab]
        ));
    }, [screenModel.activeTab, screenModel.tabs]);

    const loadCompetitionNotificationPrefs = useCallback(async () => {
        if (!screenModel.safeCompetitionId) {
            return;
        }

        try {
            const subscriptions = await getNotificationSubscriptions({
                scopeKind: 'competition',
                scopeId: screenModel.safeCompetitionId,
            });
            const toggles = hydrateNotificationToggles(
                COMPETITION_NOTIFICATION_TOGGLE_DEFAULTS,
                COMPETITION_ALERT_MAP,
                subscriptions,
            );
            const hasEnabledAlert = Object.values(toggles).some(Boolean);
            setNotificationPrefs({
                enabled: hasEnabledAlert || screenModel.isCompetitionFollowed,
                ...toggles,
            });
        } catch {
            setNotificationPrefs(current => ({
                ...current,
                enabled: screenModel.isCompetitionFollowed,
            }));
        }
    }, [screenModel.isCompetitionFollowed, screenModel.safeCompetitionId]);

    const openCompetitionNotificationModal = useCallback(() => {
        screenModel.openNotificationModal();
        void loadCompetitionNotificationPrefs();
    }, [loadCompetitionNotificationPrefs, screenModel]);

    const handleSaveCompetitionNotificationPrefs = useCallback((prefs: CompetitionNotificationPrefs) => {
        setNotificationPrefs(prefs);
        if (!screenModel.safeCompetitionId) {
            screenModel.closeNotificationModal();
            return;
        }

        const { enabled, ...toggles } = prefs;
        void upsertNotificationSubscriptions({
            scopeKind: 'competition',
            scopeId: screenModel.safeCompetitionId,
            subscriptions: buildNotificationSubscriptions(
                toggles,
                COMPETITION_ALERT_MAP,
                { disableAll: !enabled },
            ),
        }).finally(() => {
            screenModel.closeNotificationModal();
        });
    }, [screenModel]);

    const {
        activeTab,
        numericCompetitionId,
        actualSeason,
        handlePressTeam,
        handlePressMatch,
        handlePressPlayer,
    } = screenModel;

    const renderTabContent = useCallback((tab: CompetitionTabKey) => {
        switch (tab) {
            case 'standings':
                return (
                    <CompetitionStandingsTab
                        competitionId={numericCompetitionId}
                        season={actualSeason}
                        allowBracket={screenModel.isCupCompetitionType}
                        onPressTeam={handlePressTeam}
                    />
                );
            case 'matches':
                return (
                    <CompetitionMatchesTab
                        competitionId={numericCompetitionId}
                        season={actualSeason}
                        onPressMatch={handlePressMatch}
                        onPressTeam={handlePressTeam}
                    />
                );
            case 'playerStats':
                return (
                    <CompetitionPlayerStatsTab
                        competitionId={numericCompetitionId}
                        season={actualSeason}
                        onPressPlayer={handlePressPlayer}
                        onPressTeam={handlePressTeam}
                    />
                );
            case 'teamStats':
                return (
                    <CompetitionTeamStatsTab
                        competitionId={numericCompetitionId}
                        season={actualSeason}
                        onPressTeam={handlePressTeam}
                    />
                );
            case 'transfers':
                return (
                    <CompetitionTransfersTab
                        competitionId={numericCompetitionId}
                        season={actualSeason}
                        onPressPlayer={handlePressPlayer}
                        onPressTeam={handlePressTeam}
                    />
                );
            case 'totw':
                return (
                    <CompetitionTotwPanel
                        competitionId={numericCompetitionId}
                        season={actualSeason}
                        onPressPlayer={handlePressPlayer}
                    />
                );
            default:
                return null;
        }
    }, [numericCompetitionId, actualSeason, handlePressTeam, handlePressMatch, handlePressPlayer]);

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
                    onOpenNotificationModal={openCompetitionNotificationModal}
                    onOpenSeasonPicker={screenModel.openSeasonPicker}
                />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (screenModel.isCompetitionStructureLoading) {
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

            <View style={styles.content}>
                {visitedTabs.map(tab => (
                    <View
                        key={tab}
                        style={[styles.tabPanel, tab === activeTab ? null : styles.hiddenTabPanel]}
                    >
                        {renderTabContent(tab)}
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
                onSave={handleSaveCompetitionNotificationPrefs}
            />
        </View>
    );
}
