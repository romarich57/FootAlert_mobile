import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type FinishedLegendProps = {
  styles: MatchDetailsTabStyles;
  t: (key: string) => string;
};

export function FinishedLegend({ styles, t }: FinishedLegendProps) {
  const items = [
    { icon: 'hand-back-right-outline', label: t('matchDetails.lineups.legend.savedPenalties'), color: '#E5E7EB' },
    { icon: 'cards-outline', label: t('matchDetails.lineups.legend.yellowCard'), color: '#FACC15' },
    { icon: 'shoe-print', label: t('matchDetails.lineups.legend.assist'), color: '#E5E7EB' },
    { icon: 'card', label: t('matchDetails.lineups.legend.redCard'), color: '#F87171' },
    { icon: 'soccer', label: t('matchDetails.lineups.legend.goal'), color: '#E5E7EB' },
    { icon: 'cards-playing-outline', label: t('matchDetails.lineups.legend.secondYellow'), color: '#F59E0B' },
    { icon: 'soccer-field', label: t('matchDetails.lineups.legend.ownGoal'), color: '#FCA5A5' },
    { icon: 'medical-bag', label: t('matchDetails.lineups.legend.injured'), color: '#F87171' },
    { icon: 'close-circle-outline', label: t('matchDetails.lineups.legend.missedPenalty'), color: '#E5E7EB' },
    { icon: 'earth', label: t('matchDetails.lineups.legend.nationalTeam'), color: '#60A5FA' },
  ];

  return (
    <View style={styles.lineupLegendGrid}>
      {items.map(item => (
        <View key={item.label} style={styles.lineupLegendItem}>
          <MaterialCommunityIcons name={item.icon} size={17} color={item.color} />
          <Text style={styles.lineupLegendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
