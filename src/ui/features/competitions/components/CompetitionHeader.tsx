import { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable, IconActionButton } from '@ui/shared/components';
import { MIN_TOUCH_TARGET, type ThemeColors } from '@ui/shared/theme/theme';
import type { Competition } from '@ui/features/competitions/types/competitions.types';

type CompetitionHeaderProps = {
    competition: Competition;
    currentSeason: number;
    availableSeasons: number[];
    isFollowed: boolean;
    onBack: () => void;
    onToggleFollow: () => void;
    onOpenNotificationModal: () => void;
    onOpenSeasonPicker: () => void;
};

function displayValue(value: string | null | undefined): string {
    return value && value.trim().length > 0 ? value : '';
}

function createStyles(colors: ThemeColors, topInset: number) {
    return StyleSheet.create({
        container: {
            paddingTop: topInset + 8,
            paddingHorizontal: 16,
            paddingBottom: 14,
            backgroundColor: colors.background,
        },
        topBar: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
        },
        topBarRightActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        iconButton: {
            backgroundColor: colors.surfaceElevated,
            width: 40,
            height: 40,
        },
        followButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.text,
            paddingHorizontal: 16,
            height: 40,
            borderRadius: 20,
        },
        followButtonOutline: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 16,
            height: 40,
            borderRadius: 20,
        },
        followButtonText: {
            color: colors.background,
            fontSize: 15,
            fontWeight: '700',
        },
        followButtonTextOutline: {
            color: colors.text,
            fontSize: 15,
            fontWeight: '700',
        },
        profileSection: {
            alignItems: 'center',
        },
        photoContainer: {
            position: 'relative',
            marginBottom: 10,
        },
        photoBackground: {
            width: 82,
            height: 82,
            borderRadius: 41,
            borderWidth: 2,
            borderColor: colors.surfaceElevated,
            overflow: 'hidden',
            backgroundColor: '#ffffff', // Usually logos are better on white if transparent
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
        },
        photo: {
            width: '100%',
            height: '100%',
        },
        name: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '800',
            letterSpacing: -0.3,
            marginBottom: 2,
            textAlign: 'center',
        },
        subtitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
        },
        country: {
            color: colors.textMuted,
            fontSize: 13,
            fontWeight: '600',
            textTransform: 'uppercase',
        },
        seasonSelector: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 7,
            minHeight: MIN_TOUCH_TARGET,
            borderRadius: 18,
            gap: 6,
        },
        seasonText: {
            color: colors.text,
            fontSize: 13,
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
    onOpenNotificationModal,
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
                <IconActionButton
                    accessibilityLabel={t('actions.back')}
                    onPress={onBack}
                    style={styles.iconButton}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </IconActionButton>

                <View style={styles.topBarRightActions}>
                    <IconActionButton
                        accessibilityLabel={t('actions.openNotifications')}
                        onPress={onOpenNotificationModal}
                        style={styles.iconButton}
                    >
                        <MaterialCommunityIcons
                            name={isFollowed ? "bell-ring" : "bell-outline"}
                            size={20}
                            color={isFollowed ? colors.primary : colors.text}
                        />
                    </IconActionButton>

                    <AppPressable
                        style={isFollowed ? styles.followButtonOutline : styles.followButton}
                        onPress={onToggleFollow}
                        accessibilityRole="button"
                        accessibilityLabel={isFollowed ? t('actions.following', { defaultValue: 'Suivi' }) : t('actions.follow', { defaultValue: 'Suivre' })}
                    >
                        <Text style={isFollowed ? styles.followButtonTextOutline : styles.followButtonText}>
                            {isFollowed ? t('actions.following', { defaultValue: 'Suivi' }) : t('actions.follow', { defaultValue: 'Suivre' })}
                        </Text>
                    </AppPressable>
                </View>
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
                    <AppPressable
                        testID="competition-season-trigger"
                        style={styles.seasonSelector}
                        onPress={handleSeasonPress}
                        accessibilityRole="button"
                        accessibilityLabel={t('competitionDetails.labels.season', {
                            start: currentSeason,
                            end: currentSeason + 1,
                        })}
                    >
                        <Text style={styles.seasonText}>
                            {t('competitionDetails.labels.season', {
                                start: currentSeason,
                                end: currentSeason + 1,
                            })}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.text} />
                    </AppPressable>
                )}
            </View>
        </View>
    );
}
