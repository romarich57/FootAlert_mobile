import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Pressable } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { Fixture } from '../types/competitions.types';
import { useCompetitionFixtures } from '../hooks/useCompetitionFixtures';
import { MatchesFilterBottomSheet, MatchesFilterState } from './MatchesFilterBottomSheet';

type CompetitionMatchesTabProps = {
    competitionId: number;
    season: number;
};

type ListItem =
    | { type: 'header'; key: string; title: string }
    | { type: 'fixture'; key: string; data: Fixture };

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        centerContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emptyText: {
            color: colors.textMuted,
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 24,
            marginTop: 24,
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
        roundHeader: {
            backgroundColor: colors.surfaceElevated,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginTop: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.surface,
        },
        roundHeaderText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '700',
            textTransform: 'uppercase',
        },
        fixtureCard: {
            backgroundColor: colors.surface,
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.surfaceElevated,
        },
        fixtureTopRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        matchStatus: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
        },
        matchStatusLive: {
            color: colors.primary,
        },
        matchDate: {
            color: colors.textMuted,
            fontSize: 12,
        },
        teamsContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        teamBlock: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        teamBlockAway: {
            justifyContent: 'flex-end',
            textAlign: 'right',
        },
        teamLogo: {
            width: 28,
            height: 28,
        },
        teamName: {
            color: colors.text,
            fontSize: 15,
            fontWeight: '600',
            flex: 1,
        },
        teamNameAway: {
            textAlign: 'right',
        },
        scoreBlock: {
            width: 60,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceElevated,
            paddingVertical: 6,
            borderRadius: 8,
            marginHorizontal: 12,
        },
        scoreText: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '900',
            letterSpacing: 2,
        },
    });
}

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

export function CompetitionMatchesTab({ competitionId, season }: CompetitionMatchesTabProps) {
    const { colors } = useAppTheme();
    const { t, i18n } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';

    const { data: fixtures, isLoading, error } = useCompetitionFixtures(competitionId, season);

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

        // Sort
        result.sort((a, b) => {
            if (filterState.sortBy === 'date_asc' || filterState.sortBy === 'date_desc') {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return filterState.sortBy === 'date_asc' ? dateA - dateB : dateB - dateA;
            } else {
                // round_asc or round_desc
                // Basic implementation extracting round number if possible
                const getRoundNum = (roundStr: string) => {
                    const match = roundStr.match(/\d+/);
                    return match ? parseInt(match[0], 10) : 0;
                };
                const roundA = getRoundNum(a.round);
                const roundB = getRoundNum(b.round);
                if (roundA !== roundB) {
                    return filterState.sortBy === 'round_asc' ? roundA - roundB : roundB - roundA;
                }
                // Fallback to date sorting within the same round
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateA - dateB;
            }
        });

        return result;
    }, [fixtures, filterState]);

    const listData = useMemo(() => {
        if (!processedFixtures.length) return [];
        const items: ListItem[] = [];
        let currentRound = '';
        const roundOccurrences = new Map<string, number>();

        processedFixtures.forEach(fixture => {
            const roundName = typeof fixture.round === 'string' ? fixture.round.trim() : '';
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
    }, [processedFixtures]);

    // Auto-scroll to current/next match
    useEffect(() => {
        if (!hasAutoScrolled && listData.length > 0 && flashListRef.current) {
            const firstUnfinishedIndex = listData.findIndex((item) => {
                if (item.type !== 'fixture') return false;
                const status = item.data.status;
                return !['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD'].includes(status);
            });

            if (firstUnfinishedIndex !== -1) {
                // Delay scroll slightly to allow layout
                setTimeout(() => {
                    flashListRef.current?.scrollToIndex({ index: firstUnfinishedIndex, animated: true, viewPosition: 0 });
                    setHasAutoScrolled(true);
                }, 500);
            } else {
                setHasAutoScrolled(true); // if all are finished, nothing to scroll to
            }
        }
    }, [listData, hasAutoScrolled]);

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
                    <View style={styles.teamBlock}>
                        <Image source={{ uri: f.homeTeam.logo ?? undefined }} style={styles.teamLogo} resizeMode="contain" />
                        <Text style={styles.teamName} numberOfLines={1}>{displayValue(f.homeTeam.name)}</Text>
                    </View>

                    <View style={styles.scoreBlock}>
                        {isFinished || isLive ? (
                            <Text style={styles.scoreText}>
                                {displayValue(f.goalsHome)} - {displayValue(f.goalsAway)}
                            </Text>
                        ) : (
                            <Text style={styles.scoreText} />
                        )}
                    </View>

                    <View style={[styles.teamBlock, styles.teamBlockAway]}>
                        <Text style={[styles.teamName, styles.teamNameAway]} numberOfLines={1}>{displayValue(f.awayTeam.name)}</Text>
                        <Image source={{ uri: f.awayTeam.logo ?? undefined }} style={styles.teamLogo} resizeMode="contain" />
                    </View>
                </View>
            </View>
        );
    }, [locale, styles, t]);

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
                // @ts-ignore - TS types are currently flawed for estimatedItemSize in FlashList in this environment
                estimatedItemSize={70}
                showsVerticalScrollIndicator={false}
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
