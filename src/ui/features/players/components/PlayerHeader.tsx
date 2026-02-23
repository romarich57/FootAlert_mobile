import { useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerProfile } from '@ui/features/players/types/players.types';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';

type PlayerHeaderProps = {
    profile: PlayerProfile;
    onBack: () => void;
    onShare?: () => void;
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
            backgroundColor: colors.background, // Should match dark theme background
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
            width: 120,
            height: 120,
            borderRadius: 60,
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
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.background,
        },
        teamLogoSmall: {
            width: 24,
            height: 24,
        },
        name: {
            color: colors.text,
            fontSize: 28,
            fontWeight: '800',
            letterSpacing: -0.5,
            marginBottom: 6,
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

export function PlayerHeader({ profile, onBack, onShare }: PlayerHeaderProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
    const localizedPosition = localizePlayerPosition(profile.position, t);

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Pressable onPress={onBack} hitSlop={10} style={styles.iconButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.navTitle} numberOfLines={1}>
                    {displayValue(profile.name)}
                </Text>
                <Pressable onPress={onShare} hitSlop={10} style={styles.iconButton}>
                    <MaterialCommunityIcons name="share-variant" size={24} color={colors.text} />
                </Pressable>
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
                        <Image
                            source={{ uri: profile.team.logo ?? undefined }}
                            style={styles.teamLogoSmall}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                <Text style={styles.name}>{displayValue(profile.name)}</Text>

                <View style={styles.subtitleRow}>
                    <Text style={styles.position}>{localizedPosition}</Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.teamName}>{displayValue(profile.team.name)}</Text>
                </View>
            </View>
        </View>
    );
}
