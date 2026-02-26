import { Image, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { PlayerProfileTabStyles } from '@ui/features/players/components/profile/PlayerProfileTab.styles';
import type { TranslateFn } from '@ui/features/players/components/profile/playerProfile.helpers';
import type { PlayerTrophiesByClub } from '@ui/features/players/types/players.types';
import { toDisplayValue } from '@ui/features/players/utils/playerDisplay';

type PlayerProfileTrophiesCardProps = {
  trophiesByClub: PlayerTrophiesByClub;
  styles: PlayerProfileTabStyles;
  textColor: string;
  textMutedColor: string;
  t: TranslateFn;
};

export function PlayerProfileTrophiesCard({
  trophiesByClub,
  styles,
  textColor,
  textMutedColor,
  t,
}: PlayerProfileTrophiesCardProps) {
  if (trophiesByClub.length === 0) {
    return null;
  }

  return (
    <View style={styles.card} testID="player-profile-trophies-section">
      <View style={styles.cardTitleRow}>
        <MaterialCommunityIcons name="trophy-outline" size={18} color={textColor} />
        <Text style={styles.cardTitle}>{t('playerDetails.profile.labels.trophies')}</Text>
      </View>

      <View style={styles.trophiesWrap}>
        {trophiesByClub.map(clubGroup => (
          <View
            key={`${clubGroup.clubId ?? 'unknown'}-${clubGroup.clubName ?? 'unknown'}`}
            style={styles.clubCard}
          >
            <View style={styles.clubHeader}>
              <View style={styles.clubLogoWrap}>
                {clubGroup.clubLogo ? (
                  <Image source={{ uri: clubGroup.clubLogo }} style={styles.clubLogo} resizeMode="contain" />
                ) : (
                  <MaterialCommunityIcons name="shield-outline" size={18} color={textMutedColor} />
                )}
              </View>
              <Text style={styles.clubName} numberOfLines={1}>
                {toDisplayValue(clubGroup.clubName) || t('playerDetails.profile.labels.unknownClub')}
              </Text>
            </View>

            {clubGroup.competitions.map((competition, index) => (
              <View
                key={`${clubGroup.clubId ?? 'unknown'}-${competition.competition}-${competition.count}-${competition.seasons.join('-')}`}
              >
                <View style={styles.trophyCompetitionRow}>
                  <Text style={styles.trophyCount}>{competition.count}</Text>
                  <View style={styles.trophyBody}>
                    <View style={styles.trophyTitleLine}>
                      <MaterialCommunityIcons name="trophy-variant-outline" size={16} color={textMutedColor} />
                      <Text style={styles.trophyName}>{competition.competition}</Text>
                    </View>
                    {competition.seasons.length > 0 ? (
                      <Text style={styles.trophySeasons}>({competition.seasons.join(' • ')})</Text>
                    ) : null}
                  </View>
                </View>
                {index < clubGroup.competitions.length - 1 ? <View style={styles.trophyDivider} /> : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
