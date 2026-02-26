import { Text, View } from 'react-native';

import type { TeamIdentity } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';

import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

type OverviewStadiumInfoCardProps = {
  styles: TeamOverviewStyles;
  t: (key: string) => string;
  team: TeamIdentity;
};

export function OverviewStadiumInfoCard({ styles, t, team }: OverviewStadiumInfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('teamDetails.overview.stadiumInfo')}</Text>

      <View style={styles.stadiumHero}>
        {team.venueImage ? <AppImage source={{ uri: team.venueImage }} style={styles.stadiumHeroImage} /> : null}
        <View style={styles.stadiumHeroOverlay} />
        <View style={styles.stadiumHeroContent}>
          <Text style={styles.stadiumHeroName}>{toDisplayValue(team.venueName)}</Text>
          <Text style={styles.stadiumHeroMeta}>
            {`${toDisplayValue(team.venueCity)}${team.country ? `, ${team.country}` : ''}`}
          </Text>
        </View>
      </View>

      <View style={styles.splitRow}>
        <Text style={styles.splitLabel}>🏟️ {t('teamDetails.labels.capacity')}</Text>
        <Text style={styles.splitValue}>{toDisplayNumber(team.venueCapacity)}</Text>
      </View>
      <View style={styles.splitRow}>
        <Text style={styles.splitLabel}>📅 {t('teamDetails.labels.founded')}</Text>
        <Text style={styles.splitValue}>{toDisplayNumber(team.founded)}</Text>
      </View>
      <View style={styles.splitRow}>
        <Text style={styles.splitLabel}>🌱 {t('teamDetails.labels.surface')}</Text>
        <Text style={styles.splitValue}>{t('teamDetails.overview.surfaceUnknown')}</Text>
      </View>
    </View>
  );
}
