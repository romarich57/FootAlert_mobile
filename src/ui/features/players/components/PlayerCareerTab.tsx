import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerCareerSeason, PlayerCareerTeam } from '@ui/features/players/types/players.types';
import type { FollowEntityTab } from '@ui/features/follows/types/follows.types';
import { toDisplayValue } from '@ui/features/players/utils/playerDisplay';
import { FollowsSegmentedControl } from '@ui/features/follows/components/FollowsSegmentedControl'; // Reusing for aesthetic consistency

type PlayerCareerTabProps = {
    seasons: PlayerCareerSeason[];
    teams: PlayerCareerTeam[];
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        contentPadding: {
            paddingHorizontal: 20,
            paddingVertical: 24,
            paddingBottom: 40,
        },
        tableHeaderRow: {
            flexDirection: 'row',
            marginBottom: 12,
            paddingHorizontal: 16,
        },
        headerText: {
            color: colors.textMuted,
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
        colLogo: { width: 50 },
        colSeason: { flex: 1 },
        colM: { width: 40, alignItems: 'center' },
        colB: { width: 40, alignItems: 'center' },
        colP: { width: 40, alignItems: 'center' },
        colNote: { width: 60, alignItems: 'flex-end' },
        rowItem: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        rowItemFirst: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
        },
        rowItemLast: {
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            borderBottomWidth: 0,
        },
        teamLogo: {
            width: 28,
            height: 28,
            borderRadius: 14,
        },
        seasonText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '700',
            marginBottom: 2,
        },
        teamNameSub: {
            color: colors.textMuted,
            fontSize: 12,
        },
        valText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '700',
        },
        noteVal: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: '800',
        },
        noteArrow: {
            color: colors.textMuted,
            fontSize: 14,
            marginLeft: 4,
        },
        seeAllRow: {
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            flexDirection: 'row',
            gap: 8,
        },
        seeAllText: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        sectionTitleRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            marginTop: 24,
        },
        sectionTitle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
        },
        sectionIcons: {
            flexDirection: 'row',
            gap: 16,
        },
        segmentedTopSpacing: {
            paddingTop: 20,
        },
        noteCellContent: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
        },
        teamCareerItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
        },
        teamCareerInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
        },
        teamCareerLogo: {
            width: 40,
            height: 40,
        },
        teamCareerName: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
            marginBottom: 4,
        },
        teamCareerPeriod: {
            color: colors.textMuted,
            fontSize: 12,
        },
        teamCareerStatsRow: {
            flexDirection: 'row',
            gap: 16,
        },
        teamCareerMatches: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
        },
        teamCareerGoals: {
            color: colors.primary,
            fontSize: 16,
            fontWeight: '800',
        },
        legendRow: {
            flexDirection: 'row',
            gap: 24,
            marginTop: 20,
            paddingTop: 20,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        legendItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        legendText: {
            color: colors.textMuted,
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
    });
}

