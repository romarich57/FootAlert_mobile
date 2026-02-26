import { Image, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { PlayerProfileTabStyles } from '@ui/features/players/components/profile/PlayerProfileTab.styles';
import type { InfoTileItem } from '@ui/features/players/components/profile/playerProfile.helpers';

type PlayerProfileInfoTilesCardProps = {
  infoTiles: InfoTileItem[];
  styles: PlayerProfileTabStyles;
  mutedColor: string;
};

export function PlayerProfileInfoTilesCard({
  infoTiles,
  styles,
  mutedColor,
}: PlayerProfileInfoTilesCardProps) {
  if (infoTiles.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.infoGrid}>
        {infoTiles.map(item => (
          <View key={item.id} style={styles.infoTile} testID={`player-profile-info-${item.id}`}>
            <View style={styles.infoTileHead}>
              {item.flagUrl ? (
                <Image source={{ uri: item.flagUrl }} style={styles.infoTileFlag} testID={`player-profile-flag-${item.id}`} />
              ) : (
                <MaterialCommunityIcons name={item.icon} size={14} color={mutedColor} />
              )}
              <Text style={styles.infoTileLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
            <Text style={styles.infoTileValue} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
