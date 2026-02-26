import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { PlayerProfileTabStyles } from '@ui/features/players/components/profile/PlayerProfileTab.styles';
import type { PlayerCharacteristics } from '@ui/features/players/types/players.types';
import { RadarChart } from '@ui/features/players/components/RadarChart';
import type { TranslateFn } from '@ui/features/players/components/profile/playerProfile.helpers';

type PlayerProfileCharacteristicsCardProps = {
  characteristics: PlayerCharacteristics;
  styles: PlayerProfileTabStyles;
  textColor: string;
  t: TranslateFn;
};

export function PlayerProfileCharacteristicsCard({
  characteristics,
  styles,
  textColor,
  t,
}: PlayerProfileCharacteristicsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <MaterialCommunityIcons name="radar" size={18} color={textColor} />
        <Text style={styles.cardTitle}>{t('playerDetails.profile.labels.characteristics')}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{t('playerDetails.profile.labels.characteristicsSubtitle')}</Text>
      <RadarChart data={characteristics} size={280} />
    </View>
  );
}
