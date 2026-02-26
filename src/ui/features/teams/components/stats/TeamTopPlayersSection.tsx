import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { TeamStatsData, TeamTopPlayer } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';
import type { ThemeColors } from '@ui/shared/theme/theme';

import { formatDecimal } from './teamStatsSelectors';
import type { TeamStatsTabStyles } from './TeamStatsTab.styles';

type TeamTopPlayersSectionProps = {
  data: TeamStatsData | undefined;
  styles: TeamStatsTabStyles;
  colors: ThemeColors;
  t: (key: string) => string;
  onPressPlayer: (playerId: string) => void;
  localizePosition: (value: string | null | undefined) => string;
};

type PlayerCategoryCardProps = {
  title: string;
  players: TeamTopPlayer[];
  valueSelector: (player: TeamTopPlayer) => string;
  localizePosition: (value: string | null | undefined) => string;
  onPressPlayer: (playerId: string) => void;
  colors: ThemeColors;
  styles: TeamStatsTabStyles;
};

const PlayerCategoryCard = memo(function PlayerCategoryCard({
  title,
  players,
  valueSelector,
  localizePosition,
  onPressPlayer,
  colors,
  styles,
}: PlayerCategoryCardProps) {
  if (players.length === 0) {
    return null;
  }

  return (
    <View style={styles.playersCard}>
      <Text style={styles.playersCardTitle}>{title}</Text>
      {players.map(player => (
        <Pressable
          key={`${title}-${player.playerId}`}
          onPress={() => onPressPlayer(player.playerId)}
          style={styles.playerRow}
        >
          <View style={styles.playerLeft}>
            <View style={styles.playerPhotoContainer}>
              {player.photo ? (
                <AppImage source={{ uri: player.photo }} style={styles.playerPhoto} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name="account" size={18} color={colors.textMuted} />
              )}
            </View>

            <View style={styles.playerInfo}>
              <Text numberOfLines={1} style={styles.playerName}>
                {toDisplayValue(player.name)}
              </Text>

              <View style={styles.playerMetaRow}>
                <Text numberOfLines={1} style={styles.playerMeta}>
                  {localizePosition(player.position)}
                </Text>

                <View style={styles.playerTeamLogoContainer}>
                  {player.teamLogo ? (
                    <AppImage
                      source={{ uri: player.teamLogo }}
                      style={styles.playerTeamLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <MaterialCommunityIcons name="shield-outline" size={10} color={colors.textMuted} />
                  )}
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.playerValue}>{valueSelector(player)}</Text>
        </Pressable>
      ))}
    </View>
  );
});

export function TeamTopPlayersSection({
  data,
  styles,
  colors,
  t,
  onPressPlayer,
  localizePosition,
}: TeamTopPlayersSectionProps) {
  return (
    <>
      <Text style={styles.sectionTitle}>{t('teamDetails.stats.topPlayers')}</Text>
      <View style={styles.playersGrid}>
        <PlayerCategoryCard
          title={t('teamDetails.stats.categories.rating')}
          players={data?.topPlayersByCategory?.ratings ?? []}
          valueSelector={player => formatDecimal(player.rating, 2)}
          localizePosition={localizePosition}
          onPressPlayer={onPressPlayer}
          colors={colors}
          styles={styles}
        />

        <PlayerCategoryCard
          title={t('teamDetails.stats.categories.scorers')}
          players={data?.topPlayersByCategory?.scorers ?? []}
          valueSelector={player => toDisplayNumber(player.goals)}
          localizePosition={localizePosition}
          onPressPlayer={onPressPlayer}
          colors={colors}
          styles={styles}
        />

        <PlayerCategoryCard
          title={t('teamDetails.stats.categories.assisters')}
          players={data?.topPlayersByCategory?.assisters ?? []}
          valueSelector={player => toDisplayNumber(player.assists)}
          localizePosition={localizePosition}
          onPressPlayer={onPressPlayer}
          colors={colors}
          styles={styles}
        />
      </View>
    </>
  );
}
