import { useMemo, useState, useEffect } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

export type PlayerNotificationPrefs = {
    enabled: boolean;
    startingLineup: boolean;
    goals: boolean;
    assists: boolean;
    yellowCards: boolean;
    redCards: boolean;
    missedPenalty: boolean;
    transfers: boolean;
    substitution: boolean;
    matchRating: boolean;
};

type PlayerNotificationModalProps = {
    visible: boolean;
    initialPrefs: PlayerNotificationPrefs;
    onClose: () => void;
    onSave: (prefs: PlayerNotificationPrefs) => void;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'flex-end',
        },
        sheet: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 32, // More padding at bottom for safe area
            gap: 16,
        },
        handleBarWrap: {
            alignItems: 'center',
            marginBottom: 8,
        },
        handleBar: {
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.border,
        },
        title: {
            color: colors.text,
            fontSize: 22,
            fontWeight: '800',
            marginBottom: 16,
        },
        globalToggleWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surfaceElevated,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 8,
        },
        globalToggleLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        globalToggleText: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
        },
        optionsContainer: {
            gap: 18, // Reduced gap slightly from 18 to fit more options without scrolling if possible
            paddingHorizontal: 8,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        rowLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        label: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '500',
        },
        actions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: 24,
        },
        actionTextPrimary: {
            color: colors.primary,
            fontSize: 16,
            fontWeight: '700',
        },
        disabledRow: {
            opacity: 0.5,
        },
    });
}

function CheckboxRow({
    label,
    icon,
    value,
    disabled,
    onToggle,
    colors,
}: {
    label: string;
    icon: string;
    value: boolean;
    disabled: boolean;
    onToggle: () => void;
    colors: ThemeColors;
}) {
    return (
        <Pressable
            style={[styles.row, disabled && styles.disabledRow]}
            onPress={disabled ? undefined : onToggle}
        >
            <View style={styles.rowLeft}>
                <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
                <Text style={styles.label}>{label}</Text>
            </View>
            <MaterialCommunityIcons
                name={value ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={value ? colors.primary : colors.textMuted}
            />
        </Pressable>
    );
}

// Global styles object
let styles: ReturnType<typeof createStyles>;

export function PlayerNotificationModal({
    visible,
    initialPrefs,
    onClose,
    onSave,
}: PlayerNotificationModalProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    styles = useMemo(() => createStyles(colors), [colors]);
    const [prefs, setPrefs] = useState<PlayerNotificationPrefs>(initialPrefs);
    useEffect(() => {
        if (!visible) {
            return;
        }

        setPrefs(initialPrefs);
    }, [initialPrefs, visible]);

    const updatePref = (key: keyof PlayerNotificationPrefs, value: boolean) => {
        setPrefs(current => ({ ...current, [key]: value }));
    };

    const handleToggleAll = (value: boolean) => {
        if (value) {
            setPrefs({
                enabled: true,
                startingLineup: true,
                goals: true,
                assists: true,
                yellowCards: true,
                redCards: true,
                missedPenalty: true,
                transfers: true,
                substitution: true,
                matchRating: true,
            });
        } else {
            setPrefs({
                enabled: false,
                startingLineup: false,
                goals: false,
                assists: false,
                yellowCards: false,
                redCards: false,
                missedPenalty: false,
                transfers: false,
                substitution: false,
                matchRating: false,
            });
        }
    };

    const handleSave = () => {
        onSave(prefs);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.handleBarWrap}>
                        <View style={styles.handleBar} />
                    </View>

                    <Text style={styles.title}>{t('notifications.player.title', { defaultValue: 'Définir les alertes' })}</Text>

                    <View style={styles.globalToggleWrap}>
                        <View style={styles.globalToggleLeft}>
                            <MaterialCommunityIcons name="account-outline" size={24} color={colors.text} />
                            <Text style={styles.globalToggleText}>{t('notifications.options.enabled', { defaultValue: 'Notifications activées' })}</Text>
                        </View>
                        <Switch
                            value={prefs.enabled}
                            onValueChange={handleToggleAll}
                            trackColor={{ true: colors.primary, false: colors.border }}
                        />
                    </View>

                    <View style={styles.optionsContainer}>
                        <CheckboxRow
                            label={t('notifications.options.startingLineup', { defaultValue: 'Est dans la composition de départ' })}
                            icon="stopwatch-outline"
                            value={prefs.startingLineup}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('startingLineup', !prefs.startingLineup)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.goals', { defaultValue: 'Buts' })}
                            icon="soccer"
                            value={prefs.goals}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('goals', !prefs.goals)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.assists', { defaultValue: 'Passes décisives' })}
                            icon="shoe-cleat"
                            value={prefs.assists}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('assists', !prefs.assists)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.yellowCards', { defaultValue: 'Cartons jaunes' })}
                            icon="cards-outline"
                            value={prefs.yellowCards}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('yellowCards', !prefs.yellowCards)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.redCards', { defaultValue: 'Cartons rouges' })}
                            icon="cards-outline"
                            value={prefs.redCards}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('redCards', !prefs.redCards)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.missedPenalty', { defaultValue: 'Pénalty manqué' })}
                            icon="soccer-field"
                            value={prefs.missedPenalty}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('missedPenalty', !prefs.missedPenalty)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.transfers', { defaultValue: 'Transferts' })}
                            icon="swap-horizontal"
                            value={prefs.transfers}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('transfers', !prefs.transfers)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.substitution', { defaultValue: 'Remplacement' })}
                            icon="swap-vertical"
                            value={prefs.substitution}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('substitution', !prefs.substitution)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.matchRating', { defaultValue: 'Note du match' })}
                            icon="star-outline"
                            value={prefs.matchRating}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('matchRating', !prefs.matchRating)}
                            colors={colors}
                        />
                    </View>

                    <View style={styles.actions}>
                        <Pressable onPress={handleSave}>
                            <Text style={styles.actionTextPrimary}>{t('actions.done', { defaultValue: 'Terminé' })}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
