import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionTransfers } from '../hooks/useCompetitionTransfers';

type CompetitionTransfersTabProps = {
    competitionId: number;
    season: number;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
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
    });
}

export function CompetitionTransfersTab({ competitionId, season }: CompetitionTransfersTabProps) {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { data: transfers, isLoading, isError } = useCompetitionTransfers(competitionId, season);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text style={styles.emptyText}>{t('competitionDetails.states.loading')}</Text>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={styles.container}>
                <Text style={styles.emptyText}>{t('competitionDetails.states.loadError')}</Text>
            </View>
        );
    }

    if (!transfers || transfers.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.emptyText}>{t('competitionDetails.transfers.unavailable')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.emptyText}>{t('competitionDetails.transfers.notImplemented')}</Text>
        </View>
    );
}
