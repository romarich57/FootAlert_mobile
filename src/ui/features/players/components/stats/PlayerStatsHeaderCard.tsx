import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import { toDisplayValue } from '@ui/features/players/utils/playerDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

import type { PlayerStatsTabStyles } from './PlayerStatsTab.styles';

type PlayerStatsHeaderCardProps = {
  styles: PlayerStatsTabStyles;
  colors: ThemeColors;
  t: (key: string) => string;
  stats: PlayerSeasonStats;
  leagueName: string | null;
};

function LabelWithIcon({
  iconName,
  label,
  styles,
  isPrimary,
}: {
  iconName: string;
  label: string;
  styles: PlayerStatsTabStyles;
  isPrimary?: boolean;
}) {
  return (
    <View style={styles.labelWithIconRow}>
      <MaterialCommunityIcons
        name={iconName}
        size={14}
        style={[styles.labelIcon, isPrimary ? styles.labelIconPrimary : null]}
      />
      <Text style={styles.kpiTopLabel}>{label}</Text>
    </View>
  );
}

function BottomLabelWithIcon({
  iconName,
  label,
  styles,
}: {
  iconName: string;
  label: string;
  styles: PlayerStatsTabStyles;
}) {
  return (
    <View style={styles.kpiBottomLabelRow}>
      <MaterialCommunityIcons name={iconName} size={13} style={styles.kpiBottomLabelIcon} />
      <Text
        style={styles.kpiBottomLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {label}
      </Text>
    </View>
  );
}

export function PlayerStatsHeaderCard({
  styles,
  colors,
  t,
  stats,
  leagueName,
}: PlayerStatsHeaderCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="chart-box-outline" size={18} color={colors.text} />
          <Text style={styles.cardTitle}>{t('teamDetails.overview.seasonStats')}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{toDisplayValue(leagueName)}</Text>
      </View>

      <View style={styles.kpiTopRow}>
        <View style={[styles.kpiTopTile, styles.kpiTopTileGoals]}>
          <LabelWithIcon iconName="soccer" label={t('playerDetails.stats.labels.goals')} styles={styles} />
          <Text style={styles.kpiTopValue}>{toDisplayValue(stats.goals)}</Text>
        </View>
        <View style={[styles.kpiTopTile, styles.kpiTopTileAssists]}>
          <LabelWithIcon
            iconName="swap-horizontal"
            label={t('playerDetails.stats.labels.assists')}
            styles={styles}
          />
          <Text style={styles.kpiTopValue}>{toDisplayValue(stats.assists)}</Text>
        </View>
        <View style={[styles.kpiTopTile, styles.kpiTopTileRating]}>
          <LabelWithIcon
            iconName="star"
            label={t('playerDetails.stats.labels.rating')}
            styles={styles}
            isPrimary
          />
          <Text style={[styles.kpiTopValue, styles.kpiTopValuePrimary]}>{toDisplayValue(stats.rating)}</Text>
        </View>
      </View>

      <View style={styles.kpiBottomRow}>
        <View style={styles.kpiBottomTile}>
          <Text style={styles.kpiBottomValue}>{toDisplayValue(stats.matches)}</Text>
          <BottomLabelWithIcon
            iconName="calendar-month-outline"
            label={t('playerDetails.stats.labels.matches')}
            styles={styles}
          />
        </View>
        <View style={styles.kpiBottomTile}>
          <Text style={styles.kpiBottomValue}>{toDisplayValue(stats.starts)}</Text>
          <BottomLabelWithIcon
            iconName="account-check-outline"
            label={t('playerDetails.stats.labels.starts')}
            styles={styles}
          />
        </View>
        <View style={styles.kpiBottomTile}>
          <Text style={styles.kpiBottomValue}>{toDisplayValue(stats.minutes)}</Text>
          <BottomLabelWithIcon
            iconName="timer-outline"
            label={t('playerDetails.stats.labels.minutes')}
            styles={styles}
          />
        </View>
      </View>
    </View>
  );
}
