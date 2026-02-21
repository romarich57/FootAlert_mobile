import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Image } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type CountryAccordionProps = {
    name: string;
    flagUrl: string | null;
    children: React.ReactNode;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            backgroundColor: colors.surface,
            marginBottom: 1,
            overflow: 'hidden',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
            minHeight: 56,
        },
        flagContainer: {
            width: 24,
            height: 24,
            marginRight: 12,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: colors.surfaceElevated,
            justifyContent: 'center',
            alignItems: 'center',
        },
        flag: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        title: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
            flex: 1,
        },
        icon: {
            marginLeft: 8,
        },
        content: {
            paddingBottom: 8,
            paddingHorizontal: 8,
        },
    });
}

export const CountryAccordion = memo(function CountryAccordion({
    name,
    flagUrl,
    children,
}: CountryAccordionProps) {
    const [expanded, setExpanded] = useState(false);
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
                <View style={styles.flagContainer}>
                    {flagUrl ? (
                        <Image source={{ uri: flagUrl }} style={styles.flag} />
                    ) : (
                        <MaterialCommunityIcons name="flag" size={14} color={colors.textMuted} />
                    )}
                </View>
                <Text numberOfLines={1} style={styles.title}>
                    {name}
                </Text>
                <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.textMuted}
                    style={styles.icon}
                />
            </Pressable>
            {expanded && <View style={styles.content}>{children}</View>}
        </View>
    );
});
