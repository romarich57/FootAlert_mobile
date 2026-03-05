import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, Pressable } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import type { Fixture } from '../types/competitions.types';
import { useCompetitionFixtures } from '../hooks/useCompetitionFixtures';
import { MatchesFilterBottomSheet, MatchesFilterState } from './MatchesFilterBottomSheet';
import { createCompetitionMatchesTabStyles } from './CompetitionMatchesTab.styles';
import { formatMatchRound } from '@ui/shared/utils/formatMatchRound';

type CompetitionMatchesTabProps = {
    competitionId: number;
    season: number;
    onPressMatch?: (matchId: string) => void;
    onPressTeam?: (teamId: string) => void;
};

type ListItem =
    | { type: 'header'; key: string; title: string }
    | { type: 'fixture'; key: string; data: Fixture };

function displayValue(value: string | number | null | undefined): string | number {
    return value !== null && value !== undefined && value !== '' ? value : '';
}

function formatMatchTime(dateString: string, locale: string) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function formatMatchDate(dateString: string, locale: string) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '';
    }
}

export function CompetitionMatchesTab({
    competitionId,
    season,
    onPressMatch,
    onPressTeam,
}: CompetitionMatchesTabProps) {
    const { colors } = useAppTheme();
    const { t, i18n } = useTranslation();
    const styles = useMemo(() => createCompetitionMatchesTabStyles(colors), [colors]);
    const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';

    const {
        data,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useCompetitionFixtures(competitionId, season);

    const fixtures = useMemo(
        () => data?.pages.flatMap(page => page.items) ?? [],
        [data],
    );

    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterState, setFilterState] = useState<MatchesFilterState>({
        sortBy: 'round_asc', // Default sort
        teamId: null,
    });

    const flashListRef = useRef<FlashListRef<ListItem>>(null);
    const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

    const uniqueTeams = useMemo(() => {
        if (!fixtures) return [];
        const map = new Map<number, { id: number, name: string }>();
        fixtures.forEach(f => {
            if (f.homeTeam.id && f.homeTeam.name && !map.has(f.homeTeam.id)) {
                map.set(f.homeTeam.id, { id: f.homeTeam.id, name: f.homeTeam.name });
            }
            if (f.awayTeam.id && f.awayTeam.name && !map.has(f.awayTeam.id)) {
                map.set(f.awayTeam.id, { id: f.awayTeam.id, name: f.awayTeam.name });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [fixtures]);

    const processedFixtures = useMemo(() => {
        if (!fixtures) return [];

        // Filter
        let result = filterState.teamId === null
            ? [...fixtures]
            : fixtures.filter(f => f.homeTeam.id === filterState.teamId || f.awayTeam.id === filterState.teamId);

        // Sort — pre-compute timestamps once (Schwartzian transform)
        const getRoundNum = (roundStr: string) => {
            const match = roundStr.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        };
        const withMeta = result.map(f => ({
            f,
            ts: new Date(f.date).getTime(),
            round: getRoundNum(f.round),
        }));
        withMeta.sort((a, b) => {
            if (filterState.sortBy === 'date_asc' || filterState.sortBy === 'date_desc') {
                return filterState.sortBy === 'date_asc' ? a.ts - b.ts : b.ts - a.ts;
            }
            if (a.round !== b.round) {
                return filterState.sortBy === 'round_asc' ? a.round - b.round : b.round - a.round;
            }
            return a.ts - b.ts;
        });
        result = withMeta.map(({ f }) => f);

        return result;
    }, [fixtures, filterState]);

    const listData = useMemo(() => {
        if (!processedFixtures.length) return [];
        const items: ListItem[] = [];
        let currentRound = '';
        const roundOccurrences = new Map<string, number>();

        processedFixtures.forEach(fixture => {
            const roundNameRaw = typeof fixture.round === 'string' ? fixture.round.trim() : '';
            const roundName = formatMatchRound(roundNameRaw, t);
            if (roundName && roundName !== currentRound) {
                const occurrence = (roundOccurrences.get(roundName) ?? 0) + 1;
                roundOccurrences.set(roundName, occurrence);
                items.push({
                    type: 'header',
                    key: `round-${roundName}-${occurrence}-${fixture.id}`, // made key more unique
                    title: roundName,
                });
                currentRound = roundName;
            }
            items.push({
                type: 'fixture',
                key: `fixture-${fixture.id}`,
                data: fixture,
            });
        });
        return items;
    }, [processedFixtures, t]);

    // Auto-scroll to current/next match
    useEffect(() => {
        let autoScrollTimeout: ReturnType<typeof setTimeout> | null = null;

        if (!hasAutoScrolled && listData.length > 0 && flashListRef.current) {
            const firstUnfinishedIndex = listData.findIndex((item) => {
                if (item.type !== 'fixture') return false;
                const status = item.data.status;
                return !['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD'].includes(status);
            });

            if (firstUnfinishedIndex !== -1) {
                // Delay scroll slightly to allow layout
                autoScrollTimeout = setTimeout(() => {
                    flashListRef.current?.scrollToIndex({ index: firstUnfinishedIndex, animated: true, viewPosition: 0 });
                    setHasAutoScrolled(true);
                }, 500);
            } else {
                setHasAutoScrolled(true); // if all are finished, nothing to scroll to
            }
        }

        return () => {
            if (autoScrollTimeout !== null) {
                clearTimeout(autoScrollTimeout);
            }
        };
    }, [listData, hasAutoScrolled]);

    const handleEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const renderFooter = useCallback(() => {
        if (!isFetchingNextPage) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }, [isFetchingNextPage, colors.primary, styles]);

    const keyExtractor = useCallback((item: ListItem) => item.key, []);

    const renderItem = useCallback(({ item }: { item: ListItem }) => {
        if (item.type === 'header') {
            return (
                <View style={styles.roundHeader}>
                    <Text style={styles.roundHeaderText}>{item.title}</Text>
                </View>
            );
        }

        const f = item.data;
        const isLive = ['1H', '2H', 'ET', 'P', 'HT'].includes(f.status);
        const isFinished = ['FT', 'AET', 'PEN'].includes(f.status);

        let statusText = f.status;
        if (isLive) statusText = `${f.elapsed}'`;
        else if (isFinished) statusText = t('competitionDetails.matches.finished');
        else if (f.status === 'NS') statusText = formatMatchTime(f.date, locale);

        return (
            <View style={styles.fixtureCard}>
                <View style={styles.fixtureTopRow}>
                    <Text style={[styles.matchStatus, isLive && styles.matchStatusLive]}>
                        {statusText}
                    </Text>
                    <Text style={styles.matchDate}>{formatMatchDate(f.date, locale)}</Text>
                </View>

                <View style={styles.teamsContainer}>
                    {onPressTeam ? (
                        <AppPressable
                            style={styles.teamBlock}
                            onPress={() => onPressTeam(String(f.homeTeam.id))}
                            accessibilityRole="button"
                            accessibilityLabel={`${t('competitionDetails.matches.match')} ${displayValue(f.homeTeam.name)}`}
                        >
                            <Image source={{ uri: f.homeTeam.logo ?? undefined }} style={styles.teamLogo} resizeMode="contain" />
                            <Text style={styles.teamName} numberOfLines={1}>{displayValue(f.homeTeam.name)}</Text>
                        </AppPressable>
                    ) : (
                        <View style={styles.teamBlock}>
                            <Image source={{ uri: f.homeTeam.logo ?? undefined }} style={styles.teamLogo} resizeMode="contain" />
                            <Text style={styles.teamName} numberOfLines={1}>{displayValue(f.homeTeam.name)}</Text>
                        </View>
                    )}

                    {onPressMatch ? (
                        <AppPressable
                            style={styles.scoreBlock}
                            onPress={() => onPressMatch(String(f.id))}
                            accessibilityRole="button"
                            accessibilityLabel={t('competitionDetails.matches.match')}
                        >
                            {isFinished || isLive ? (
                                <Text style={styles.scoreText}>
                                    {displayValue(f.goalsHome)} - {displayValue(f.goalsAway)}
                                </Text>
                            ) : (
                                <Text style={styles.scoreText} />
                            )}
                        </AppPressable>
                    ) : (
                        <View style={styles.scoreBlock}>
                            {isFinished || isLive ? (
                                <Text style={styles.scoreText}>
                                    {displayValue(f.goalsHome)} - {displayValue(f.goalsAway)}
                                </Text>
                            ) : (
                                <Text style={styles.scoreText} />
                            )}
                        </View>
                    )}

                    {onPressTeam ? (
                        <AppPressable
                            style={[styles.teamBlock, styles.teamBlockAway]}
                            onPress={() => onPressTeam(String(f.awayTeam.id))}
                            accessibilityRole="button"
                            accessibilityLabel={`${t('competitionDetails.matches.match')} ${displayValue(f.awayTeam.name)}`}
                        >
                            <Text style={[styles.teamName, styles.teamNameAway]} numberOfLines={1}>{displayValue(f.awayTeam.name)}</Text>
                            <Image source={{ uri: f.awayTeam.logo ?? undefined }} style={styles.teamLogo} resizeMode="contain" />
                        </AppPressable>
                    ) : (
                        <View style={[styles.teamBlock, styles.teamBlockAway]}>
                            <Text style={[styles.teamName, styles.teamNameAway]} numberOfLines={1}>{displayValue(f.awayTeam.name)}</Text>
                            <Image source={{ uri: f.awayTeam.logo ?? undefined }} style={styles.teamLogo} resizeMode="contain" />
                        </View>
                    )}
                </View>
            </View>
        );
    }, [locale, onPressMatch, onPressTeam, styles, t]);

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error || listData.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('competitionDetails.matches.unavailable')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>{t('competitionDetails.matches.allMatches')}</Text>
                <Pressable style={styles.headerActions} onPress={() => setFilterModalVisible(true)}>
                    <Text style={styles.headerActionText}>{t('competitionDetails.matches.filtersAndSort')}</Text>
                </Pressable>
            </View>

            <FlashList
                ref={flashListRef}
                data={listData}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemType={(item) => item.type}
                estimatedItemSize={70}
                showsVerticalScrollIndicator={false}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.3}
                ListFooterComponent={renderFooter}
            />

            <MatchesFilterBottomSheet
                visible={filterModalVisible}
                initialState={filterState}
                teams={uniqueTeams}
                onApply={setFilterState}
                onClose={() => setFilterModalVisible(false)}
            />
        </View>
    );
}
