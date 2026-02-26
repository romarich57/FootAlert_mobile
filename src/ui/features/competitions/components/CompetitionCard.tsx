import { memo, useMemo } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, Pressable } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type CompetitionCardProps = {
    name: string;
    logoUrl: string;
    rightElement?: React.ReactNode;
    onPress?: () => void;
    isEditMode?: boolean;
    onUnfollow?: () => void;
    disabled?: boolean;
    disabledReason?: string;
    isCheckingAvailability?: boolean;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 16,
            minHeight: 64,
        },
        containerDisabled: {
            opacity: 0.55,
        },
        left: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            flex: 1,
        },
        logo: {
            width: 32,
            height: 32,
            resizeMode: 'contain',
        },
        name: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '500',
        },
        nameDisabled: {
            color: colors.textMuted,
        },
        availabilityState: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginLeft: 10,
        },
        disabledReason: {
            color: colors.textMuted,
            fontSize: 11,
            fontWeight: '600',
            maxWidth: 120,
        },
        removeButton: {
            padding: 8,
            marginRight: -8,
        },
    });
}

export const CompetitionCard = memo(function CompetitionCard({
    name,
    logoUrl,
    rightElement,
    onPress,
    isEditMode,
    onUnfollow,
    disabled = false,
    disabledReason,
    isCheckingAvailability = false,
}: CompetitionCardProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const isLocked = disabled || isCheckingAvailability;

    const content = (
        <View style={[styles.container, isLocked ? styles.containerDisabled : null]}>
            {isEditMode && (
                <Pressable onPress={onUnfollow} style={styles.removeButton}>
                    <MaterialCommunityIcons name="minus-circle" size={24} color={colors.danger} />
                </Pressable>
            )}
            <View style={styles.left}>
                {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.logo} />
                ) : (
                    <View style={styles.logo} />
                )}
                <Text numberOfLines={1} style={[styles.name, isLocked ? styles.nameDisabled : null]}>
                    {name}
                </Text>
            </View>
            {!isEditMode && !isLocked && rightElement && <View>{rightElement}</View>}
            {!isEditMode && isLocked ? (
                <View style={styles.availabilityState}>
                    {isCheckingAvailability ? (
                        <ActivityIndicator size="small" color={colors.textMuted} />
                    ) : (
                        <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textMuted} />
                    )}
                    {disabledReason ? (
                        <Text numberOfLines={2} style={styles.disabledReason}>
                            {disabledReason}
                        </Text>
                    ) : null}
                </View>
            ) : null}
        </View>
    );

    if (onPress && !isEditMode) {
        return (
            <Pressable
                onPress={onPress}
                disabled={isLocked}
                accessibilityState={{ disabled: isLocked }}
                accessibilityHint={isLocked ? disabledReason : undefined}
            >
                {content}
            </Pressable>
        );
    }

    return content;
});
