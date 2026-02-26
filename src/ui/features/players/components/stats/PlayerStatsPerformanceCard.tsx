import { Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { DEFAULT_HIT_SLOP, type ThemeColors } from '@ui/shared/theme/theme';

import type { PlayerStatsRows, StatMode } from './playerStatsRows';
import { PlayerStatsSectionBlock } from './PlayerStatsSectionBlock';
import type { PlayerStatsTabStyles } from './PlayerStatsTab.styles';

type PlayerStatsPerformanceCardProps = {
  styles: PlayerStatsTabStyles;
  colors: ThemeColors;
  t: (key: string) => string;
  mode: StatMode;
  onChangeMode: (mode: StatMode) => void;
  rows: PlayerStatsRows;
};

function ToggleButton({
  styles,
  isActive,
  iconName,
  label,
  onPress,
}: {
  styles: PlayerStatsTabStyles;
  isActive: boolean;
  iconName: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.toggleButton, isActive ? styles.toggleButtonActive : null]}
      onPress={onPress}
      hitSlop={DEFAULT_HIT_SLOP}
    >
      <View style={styles.toggleLabelRow}>
        <MaterialCommunityIcons
          name={iconName}
          size={14}
          style={[styles.toggleIcon, isActive ? styles.toggleIconActive : null]}
        />
        <Text style={[styles.toggleText, isActive ? styles.toggleTextActive : null]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function PlayerStatsPerformanceCard({
  styles,
  colors,
  t,
  mode,
  onChangeMode,
  rows,
}: PlayerStatsPerformanceCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.perfHeader}>
        <View style={styles.perfTitleRow}>
          <MaterialCommunityIcons name="chart-line" size={18} color={colors.text} />
          <Text style={styles.perfTitle}>{t('playerDetails.stats.labels.seasonPerformance')}</Text>
        </View>
        <Text style={styles.perfSubtitle}>{t('playerDetails.stats.labels.seasonPerformanceDetails')}</Text>
      </View>

      <View style={styles.toggleRow}>
        <ToggleButton
          styles={styles}
          isActive={mode === 'total'}
          iconName="counter"
          label={t('playerDetails.stats.labels.total')}
          onPress={() => onChangeMode('total')}
        />
        <ToggleButton
          styles={styles}
          isActive={mode === 'per90'}
          iconName="speedometer-medium"
          label={t('playerDetails.stats.labels.perNinety')}
          onPress={() => onChangeMode('per90')}
        />
      </View>

      <PlayerStatsSectionBlock
        sectionKey="shooting"
        rows={rows.shooting}
        title={t('playerDetails.stats.sections.shooting')}
        styles={styles}
        colors={colors}
      />
      <PlayerStatsSectionBlock
        sectionKey="passing"
        rows={rows.passing}
        title={t('playerDetails.stats.sections.passing')}
        styles={styles}
        colors={colors}
      />
      <PlayerStatsSectionBlock
        sectionKey="dribbles"
        rows={rows.dribbles}
        title={t('playerDetails.stats.sections.dribbles')}
        styles={styles}
        colors={colors}
      />
      <PlayerStatsSectionBlock
        sectionKey="defense"
        rows={rows.defense}
        title={t('playerDetails.stats.sections.defense')}
        styles={styles}
        colors={colors}
      />
      <PlayerStatsSectionBlock
        sectionKey="discipline"
        rows={rows.discipline}
        title={t('playerDetails.stats.sections.discipline')}
        styles={styles}
        colors={colors}
      />
      {rows.goalkeeper.length > 0 ? (
        <PlayerStatsSectionBlock
          sectionKey="goalkeeper"
          rows={rows.goalkeeper}
          title={t('playerDetails.stats.sections.goalkeeper')}
          styles={styles}
          colors={colors}
        />
      ) : null}
      <PlayerStatsSectionBlock
        sectionKey="penalties"
        rows={rows.penalties}
        title={t('playerDetails.stats.sections.penalties')}
        styles={styles}
        colors={colors}
      />
    </View>
  );
}
