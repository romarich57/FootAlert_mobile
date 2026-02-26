import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import { toDisplayValue } from '@ui/features/players/utils/playerDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

import { toPercentValue } from './playerStatsRows';
import type { PlayerStatsTabStyles } from './PlayerStatsTab.styles';

type PlayerStatsShotsCardProps = {
  styles: PlayerStatsTabStyles;
  colors: ThemeColors;
  t: (key: string) => string;
  stats: PlayerSeasonStats;
  leagueName: string | null;
  shotAccuracy: number | null;
  shotConversion: number | null;
};

function ShotLabelWithIcon({
  iconName,
  label,
  styles,
}: {
  iconName: string;
  label: string;
  styles: PlayerStatsTabStyles;
}) {
  return (
    <View style={[styles.labelWithIconRow, styles.labelWithIconRowStart]}>
      <MaterialCommunityIcons name={iconName} size={14} style={styles.labelIcon} />
      <Text style={styles.shotTileLabel}>{label}</Text>
    </View>
  );
}

export function PlayerStatsShotsCard({
  styles,
  colors,
  t,
  stats,
  leagueName,
  shotAccuracy,
  shotConversion,
}: PlayerStatsShotsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="target-variant" size={18} color={colors.text} />
          <Text style={styles.cardTitle}>{t('playerDetails.stats.labels.seasonShots')}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{toDisplayValue(leagueName)}</Text>
      </View>

      <View style={styles.shotGrid}>
        <View style={styles.shotTile}>
          <ShotLabelWithIcon iconName="target-variant" label={t('playerDetails.stats.labels.shots')} styles={styles} />
          <Text style={styles.shotTileValue}>{toDisplayValue(stats.shots)}</Text>
        </View>
        <View style={styles.shotTile}>
          <ShotLabelWithIcon iconName="bullseye" label={t('playerDetails.stats.labels.shotsOnTarget')} styles={styles} />
          <Text style={styles.shotTileValue}>{toDisplayValue(stats.shotsOnTarget)}</Text>
        </View>
        <View style={styles.shotTile}>
          <ShotLabelWithIcon iconName="chart-line" label={t('playerDetails.stats.labels.shotAccuracy')} styles={styles} />
          <Text style={styles.shotTileValue}>{toPercentValue(shotAccuracy)}</Text>
        </View>
        <View style={styles.shotTile}>
          <ShotLabelWithIcon iconName="percent" label={t('playerDetails.stats.labels.shotConversion')} styles={styles} />
          <Text style={styles.shotTileValue}>{toPercentValue(shotConversion)}</Text>
        </View>
      </View>
    </View>
  );
}
