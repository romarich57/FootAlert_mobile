import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { PlayerProfileTabStyles } from '@ui/features/players/components/profile/PlayerProfileTab.styles';
import type { TranslateFn } from '@ui/features/players/components/profile/playerProfile.helpers';
import type { PlayerPositionsData } from '@ui/features/players/types/players.types';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';
import { toDisplayValue } from '@ui/features/players/utils/playerDisplay';

type PlayerProfilePositionsCardProps = {
  positions: PlayerPositionsData | null;
  styles: PlayerProfileTabStyles;
  textColor: string;
  borderColor: string;
  surfaceColor: string;
  primaryColor: string;
  primaryContrast: string;
  t: TranslateFn;
};

export function PlayerProfilePositionsCard({
  positions,
  styles,
  textColor,
  borderColor,
  surfaceColor,
  primaryColor,
  primaryContrast,
  t,
}: PlayerProfilePositionsCardProps) {
  if (!positions || positions.all.length === 0) {
    return null;
  }

  return (
    <View style={styles.card} testID="player-profile-position-section">
      <View style={styles.cardTitleRow}>
        <MaterialCommunityIcons name="map-marker-path" size={18} color={textColor} />
        <Text style={styles.cardTitle}>{t('playerDetails.profile.labels.position')}</Text>
      </View>

      <View style={styles.positionContent}>
        <View style={styles.positionTextColumn}>
          <View>
            <Text style={styles.positionLabel}>{t('playerDetails.profile.labels.primaryPosition')}</Text>
            <Text style={styles.positionValue}>
              {localizePlayerPosition(positions.primary?.label ?? '', t) || toDisplayValue(positions.primary?.label)}
            </Text>
          </View>
          {positions.others.length > 0 ? (
            <View>
              <Text style={styles.positionLabel}>{t('playerDetails.profile.labels.otherPositions')}</Text>
              {positions.others.map(item => (
                <Text key={item.id} style={styles.secondaryPositionValue}>
                  {localizePlayerPosition(item.label, t) || item.label}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.pitchWrap}>
          <View style={styles.pitch}>
            <View style={styles.pitchBoxTop} />
            <View style={styles.pitchBoxBottom} />
            <View style={styles.pitchHalfLine} />
            <View style={styles.pitchCenterCircle} />
            {positions.all.map(position => (
              <View
                key={`position-${position.id}`}
                style={[
                  styles.pitchBadge,
                  {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    backgroundColor: position.isPrimary ? primaryColor : surfaceColor,
                    borderColor: position.isPrimary ? primaryColor : borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pitchBadgeText,
                    { color: position.isPrimary ? primaryContrast : textColor },
                  ]}
                >
                  {position.shortLabel}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
