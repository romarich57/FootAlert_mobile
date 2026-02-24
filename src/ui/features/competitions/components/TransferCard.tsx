import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { Transfer } from '../types/competitions.types';

function formatRelativeDate(
    value: string,
    locale: string,
    t: (key: string, options?: Record<string, unknown>) => string,
): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const transferDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const diffInDays = Math.floor((today.getTime() - transferDay.getTime()) / (24 * 60 * 60 * 1000));

    if (diffInDays === 0) {
        return t('competitionDetails.transfers.relative.today');
    }

    if (diffInDays === 1) {
        return t('competitionDetails.transfers.relative.yesterday');
    }

    if (diffInDays > 1 && diffInDays <= 7) {
        return t('competitionDetails.transfers.relative.daysAgo', { count: diffInDays });
    }

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(parsed);
}

function toDisplayTransferType(type: string, t: (key: string) => string): string {
    const normalized = type.trim().toLowerCase();
    if (!normalized) {
        return t('competitionDetails.transfers.types.unknown');
    }

    if (normalized.includes('loan')) {
        return t('competitionDetails.transfers.types.loan');
    }

    if (normalized.includes('free')) {
        return t('competitionDetails.transfers.types.free');
    }

    return type;
}

type TransferCardProps = {
    transfer: Transfer;
};

export function TransferCard({ transfer }: TransferCardProps) {
    const { colors } = useAppTheme();
    const { t, i18n } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const transferType = toDisplayTransferType(transfer.type, t);
    const relativeDate = formatRelativeDate(transfer.date, i18n.language, t);
    const directionKey = `competitionDetails.transfers.direction.${transfer.direction}`;
    const fromTeamName = transfer.teamOut.name.trim();
    const toTeamName = transfer.teamIn.name.trim();

    return (
        <View style={styles.cardContainer}>
            <View style={styles.topRow}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: transfer.playerPhoto }}
                        style={styles.avatar}
                        resizeMode="cover"
                    />
                </View>
                <Text style={styles.dateText}>{relativeDate}</Text>
            </View>

            <Text style={styles.playerName} numberOfLines={1}>{transfer.playerName}</Text>

            <View style={styles.clubsRow}>
                <View style={styles.clubItem}>
                    {transfer.teamOut.logo ? (
                        <Image source={{ uri: transfer.teamOut.logo }} style={styles.clubLogo} />
                    ) : null}
                    <Text style={styles.clubName} numberOfLines={1} ellipsizeMode="tail">
                        {fromTeamName}
                    </Text>
                </View>

                <View style={styles.arrowContainer}>
                    <Text style={styles.arrowText}>→</Text>
                </View>

                <View style={styles.clubItem}>
                    {transfer.teamIn.logo ? (
                        <Image source={{ uri: transfer.teamIn.logo }} style={styles.clubLogo} />
                    ) : null}
                    <Text style={styles.clubName} numberOfLines={1} ellipsizeMode="tail">
                        {toTeamName}
                    </Text>
                </View>
            </View>

            <View style={styles.footerRow}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t(directionKey)}</Text>
                </View>
                <Text style={styles.footerText} numberOfLines={1}>
                    {t('competitionDetails.transfers.labels.transferType')}: {transferType}
                </Text>
            </View>
        </View>
    );
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        cardContainer: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        topRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        avatarContainer: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.border,
            overflow: 'hidden',
        },
        avatar: {
            width: '100%',
            height: '100%',
        },
        dateText: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
        },
        playerName: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: 12,
        },
        clubsRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
        },
        clubItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            justifyContent: 'center',
        },
        clubLogo: {
            width: 20,
            height: 20,
        },
        clubName: {
            color: colors.textMuted,
            fontSize: 14,
            maxWidth: 100,
        },
        arrowContainer: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.primary + '20', // slight primary tint
            justifyContent: 'center',
            alignItems: 'center',
        },
        arrowText: {
            color: colors.primary,
            fontWeight: '700',
        },
        footerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 8,
        },
        badge: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.primary + '18',
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        badgeText: {
            color: colors.primary,
            fontSize: 11,
            fontWeight: '700',
        },
        footerText: {
            color: colors.textMuted,
            fontSize: 13,
            flex: 1,
            textAlign: 'right',
        },
    });
}
