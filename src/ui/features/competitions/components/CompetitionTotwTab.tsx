import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionTotw } from '../hooks/useCompetitionTotw';
import { PitchFormation } from './PitchFormation';

type CompetitionTotwTabProps = {
    competitionId: number;
    season: number;
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
            padding: 24,
        },
        emptyText: {
            color: colors.textMuted,
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 24,
        },
        scrollContent: {
            padding: 16,
        },
        title: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '800',
            marginBottom: 16,
            textAlign: 'center',
        },
    });
}

export function CompetitionTotwTab({ competitionId, season }: CompetitionTotwTabProps) {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { data: totw, isLoading, isError } = useCompetitionTotw(competitionId, season, undefined);

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

    if (!totw) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('competitionDetails.totw.unavailable')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>
                    {t('competitionDetails.totw.title')} • {totw.round}
                </Text>
                <PitchFormation players={totw.players} />
            </ScrollView>
        </View>
    );
}
