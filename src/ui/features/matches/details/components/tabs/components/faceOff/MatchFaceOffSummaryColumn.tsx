import { Text, View } from 'react-native';

import { matchFaceOffLocalStyles } from '@ui/features/matches/details/components/tabs/MatchFaceOffTab.styles';

type MatchFaceOffSummaryColumnProps = {
  label: string;
  count: number;
  badgeColor: string;
  badgeBg: string;
  labelColor: string;
};

export function MatchFaceOffSummaryColumn({
  label,
  count,
  badgeColor,
  badgeBg,
  labelColor,
}: MatchFaceOffSummaryColumnProps) {
  return (
    <View style={matchFaceOffLocalStyles.summaryCol}>
      <View style={[matchFaceOffLocalStyles.summaryBadge, { backgroundColor: badgeBg }]}>
        <Text style={[matchFaceOffLocalStyles.summaryBadgeText, { color: badgeColor }]}>{count}</Text>
      </View>
      <Text style={[matchFaceOffLocalStyles.summaryLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}
