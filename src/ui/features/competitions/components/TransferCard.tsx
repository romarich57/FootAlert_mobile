import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
// You can also use react-native-vector-icons if necessary, e.g. import Icon from 'react-native-vector-icons/Feather';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { Transfer } from '../types/competitions.types';

// Simple helper to calculate days ago or formate date
const getDaysAgo = (dateString: string) => {
    const today = new Date();
    const transferDate = new Date(dateString);
    const diffTime = Math.abs(today.getTime() - transferDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

type TransferCardProps = {
    transfer: Transfer;
};

export function TransferCard({ transfer }: TransferCardProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const playerImageUrl = `https://media.api-sports.io/football/players/${transfer.playerId}.png`;

    // Type parsing logic
    let displayType = transfer.type || 'N/A';
    if (displayType.toLowerCase().includes('free')) {
        displayType = t('teamDetails.labels.transferType', { defaultValue: 'Transfert gratuit' });
    } else if (displayType.toLowerCase().includes('loan')) {
        displayType = t('teamDetails.labels.transferType', { defaultValue: 'Prêt' });
    }

    const daysAgo = getDaysAgo(transfer.date);
    const daysLabel = daysAgo === 0 ? "Aujourd'hui" : `Il y a ${daysAgo} jour${daysAgo > 1 ? 's' : ''}`;

    return (
        <View style={styles.cardContainer}>
            <View style={styles.topRow}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: playerImageUrl }}
                        style={styles.avatar}
                        resizeMode="cover"
                    />
                </View>
                <Text style={styles.dateText}>{daysLabel}</Text>
            </View>

            <Text style={styles.playerName} numberOfLines={1}>{transfer.playerName}</Text>

            <View style={styles.clubsRow}>
                {transfer.teamOut.id ? (
                    <View style={styles.clubItem}>
                        <Text style={styles.clubName} numberOfLines={1} ellipsizeMode="tail">
                            {transfer.teamOut.name}
                        </Text>
                        <Image source={{ uri: transfer.teamOut.logo }} style={styles.clubLogo} />
                    </View>
                ) : (
                    <Text style={styles.clubName}>Transfert Libre</Text>
                )}

                <View style={styles.arrowContainer}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>→</Text>
                </View>

                {transfer.teamIn.id ? (
                    <View style={styles.clubItem}>
                        <Image source={{ uri: transfer.teamIn.logo }} style={styles.clubLogo} />
                        <Text style={styles.clubName} numberOfLines={1} ellipsizeMode="tail">
                            {transfer.teamIn.name}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.clubName}>Agent Libre</Text>
                )}
            </View>

            <View style={styles.footerRow}>
                <Text style={styles.footerText}>
                    <Text style={styles.footerBold}>Type </Text>
                    {displayType}
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
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
            position: 'relative',
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
            position: 'absolute',
            top: 0,
            right: 0,
            color: colors.textMuted,
            fontSize: 12,
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
            marginBottom: 16,
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
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.primary + '20', // slight primary tint
            justifyContent: 'center',
            alignItems: 'center',
        },
        footerRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        footerText: {
            color: colors.textMuted,
            fontSize: 13,
        },
        footerBold: {
            fontWeight: '600',
            color: colors.text,
        },
    });
}
