import { useMemo, useCallback, useState } from 'react';
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
import { CompetitionTotwTab } from '../components/CompetitionTotwTab';

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

    const renderTabContent = useCallback(() => {
        switch (screenModel.activeTab) {
            case 'standings':
                return (
                    <CompetitionStandingsTab
                        competitionId={screenModel.numericCompetitionId}
                        season={screenModel.actualSeason}
                        onPressTeam={screenModel.handlePressTeam}
                    />
                );
            case 'matches':
                return (
                    <CompetitionMatchesTab
                        competitionId={screenModel.numericCompetitionId}
                        season={screenModel.actualSeason}
                        onPressMatch={screenModel.handlePressMatch}
                        onPressTeam={screenModel.handlePressTeam}
                    />
                );
            case 'playerStats':
                return (
                    <CompetitionPlayerStatsTab
                        competitionId={screenModel.numericCompetitionId}
                        season={screenModel.actualSeason}
                        onPressPlayer={screenModel.handlePressPlayer}
                        onPressTeam={screenModel.handlePressTeam}
                    />
                );
            case 'teamStats':
                return (
                    <CompetitionTeamStatsTab
                        competitionId={screenModel.numericCompetitionId}
                        season={screenModel.actualSeason}
                        onPressTeam={screenModel.handlePressTeam}
                    />
                );
            case 'transfers':
                return (
                    <CompetitionTransfersTab
                        competitionId={screenModel.numericCompetitionId}
                        season={screenModel.actualSeason}
                        onPressPlayer={screenModel.handlePressPlayer}
                        onPressTeam={screenModel.handlePressTeam}
                    />
                );
            case 'totw':
                return screenModel.totwData ? (
                    <CompetitionTotwTab
                        totw={screenModel.totwData}
                        onPressPlayer={screenModel.handlePressPlayer}
                        onPressTeam={screenModel.handlePressTeam}
                    />
                ) : null;
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
                    onOpenNotificationModal={openCompetitionNotificationModal}
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
                onOpenNotificationModal={openCompetitionNotificationModal}
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

            <CompetitionNotificationModal
                visible={screenModel.isNotificationModalOpen}
                initialPrefs={notificationPrefs}
                onClose={screenModel.closeNotificationModal}
                onSave={handleSaveCompetitionNotificationPrefs}
            />
        </View>
    );
}
