import { Pressable, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  SettingsRow,
  SettingsSection,
} from '@ui/features/more/components';
import type { MoreScreenStyles } from '@ui/features/more/screens/MoreScreen.styles';

type PreferencesSectionCardProps = {
  preferences: { notificationsEnabled: boolean };
  themeValue: string;
  languageValue: string;
  currencyValue: string;
  measurementValue: string;
  notificationsValue: string;
  isUpdatingNotifications: boolean;
  primaryColor: string;
  borderColor: string;
  mutedColor: string;
  primaryContrast: string;
  onOpenTheme: () => void;
  onOpenLanguage: () => void;
  onOpenCurrency: () => void;
  onOpenMeasurement: () => void;
  onToggleNotifications: (enabled: boolean) => void;
};

export function PreferencesSectionCard({
  preferences,
  themeValue,
  languageValue,
  currencyValue,
  measurementValue,
  notificationsValue,
  isUpdatingNotifications,
  primaryColor,
  borderColor,
  mutedColor,
  primaryContrast,
  onOpenTheme,
  onOpenLanguage,
  onOpenCurrency,
  onOpenMeasurement,
  onToggleNotifications,
}: PreferencesSectionCardProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t('more.sections.preferences')}>
      <SettingsRow
        iconName="palette-outline"
        label={t('more.rows.theme')}
        value={themeValue}
        onPress={onOpenTheme}
        accessibilityLabel={t('more.rows.theme')}
      />
      <SettingsRow
        iconName="translate"
        label={t('more.rows.language')}
        value={languageValue}
        onPress={onOpenLanguage}
        accessibilityLabel={t('more.rows.language')}
      />
      <SettingsRow
        iconName="cash-multiple"
        label={t('more.rows.currency')}
        value={currencyValue}
        onPress={onOpenCurrency}
        accessibilityLabel={t('more.rows.currency')}
      />
      <SettingsRow
        iconName="ruler"
        label={t('more.rows.measurement')}
        value={measurementValue}
        onPress={onOpenMeasurement}
        accessibilityLabel={t('more.rows.measurement')}
      />
      <SettingsRow
        iconName="bell-ring-outline"
        label={t('more.rows.notifications')}
        value={notificationsValue}
        isLast
        accessibilityLabel={t('more.rows.notifications')}
        rightElement={(
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={t('more.rows.notifications')}
            value={preferences.notificationsEnabled}
            onValueChange={onToggleNotifications}
            disabled={isUpdatingNotifications}
            trackColor={{ false: borderColor, true: primaryColor }}
            thumbColor={preferences.notificationsEnabled ? primaryContrast : mutedColor}
          />
        )}
        showChevron={false}
      />
    </SettingsSection>
  );
}

type PermissionWarningCardProps = {
  styles: MoreScreenStyles;
  onOpenSettings: () => void;
};

export function PermissionWarningCard({ styles, onOpenSettings }: PermissionWarningCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.warningCard}>
      <Text style={styles.warningText}>{t('more.notifications.permissionDenied')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('more.notifications.openSettings')}
        onPress={onOpenSettings}
      >
        <Text style={styles.warningActionText}>{t('more.notifications.openSettings')}</Text>
      </Pressable>
    </View>
  );
}

type InformationSectionCardProps = {
  appVersion: string;
  hasPrivacyPolicyUrl: boolean;
  hasSupportUrl: boolean;
  hasFollowUsUrl: boolean;
  hasRateAppUrl: boolean;
  onOpenFollowUs: () => void;
  onOpenSupport: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenRateApp: () => void;
};

export function InformationSectionCard({
  appVersion,
  hasPrivacyPolicyUrl,
  hasSupportUrl,
  hasFollowUsUrl,
  hasRateAppUrl,
  onOpenFollowUs,
  onOpenSupport,
  onOpenPrivacyPolicy,
  onOpenRateApp,
}: InformationSectionCardProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t('more.sections.information')}>
      <SettingsRow
        iconName="account-group-outline"
        label={t('more.rows.followUs')}
        onPress={onOpenFollowUs}
        disabled={!hasFollowUsUrl}
        accessibilityLabel={t('more.rows.followUs')}
      />
      <SettingsRow
        iconName="lifebuoy"
        label={t('more.rows.tipsSupport')}
        onPress={onOpenSupport}
        disabled={!hasSupportUrl}
        accessibilityLabel={t('more.rows.tipsSupport')}
      />
      <SettingsRow
        iconName="shield-lock-outline"
        label={t('more.rows.privacyPolicy')}
        onPress={onOpenPrivacyPolicy}
        disabled={!hasPrivacyPolicyUrl}
        accessibilityLabel={t('more.rows.privacyPolicy')}
      />
      <SettingsRow
        iconName="star-circle-outline"
        label={t('more.rows.rateApp')}
        onPress={onOpenRateApp}
        disabled={!hasRateAppUrl}
        accessibilityLabel={t('more.rows.rateApp')}
      />
      <SettingsRow
        iconName="information-outline"
        label={t('more.rows.appVersion')}
        value={appVersion}
        isLast
        showChevron={false}
      />
    </SettingsSection>
  );
}
