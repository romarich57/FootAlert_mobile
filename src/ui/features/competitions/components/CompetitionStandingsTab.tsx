import { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { StandingRow } from '../types/competitions.types';
import { useCompetitionStandings } from '../hooks/useCompetitionStandings';
import { useCompetitionBracket } from '../hooks/useCompetitionBracket';
import { KnockoutBracketView } from './KnockoutBracketView';

type CompetitionStandingsTabProps = {
    competitionId: number;
    season: number;
    onPressTeam?: (teamId: string) => void;
};

type ListItem =
    | { type: 'header'; key: string; title: string }
    | { type: 'row'; key: string; data: StandingRow };

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
        groupHeader: {
            backgroundColor: colors.surfaceElevated,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginTop: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.surface,
        },
        groupHeaderText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '700',
            textTransform: 'uppercase',
        },
        tableHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.surfaceElevated,
        },
        colRank: { width: 30, alignItems: 'center' },
        colTeam: { flex: 1, marginLeft: 12 },
        colStat: { width: 30, alignItems: 'center' },
        colForm: { width: 80, alignItems: 'center' },
        headerText: {
            color: colors.textMuted,
            fontSize: 11,
            fontWeight: '600',
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.surface,
            backgroundColor: colors.surface,
        },
        rankText: {
            color: colors.text,
            fontSize: 13,
            fontWeight: '700',
        },
        teamInfo: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        teamLogo: {
            width: 24,
            height: 24,
            marginRight: 10,
        },
        teamName: {
            flex: 1,
            color: colors.text,
            fontSize: 14,
            fontWeight: '600',
        },
        statText: {
            color: colors.text,
            fontSize: 13,
        },
        statTextBold: {
            color: colors.primary,
            fontSize: 13,
            fontWeight: '700',
        },
        formRow: {
            flexDirection: 'row',
            gap: 4,
            justifyContent: 'center',
        },
        formBadge: {
            width: 14,
            height: 14,
            borderRadius: 2,
            alignItems: 'center',
            justifyContent: 'center',
        },
        formBadgeText: {
            color: '#FFF',
            fontSize: 9,
            fontWeight: '700',
        },
        formW: { backgroundColor: '#4CAF50' },
        formD: { backgroundColor: '#9E9E9E' },
        formL: { backgroundColor: '#F44336' },
        descriptionIndicator: {
            position: 'absolute',
            left: 0,
            top: 2,
            bottom: 2,
            width: 3,
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
        },
        descChampion: { backgroundColor: colors.primary },
        descPromotion: { backgroundColor: '#2196F3' },
        descRelegation: { backgroundColor: '#F44336' },
    });
}

function displayValue(value: string | number | null | undefined): string | number {
    return value !== null && value !== undefined && value !== '' ? value : '';
}

function TableHeaderRow({ styles, t }: { styles: ReturnType<typeof createStyles>; t: (key: string) => string }) {
    return (
        <View style={styles.tableHeaderRow}>
            <View style={styles.colRank}><Text style={styles.headerText}>{t('competitionDetails.standings.table.rank')}</Text></View>
            <View style={styles.colTeam}><Text style={styles.headerText}>{t('competitionDetails.standings.table.team')}</Text></View>
            <View style={styles.colStat}><Text style={styles.headerText}>{t('competitionDetails.standings.table.played')}</Text></View>
            <View style={styles.colStat}><Text style={styles.headerText}>{t('competitionDetails.standings.table.goalDiff')}</Text></View>
            <View style={styles.colStat}><Text style={styles.headerText}>{t('competitionDetails.standings.table.points')}</Text></View>
            <View style={styles.colForm}><Text style={styles.headerText}>{t('competitionDetails.standings.table.form')}</Text></View>
        </View>
    );
}

function getFormStyle(char: string, styles: ReturnType<typeof createStyles>) {
    if (char === 'W') return styles.formW;
    if (char === 'D') return styles.formD;
    if (char === 'L') return styles.formL;
    return styles.formD;
}

function getDescriptionColor(desc: string | null, styles: ReturnType<typeof createStyles>) {
    if (!desc) return null;
    const lower = desc
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (lower.includes('champion') || lower.includes('promotion')) return styles.descPromotion;
    if (lower.includes('relegation')) return styles.descRelegation;
    if (lower.includes('cup') || lower.includes('league') || lower.includes('coupe') || lower.includes('ligue')) {
        return styles.descChampion;
    }
    return null;
}

function createFormBadges(form: string, teamId: number) {
    const chars = form.trim().length > 0 ? form.split('').slice(0, 5) : [];
    const seen = new Map<string, number>();
    return chars.map(char => {
        const occurrence = (seen.get(char) ?? 0) + 1;
        seen.set(char, occurrence);
        return { char, key: `form-${teamId}-${char}-${occurrence}` };
    });
}

