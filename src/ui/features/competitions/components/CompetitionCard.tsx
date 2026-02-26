import { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View, Pressable } from 'react-native';

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
}: CompetitionCardProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const content = (
        <View style={styles.container}>
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
                <Text numberOfLines={1} style={styles.name}>
                    {name}
                </Text>
            </View>
            {!isEditMode && rightElement && <View>{rightElement}</View>}
        </View>
    );

    if (onPress && !isEditMode) {
        return <Pressable onPress={onPress}>{content}</Pressable>;
    }

    return content;
});
