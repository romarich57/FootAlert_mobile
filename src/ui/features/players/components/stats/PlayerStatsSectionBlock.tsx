import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { StatBar } from '@ui/features/players/components/StatBar';
import type { ThemeColors } from '@ui/shared/theme/theme';

import { resolveSectionIconName, type StatRowConfig, type StatSectionKey } from './playerStatsRows';
import type { PlayerStatsTabStyles } from './PlayerStatsTab.styles';

type PlayerStatsSectionBlockProps = {
  sectionKey: StatSectionKey;
  rows: StatRowConfig[];
  title: string;
  styles: PlayerStatsTabStyles;
  colors: ThemeColors;
};

export function PlayerStatsSectionBlock({
  sectionKey,
  rows,
  title,
  styles,
  colors,
}: PlayerStatsSectionBlockProps) {
  const hasData = rows.some(row => row.value !== null);
  if (!hasData) {
    return null;
  }

  return (
    <View>
      <View style={styles.sectionTitleRow}>
        <MaterialCommunityIcons
          name={resolveSectionIconName(sectionKey)}
          size={16}
          color={colors.textMuted}
        />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {rows.map(row => (
        <StatBar
          key={`${sectionKey}-${row.label}`}
          label={row.label}
          value={row.value}
          maxValue={row.max}
          barColor={row.color}
        />
      ))}
    </View>
  );
}
