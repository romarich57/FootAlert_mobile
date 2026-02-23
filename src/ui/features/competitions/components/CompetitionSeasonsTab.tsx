import { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList, type ListRenderItem } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionSeasons } from '../hooks/useCompetitionSeasons';

type CompetitionSeasonsTabProps = {
    competitionId: number;
    currentSeason: number;
    onSeasonSelect: (season: number) => void;
};

type CompetitionSeasonItem = {
    year: number;
    current: boolean;
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

type SeasonRowProps = {
    item: CompetitionSeasonItem;
    currentSeason: number;
    onSeasonSelect: (season: number) => void;
    formatSeasonLabel: (year: number, current: boolean) => string;
    checkColor: string;
    styles: ReturnType<typeof createStyles>;
};

const SeasonRow = memo(function SeasonRow({
    item,
    currentSeason,
    onSeasonSelect,
    formatSeasonLabel,
    checkColor,
    styles,
}: SeasonRowProps) {
    const isActive = item.year === currentSeason;

    return (
        <Pressable
            style={[styles.seasonRow, isActive ? styles.seasonRowActive : null]}
            onPress={() => onSeasonSelect(item.year)}
        >
            <Text style={[styles.seasonText, isActive ? styles.seasonTextActive : null]}>
                {formatSeasonLabel(item.year, item.current)}
            </Text>
            {isActive ? (
                <MaterialCommunityIcons name="check" size={20} color={checkColor} />
            ) : null}
        </Pressable>
    );
});

export function CompetitionSeasonsTab({ competitionId, currentSeason, onSeasonSelect }: CompetitionSeasonsTabProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { data: seasons, isLoading, error } = useCompetitionSeasons(competitionId);
    const formatSeasonLabel = useCallback(
        (year: number, current: boolean) => {
            const label = t('competitionDetails.seasons.label', { start: year, end: year + 1 });
            return current ? `${label} ${t('competitionDetails.seasons.current')}` : label;
        },
        [t],
    );
    const renderSeasonItem = useCallback<ListRenderItem<CompetitionSeasonItem>>(
        ({ item }) => (
            <SeasonRow
                item={item}
                currentSeason={currentSeason}
                onSeasonSelect={onSeasonSelect}
                formatSeasonLabel={formatSeasonLabel}
                checkColor={colors.primary}
                styles={styles}
            />
        ),
        [colors.primary, currentSeason, formatSeasonLabel, onSeasonSelect, styles],
    );

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
                <Text style={styles.emptyText}>{t('competitionDetails.seasons.unavailable')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.headerLabel}>{t('competitionDetails.seasons.history')}</Text>
            <FlatList
                data={seasons}
                keyExtractor={(item) => item.year.toString()}
                renderItem={renderSeasonItem}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={6}
            />
        </View>
    );
}
