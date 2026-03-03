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

export type TeamNotificationPrefs = {
    enabled: boolean;
    matchStart: boolean;
    halftime: boolean;
    matchEnd: boolean;
    goals: boolean;
    redCards: boolean;
    missedPenalty: boolean;
    transfers: boolean;
    lineups: boolean;
    matchReminder: boolean;
};

type TeamNotificationModalProps = {
    visible: boolean;
    initialPrefs: TeamNotificationPrefs;
    onClose: () => void;
    onSave: (prefs: TeamNotificationPrefs) => void;
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
            gap: 18,
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

export function TeamNotificationModal({
    visible,
    initialPrefs,
    onClose,
    onSave,
}: TeamNotificationModalProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    styles = useMemo(() => createStyles(colors), [colors]);
    const [prefs, setPrefs] = useState<TeamNotificationPrefs>(initialPrefs);
    useEffect(() => {
        if (!visible) {
            return;
        }

        setPrefs(initialPrefs);
    }, [initialPrefs, visible]);

    const updatePref = (key: keyof TeamNotificationPrefs, value: boolean) => {
        setPrefs(current => ({ ...current, [key]: value }));
    };

    const handleToggleAll = (value: boolean) => {
        if (value) {
            setPrefs({
                enabled: true,
                matchStart: true,
                halftime: true,
                matchEnd: true,
                goals: true,
                redCards: true,
                missedPenalty: true,
                transfers: true,
                lineups: true,
                matchReminder: true,
            });
        } else {
            setPrefs({
                enabled: false,
                matchStart: false,
                halftime: false,
                matchEnd: false,
                goals: false,
                redCards: false,
                missedPenalty: false,
                transfers: false,
                lineups: false,
                matchReminder: false,
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

                    <Text style={styles.title}>{t('notifications.team.title', { defaultValue: 'Définir les alertes' })}</Text>

                    <View style={styles.globalToggleWrap}>
                        <View style={styles.globalToggleLeft}>
                            <MaterialCommunityIcons name="shield-outline" size={24} color={colors.text} />
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
                            label={t('notifications.options.matchStart', { defaultValue: 'Début du match' })}
                            icon="stopwatch-outline"
                            value={prefs.matchStart}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('matchStart', !prefs.matchStart)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.halftime', { defaultValue: 'Mi-temps' })}
                            icon="stopwatch-outline"
                            value={prefs.halftime}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('halftime', !prefs.halftime)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.matchEnd', { defaultValue: 'Fin du match' })}
                            icon="stopwatch-outline"
                            value={prefs.matchEnd}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('matchEnd', !prefs.matchEnd)}
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
                            label={t('notifications.options.lineups', { defaultValue: 'Compositions' })}
                            icon="account-group-outline"
                            value={prefs.lineups}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('lineups', !prefs.lineups)}
                            colors={colors}
                        />
                        <CheckboxRow
                            label={t('notifications.options.matchReminder', { defaultValue: 'Rappel de match' })}
                            icon="alarm"
                            value={prefs.matchReminder}
                            disabled={!prefs.enabled}
                            onToggle={() => updatePref('matchReminder', !prefs.matchReminder)}
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
