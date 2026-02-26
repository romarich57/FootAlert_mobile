import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
    DEFAULT_HIT_SLOP,
    MIN_TOUCH_TARGET,
    type ThemeColors,
} from '@ui/shared/theme/theme';
import { useCompetitionTransfers } from '../hooks/useCompetitionTransfers';
import { TransferCard } from './TransferCard';
import type { Transfer } from '../types/competitions.types';

type CompetitionTransfersTabProps = {
    competitionId: number;
    season: number;
};

type TransfersFilter = 'all' | 'arrivals' | 'departures';
type TransfersSort = 'latest' | 'oldest';

export function CompetitionTransfersTab({ competitionId, season }: CompetitionTransfersTabProps) {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [activeFilter, setActiveFilter] = useState<TransfersFilter>('all');
    const [activeSort, setActiveSort] = useState<TransfersSort>('latest');

    const { data: transfers, isLoading, isError, refetch } = useCompetitionTransfers(competitionId, season);

    const filteredTransfers = useMemo(() => {
        const baseTransfers = transfers ?? [];
        if (activeFilter === 'arrivals') {
            return baseTransfers.filter(item => item.isArrival);
        }

        if (activeFilter === 'departures') {
            return baseTransfers.filter(item => item.isDeparture);
        }

        return baseTransfers;
    }, [activeFilter, transfers]);

    const displayedTransfers = useMemo(() => {
        const sorted = [...filteredTransfers];
        sorted.sort((first, second) =>
            activeSort === 'latest'
                ? second.timestamp - first.timestamp
                : first.timestamp - second.timestamp,
        );
        return sorted;
    }, [activeSort, filteredTransfers]);

    const renderItem = useCallback(({ item }: { item: Transfer }) => {
        return <TransferCard transfer={item} />;
    }, []);

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
                <Pressable
                    onPress={() => {
                        refetch();
                    }}
                    hitSlop={DEFAULT_HIT_SLOP}
                >
                    <Text style={styles.retryText}>{t('actions.retry')}</Text>
                </Pressable>
            </View>
        );
    }

    if (!transfers || transfers.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('competitionDetails.transfers.states.empty')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.toolbarRow}>
                <View style={styles.filtersRow}>
                    {(['all', 'arrivals', 'departures'] as const).map(filterKey => {
                        const isActive = activeFilter === filterKey;
                        return (
                            <Pressable
                                key={filterKey}
                                style={[styles.filterPill, isActive ? styles.filterPillActive : null]}
                                onPress={() => setActiveFilter(filterKey)}
                                hitSlop={DEFAULT_HIT_SLOP}
                            >
                                <Text style={[styles.filterText, isActive ? styles.filterTextActive : null]}>
                                    {t(`competitionDetails.transfers.filters.${filterKey}`)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Pressable
                    style={styles.sortPill}
                    onPress={() => setActiveSort(current => (current === 'latest' ? 'oldest' : 'latest'))}
                    hitSlop={DEFAULT_HIT_SLOP}
                >
                    <Text style={styles.sortText}>
                        {t(`competitionDetails.transfers.sort.${activeSort}`)}
                    </Text>
                </Pressable>
            </View>

            <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                    {t('competitionDetails.transfers.labels.resultCount', { count: displayedTransfers.length })}
                </Text>
            </View>

            <FlashList
                data={displayedTransfers}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                // @ts-ignore - TS types are currently flawed for estimatedItemSize in FlashList in this environment
                estimatedItemSize={150}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>{t('competitionDetails.transfers.states.emptyFiltered')}</Text>
                }
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
        retryText: {
            color: colors.primary,
            fontSize: 15,
            fontWeight: '700',
            marginTop: 10,
        },
        toolbarRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 12,
        },
        filtersRow: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.chipBorder,
            backgroundColor: colors.chipBackground,
            padding: 4,
            gap: 4,
            flex: 1,
        },
        filterPill: {
            minHeight: MIN_TOUCH_TARGET,
            borderRadius: 999,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 12,
        },
        filterPillActive: {
            backgroundColor: 'rgba(21,248,106,0.2)',
            borderWidth: 1,
            borderColor: colors.primary,
        },
        filterText: {
            color: colors.textMuted,
            fontSize: 13,
            fontWeight: '700',
        },
        filterTextActive: {
            color: colors.primary,
        },
        sortPill: {
            minHeight: MIN_TOUCH_TARGET,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.chipBorder,
            backgroundColor: colors.chipBackground,
            paddingHorizontal: 12,
            justifyContent: 'center',
            alignItems: 'center',
        },
        sortText: {
            color: colors.text,
            fontSize: 12,
            fontWeight: '700',
        },
        metaRow: {
            paddingHorizontal: 16,
            paddingBottom: 8,
        },
        metaText: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
        },
        listContent: {
            paddingHorizontal: 16,
            paddingBottom: 24,
            paddingTop: 4,
        },
    });
}