export function CompetitionStandingsTab({ competitionId, season, onPressTeam }: CompetitionStandingsTabProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { data: groups, isLoading, error } = useCompetitionStandings(competitionId, season);
    const { data: bracketData } = useCompetitionBracket(competitionId, season);
    const defaultGroupTitle = t('competitionDetails.standings.defaultGroup');

    const kind = bracketData?.competitionKind;
    const isCupOnly = kind === 'cup';
    const showBracket = !!(bracketData?.bracket?.length) && (isCupOnly || kind === 'mixed');
    const showStandings = !isCupOnly;

    const listData = useMemo(() => {
        if (!groups) return [];
        const items: ListItem[] = [];
        const headerOccurrences = new Map<string, number>();

        groups.forEach(group => {
            const groupName = group.groupName?.trim() || defaultGroupTitle;
            if (groups.length > 1 || groupName !== defaultGroupTitle) {
                const occurrence = (headerOccurrences.get(groupName) ?? 0) + 1;
                headerOccurrences.set(groupName, occurrence);
                items.push({
                    type: 'header',
                    key: `header-${groupName}-${occurrence}`,
                    title: groupName,
                });
            }
            group.rows.forEach(row => {
                items.push({
                    type: 'row',
                    key: `standing-${row.teamId}-${row.rank}`,
                    data: row,
                });
            });
        });
        return items;
    }, [defaultGroupTitle, groups]);

    const keyExtractor = useCallback((item: ListItem) => item.key, []);

    const renderItem = useCallback(({ item }: { item: ListItem }) => {
        if (item.type === 'header') {
            return (
                <View style={styles.groupHeader}>
                    <Text style={styles.groupHeaderText}>{item.title}</Text>
                    <TableHeaderRow styles={styles} t={t} />
                </View>
            );
        }

        const data = item.data;
        const formBadges = createFormBadges(data.form, data.teamId);
        const descStyle = getDescriptionColor(data.description, styles);

        return (
            <View style={styles.row}>
                {descStyle && <View style={[styles.descriptionIndicator, descStyle]} />}
                <View style={styles.colRank}>
                    <Text style={styles.rankText}>{data.rank}</Text>
                </View>
                {onPressTeam ? (
                    <AppPressable
                        style={[styles.colTeam, styles.teamInfo]}
                        onPress={() => onPressTeam(String(data.teamId))}
                        accessibilityRole="button"
                        accessibilityLabel={String(displayValue(data.teamName))}
                    >
                        <Image source={{ uri: data.teamLogo ?? undefined }} style={styles.teamLogo} resizeMode="contain" />
                        <Text style={styles.teamName} numberOfLines={1}>{displayValue(data.teamName)}</Text>
                    </AppPressable>
                ) : (
                    <View style={[styles.colTeam, styles.teamInfo]}>
                        <Image source={{ uri: data.teamLogo ?? undefined }} style={styles.teamLogo} resizeMode="contain" />
                        <Text style={styles.teamName} numberOfLines={1}>{displayValue(data.teamName)}</Text>
                    </View>
                )}
                <View style={styles.colStat}>
                    <Text style={styles.statText}>{displayValue(data.played)}</Text>
                </View>
                <View style={styles.colStat}>
                    <Text style={styles.statText}>{displayValue(data.goalsDiff)}</Text>
                </View>
                <View style={styles.colStat}>
                    <Text style={styles.statTextBold}>{displayValue(data.points)}</Text>
                </View>
                <View style={styles.colForm}>
                    {formBadges.length > 0 ? (
                        <View style={styles.formRow}>
                            {formBadges.map(badge => (
                                <View key={badge.key} style={[styles.formBadge, getFormStyle(badge.char, styles)]}>
                                    <Text style={styles.formBadgeText}>{badge.char}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.statText}>?</Text>
                    )}
                </View>
            </View>
        );
    }, [onPressTeam, styles, t]);

    if (isCupOnly) {
        return showBracket ? (
            <View style={styles.container}>
                <KnockoutBracketView rounds={bracketData!.bracket!} />
            </View>
        ) : (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('competitionDetails.standings.unavailable')}</Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if ((error || listData.length === 0) && !showBracket) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('competitionDetails.standings.unavailable')}</Text>
            </View>
        );
    }

    const needsTopHeader = listData.length > 0 && listData[0]?.type === 'row';

    return (
        <View style={styles.container}>
            {showStandings && listData.length > 0 && (
                <>
                    {needsTopHeader && <TableHeaderRow styles={styles} t={t} />}
                    <FlashList
                        data={listData}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        getItemType={(item) => item.type}
                        estimatedItemSize={52}
                    />
                </>
            )}
            {showBracket && (
                <KnockoutBracketView
                    rounds={bracketData!.bracket!}
                    sectionTitle={t('competitionDetails.bracket.title')}
                />
            )}
        </View>
    );
}
