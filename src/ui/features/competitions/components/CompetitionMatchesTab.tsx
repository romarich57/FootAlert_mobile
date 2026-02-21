import { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { Fixture } from '../types/competitions.types';
import { useCompetitionFixtures } from '../hooks/useCompetitionFixtures';

type CompetitionMatchesTabProps = {
    competitionId: number;
    season: number;
};

type ListItem =
    | { type: 'header'; title: string }
    | { type: 'fixture'; data: Fixture };

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
    return value !== null && value !== undefined && value !== '' ? value : '?';
}

function formatMatchTime(dateString: string) {
    if (!dateString || dateString === '?') return '?';
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '?';
    }
}

function formatMatchDate(dateString: string) {
    if (!dateString || dateString === '?') return '?';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '?';
    }
}

export function CompetitionMatchesTab({ competitionId, season }: CompetitionMatchesTabProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { data: fixtures, isLoading, error } = useCompetitionFixtures(competitionId, season);

    const listData = useMemo(() => {
        if (!fixtures) return [];
        const items: ListItem[] = [];
        let currentRound = '';

        fixtures.forEach(fixture => {
            const roundName = displayValue(fixture.round).toString();
            if (roundName !== currentRound) {
                items.push({ type: 'header', title: roundName });
                currentRound = roundName;
            }
            items.push({ type: 'fixture', data: fixture });
        });
        return items;
    }, [fixtures]);

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
        else if (isFinished) statusText = 'Terminé';
        else if (f.status === 'NS') statusText = formatMatchTime(f.date);

        return (
            <View style={styles.fixtureCard}>
                <View style={styles.fixtureTopRow}>
                    <Text style={[styles.matchStatus, isLive && styles.matchStatusLive]}>
                        {statusText}
                    </Text>
                    <Text style={styles.matchDate}>{formatMatchDate(f.date)}</Text>
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
                            <Text style={styles.scoreText}>- : -</Text>
                        )}
                    </View>

                    <View style={[styles.teamBlock, styles.teamBlockAway]}>
                        <Text style={[styles.teamName, styles.teamNameAway]} numberOfLines={1}>{displayValue(f.awayTeam.name)}</Text>
                        <Image source={{ uri: f.awayTeam.logo ?? undefined }} style={styles.teamLogo} resizeMode="contain" />
                    </View>
                </View>
            </View>
        );
    }, [styles]);

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
                <Text style={styles.emptyText}>Matchs non disponibles (?)</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlashList
                data={listData}
                renderItem={renderItem}
                getItemType={(item) => item.type}
            />
        </View>
    );
}
