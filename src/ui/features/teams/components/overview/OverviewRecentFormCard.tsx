import { Text, View } from 'react-native';

import type { TeamFormEntry } from '@ui/features/teams/types/teams.types';
import { AppImage } from '@ui/shared/media/AppImage';

import { resolveFormBadgeStyle, toShortInitials } from './overviewSelectors';
import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

type OverviewRecentFormCardProps = {
  styles: TeamOverviewStyles;
  t: (key: string) => string;
  recentForm: TeamFormEntry[];
};

export function OverviewRecentFormCard({ styles, t, recentForm }: OverviewRecentFormCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('teamDetails.overview.recentForm')}</Text>
      <View style={styles.formRow}>
        {recentForm.length > 0 ? (
          recentForm.map(formItem => (
            <View key={`form-${formItem.fixtureId}`} style={styles.formItem}>
              <View style={[styles.formBadge, resolveFormBadgeStyle(formItem.result, styles)]}>
                <Text style={styles.formBadgeText}>{formItem.score ?? formItem.result}</Text>
              </View>
              <View style={styles.formLogoWrap}>
                {formItem.opponentLogo ? (
                  <AppImage source={{ uri: formItem.opponentLogo }} style={styles.formLogo} resizeMode="contain" />
                ) : (
                  <Text style={styles.formLogoFallback}>{toShortInitials(formItem.opponentName)}</Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
        )}
      </View>
    </View>
  );
}
