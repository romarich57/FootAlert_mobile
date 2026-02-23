import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionTransfers } from '../hooks/useCompetitionTransfers';
import { TransferCard } from './TransferCard';
import type { Transfer } from '../types/competitions.types';

type CompetitionTransfersTabProps = {
    competitionId: number;
    season: number;
};

export function CompetitionTransfersTab({ competitionId, season }: CompetitionTransfersTabProps) {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { data: transfers, isLoading, isError } = useCompetitionTransfers(competitionId, season);

    const renderItem = ({ item }: { item: Transfer }) => {
        return <TransferCard transfer={item} />;
    };

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('competitionDetails.states.loading')}</Text>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('competitionDetails.states.loadError')}</Text>
            </View>
        );
    }

    if (!transfers || transfers.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('competitionDetails.transfers.unavailable')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Tous les transferts</Text>
                <View style={styles.headerActions}>
                    <Text style={styles.headerActionText}>Filtres ▾</Text>
                    <Text style={styles.headerActionText}>Trier ▾</Text>
                </View>
            </View>

            <FlashList
                data={transfers}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.playerId}-${item.date}-${index}`}
                // @ts-ignore - TS types are currently flawed for estimatedItemSize in FlashList in this environment
                estimatedItemSize={150}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        centerContainer: {
            flex: 1,
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
        },
        emptyText: {
            color: colors.textMuted,
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 24,
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        headerTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
        },
        headerActions: {
            flexDirection: 'row',
            gap: 16,
        },
        headerActionText: {
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: '500',
        },
        listContent: {
            paddingHorizontal: 16,
            paddingBottom: 24,
            paddingTop: 8,
        },
    });
}