export function PlayerCareerTab({ seasons, teams }: PlayerCareerTabProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [activeTab, setActiveTab] = useState<'saison' | 'equipe'>('saison');
    const segmentedTab: FollowEntityTab = activeTab === 'saison' ? 'teams' : 'players';
    const seasonRows = useMemo(() => {
        const occurrences = new Map<string, number>();
        return seasons.slice(0, 5).map(season => {
            const baseKey = `${season.season ?? 'unknown'}-${season.team.id ?? season.team.name ?? 'unknown'}`;
            const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
            occurrences.set(baseKey, occurrence);

            return {
                key: `season-${baseKey}-${occurrence}`,
                data: season,
            };
        });
    }, [seasons]);
    const teamRows = useMemo(() => {
        const occurrences = new Map<string, number>();
        return teams.map(team => {
            const baseKey = `${team.team.id ?? team.team.name ?? 'unknown'}-${team.period ?? 'unknown'}`;
            const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
            occurrences.set(baseKey, occurrence);

            return {
                key: `team-${baseKey}-${occurrence}`,
                data: team,
            };
        });
    }, [teams]);

    const handleSegmentedTabChange = (tab: FollowEntityTab) => {
        setActiveTab(tab === 'teams' ? 'saison' : 'equipe');
    };

    return (
        <View style={styles.container}>
            <View style={styles.segmentedTopSpacing}>
                {/* We reuse the Segmented Control but adapt the types */}
                <FollowsSegmentedControl
                    selectedTab={segmentedTab}
                    onChangeTab={handleSegmentedTabChange}
                    teamsLabel="Saison"
                    playersLabel="Équipe"
                />
            </View>

            <ScrollView contentContainerStyle={styles.contentPadding}>
                {activeTab === 'saison' ? (
                    <View>
                        <View style={styles.tableHeaderRow}>
                            <View style={styles.colLogo}><Text style={styles.headerText}>LOGO</Text></View>
                            <View style={styles.colSeason}><Text style={styles.headerText}>SAISON</Text></View>
                            <View style={styles.colM}><Text style={styles.headerText}>M</Text></View>
                            <View style={styles.colB}><Text style={styles.headerText}>B</Text></View>
                            <View style={styles.colP}><Text style={styles.headerText}>P</Text></View>
                            <View style={styles.colNote}><Text style={styles.headerText}>NOTE</Text></View>
                        </View>

                        {seasonRows.map(({ key, data: s }, i) => (
                            <View key={key} style={[
                                styles.rowItem,
                                i === 0 && styles.rowItemFirst,
                            ]}>
                                <View style={styles.colLogo}>
                                    <Image source={{ uri: s.team.logo ?? undefined }} style={styles.teamLogo} />
                                </View>
                                <View style={styles.colSeason}>
                                    <Text style={styles.seasonText}>{toDisplayValue(s.season)}</Text>
                                    <Text style={styles.teamNameSub} numberOfLines={1}>
                                        {toDisplayValue(s.team.name)}
                                    </Text>
                                </View>
                                <View style={styles.colM}><Text style={styles.valText}>{toDisplayValue(s.matches)}</Text></View>
                                <View style={styles.colB}><Text style={styles.valText}>{toDisplayValue(s.goals)}</Text></View>
                                <View style={styles.colP}><Text style={styles.valText}>{toDisplayValue(s.assists)}</Text></View>
                                <View style={[styles.colNote, styles.noteCellContent]}>
                                    <Text style={styles.noteVal}>{toDisplayValue(s.rating)}</Text>
                                    <MaterialCommunityIcons name="chevron-right" style={styles.noteArrow} />
                                </View>
                            </View>
                        ))}

                        <Pressable style={styles.seeAllRow}>
                            <Text style={styles.seeAllText}>VOIR TOUTES LES SAISONS</Text>
                            <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textMuted} />
                        </Pressable>
                    </View>
                ) : (
                    <View>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Carrière professionnelle</Text>
                            <View style={styles.sectionIcons}>
                                <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.textMuted} />
                                <MaterialCommunityIcons name="soccer" size={20} color={colors.textMuted} />
                            </View>
                        </View>

                        {teamRows.map(({ key, data: t }) => (
                            <View key={key} style={styles.teamCareerItem}>
                                <View style={styles.teamCareerInfo}>
                                    <Image source={{ uri: t.team.logo ?? undefined }} style={styles.teamCareerLogo} />
                                    <View>
                                        <Text style={styles.teamCareerName}>{toDisplayValue(t.team.name)}</Text>
                                        <Text style={styles.teamCareerPeriod}>{toDisplayValue(t.period)}</Text>
                                    </View>
                                </View>
                                <View style={styles.teamCareerStatsRow}>
                                    <Text style={styles.teamCareerMatches}>{toDisplayValue(t.matches)}</Text>
                                    <Text style={styles.teamCareerGoals}>{toDisplayValue(t.goals)}</Text>
                                </View>
                            </View>
                        ))}

                        <View style={styles.legendRow}>
                            <View style={styles.legendItem}>
                                <MaterialCommunityIcons name="format-list-bulleted" size={16} color={colors.textMuted} />
                                <Text style={styles.legendText}>MATCHS JOUÉS</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <MaterialCommunityIcons name="soccer" size={16} color={colors.textMuted} />
                                <Text style={styles.legendText}>BUTS</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
