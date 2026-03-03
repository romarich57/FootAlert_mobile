import { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable, IconActionButton } from '@ui/shared/components';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerProfile } from '@ui/features/players/types/players.types';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';

type PlayerHeaderProps = {
    profile: PlayerProfile;
    isFollowed: boolean;
    onBack: () => void;
    onToggleFollow: () => void;
    onOpenNotificationModal: () => void;
    onPressTeam?: (teamId: string) => void;
};

function displayValue(value: string | null | undefined): string {
    return value && value.trim().length > 0 ? value : '';
}

function createStyles(colors: ThemeColors, topInset: number) {
    return StyleSheet.create({
        container: {
            paddingTop: topInset + 12,
            paddingHorizontal: 20,
            paddingBottom: 24,
            backgroundColor: colors.background, // Should match dark theme background
        },
        topBar: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
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
            height: 36,
            borderRadius: 18,
        },
        followButtonOutline: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 16,
            height: 36,
            borderRadius: 18,
        },
        followButtonText: {
            color: colors.background,
            fontSize: 14,
            fontWeight: '700',
        },
        followButtonTextOutline: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '700',
        },
        profileSection: {
            alignItems: 'center',
        },
        photoContainer: {
            position: 'relative',
            marginBottom: 12,
        },
        photoBackground: {
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: colors.primary,
            overflow: 'hidden',
            backgroundColor: colors.surface,
        },
        photo: {
            width: '100%',
            height: '100%',
        },
        teamLogoSmallContainer: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.background,
        },
        teamLogoSmall: {
            width: 12,
            height: 12,
        },
        name: {
            color: colors.text,
            fontSize: 24,
            fontWeight: '800',
            letterSpacing: -0.5,
            marginBottom: 4,
        },
        subtitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        position: {
            color: colors.textMuted,
            fontSize: 16,
            fontWeight: '600',
            textTransform: 'uppercase',
        },
        separator: {
            color: colors.textMuted,
            fontSize: 16,
        },
        teamName: {
            color: colors.textMuted,
            fontSize: 16,
            fontWeight: '600',
        },
    });
}

export function PlayerHeader({
    profile,
    isFollowed,
    onBack,
    onToggleFollow,
    onOpenNotificationModal,
    onPressTeam,
}: PlayerHeaderProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
    const localizedPosition = localizePlayerPosition(profile.position, t);

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
                            source={{ uri: profile.photo ?? undefined }}
                            style={styles.photo}
                            resizeMode="cover"
                        />
                    </View>
                    <View style={styles.teamLogoSmallContainer}>
                        {profile.team.id && onPressTeam ? (
                            <AppPressable
                                onPress={() => onPressTeam(profile.team.id ?? '')}
                                accessibilityRole="button"
                                accessibilityLabel={displayValue(profile.team.name)}
                            >
                                <Image
                                    source={{ uri: profile.team.logo ?? undefined }}
                                    style={styles.teamLogoSmall}
                                    resizeMode="contain"
                                />
                            </AppPressable>
                        ) : (
                            <Image
                                source={{ uri: profile.team.logo ?? undefined }}
                                style={styles.teamLogoSmall}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </View>

                <Text style={styles.name}>{displayValue(profile.name)}</Text>

                <View style={styles.subtitleRow}>
                    <Text style={styles.position}>{localizedPosition}</Text>
                    <Text style={styles.separator}>•</Text>
                    {profile.team.id && onPressTeam ? (
                        <AppPressable
                            onPress={() => onPressTeam(profile.team.id ?? '')}
                            accessibilityRole="button"
                            accessibilityLabel={displayValue(profile.team.name)}
                        >
                            <Text style={styles.teamName}>{displayValue(profile.team.name)}</Text>
                        </AppPressable>
                    ) : (
                        <Text style={styles.teamName}>{displayValue(profile.team.name)}</Text>
                    )}
                </View>
            </View>
        </View>
    );
}
