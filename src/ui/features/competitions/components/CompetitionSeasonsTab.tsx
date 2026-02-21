import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionSeasons } from '../hooks/useCompetitionSeasons';

type CompetitionSeasonsTabProps = {
    competitionId: number;
    currentSeason: number;
    onSeasonSelect: (season: number) => void;
};

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
        headerLabel: {
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: '600',
            textTransform: 'uppercase',
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.surfaceElevated,
            backgroundColor: colors.surface,
        },
        seasonRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.surface,
            backgroundColor: colors.surface,
        },
        seasonRowActive: {
            backgroundColor: colors.surfaceElevated,
        },
        seasonText: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
            flex: 1,
        },
        seasonTextActive: {
            color: colors.primary,
            fontWeight: '800',
        },
    });
}

export function CompetitionSeasonsTab({ competitionId, currentSeason, onSeasonSelect }: CompetitionSeasonsTabProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { data: seasons, isLoading, error } = useCompetitionSeasons(competitionId);

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error || !seasons || seasons.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Saisons non disponibles</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.headerLabel}>Historique des saisons</Text>
            <FlatList
                data={seasons}
                keyExtractor={(item) => item.year.toString()}
                renderItem={({ item }) => {
                    const isActive = item.year === currentSeason;
                    return (
                        <Pressable
                            style={[styles.seasonRow, isActive && styles.seasonRowActive]}
                            onPress={() => onSeasonSelect(item.year)}
                        >
                            <Text style={[styles.seasonText, isActive && styles.seasonTextActive]}>
                                Saison {item.year}/{item.year + 1} {item.current && '(En cours)'}
                            </Text>
                            {isActive && (
                                <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                            )}
                        </Pressable>
                    );
                }}
            />
        </View>
    );
}
