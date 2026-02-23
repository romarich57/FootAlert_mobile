import { useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { Competition } from '@ui/features/competitions/types/competitions.types';

type CompetitionHeaderProps = {
    competition: Competition;
    currentSeason: number;
    availableSeasons: number[];
    isFollowed: boolean;
    onBack: () => void;
    onToggleFollow: () => void;
    onOpenSeasonPicker: () => void;
};

function displayValue(value: string | null | undefined): string {
    return value && value.trim().length > 0 ? value : '?';
}

function createStyles(colors: ThemeColors, topInset: number) {
    return StyleSheet.create({
        container: {
            paddingTop: topInset + 12,
            paddingHorizontal: 20,
            paddingBottom: 24,
            backgroundColor: colors.background,
        },
        topBar: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
        },
        navTitle: {
            color: colors.text,
            fontSize: 20,
            fontWeight: '700',
            flex: 1,
            textAlign: 'center',
        },
        iconButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
        },
        profileSection: {
            alignItems: 'center',
        },
        photoContainer: {
            position: 'relative',
            marginBottom: 16,
        },
        photoBackground: {
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: colors.surfaceElevated,
            overflow: 'hidden',
            backgroundColor: '#ffffff', // Usually logos are better on white if transparent
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
        },
        photo: {
            width: '100%',
            height: '100%',
        },
        name: {
            color: colors.text,
            fontSize: 26,
            fontWeight: '800',
            letterSpacing: -0.5,
            marginBottom: 6,
            textAlign: 'center',
        },
        subtitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
        },
        country: {
            color: colors.textMuted,
            fontSize: 16,
            fontWeight: '600',
            textTransform: 'uppercase',
        },
        seasonSelector: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            gap: 8,
        },
        seasonText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '600',
        },
    });
}

export function CompetitionHeader({
    competition,
    currentSeason,
    availableSeasons,
    isFollowed,
    onBack,
    onToggleFollow,
    onOpenSeasonPicker
}: CompetitionHeaderProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);

    const handleSeasonPress = () => {
        onOpenSeasonPicker();
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Pressable onPress={onBack} hitSlop={10} style={styles.iconButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </Pressable>

                <Text style={styles.navTitle} numberOfLines={1}>
                    {displayValue(competition.name)}
                </Text>

                <Pressable onPress={onToggleFollow} hitSlop={10} style={styles.iconButton}>
                    <MaterialCommunityIcons
                        name={isFollowed ? "bell-ring" : "bell-outline"}
                        size={24}
                        color={isFollowed ? colors.primary : colors.text}
                    />
                </Pressable>
            </View>

            <View style={styles.profileSection}>
                <View style={styles.photoContainer}>
                    <View style={styles.photoBackground}>
                        <Image
                            source={{ uri: competition.logo ?? undefined }}
                            style={styles.photo}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                <Text style={styles.name}>{displayValue(competition.name)}</Text>

                <View style={styles.subtitleRow}>
                    <Text style={styles.country}>{displayValue(competition.countryName)}</Text>
                </View>

                {availableSeasons.length > 0 && (
                    <Pressable style={styles.seasonSelector} onPress={handleSeasonPress}>
                        <Text style={styles.seasonText}>
                            {t('competitionDetails.labels.season', {
                                start: currentSeason,
                                end: currentSeason + 1,
                            })}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.text} />
                    </Pressable>
                )}
            </View>
        </View>
    );
}
