import { Text, View } from 'react-native';

import type { TeamOverviewPlayerLeaders } from '@ui/features/teams/types/teams.types';
import { toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';

import { categoryValue, toShortInitials, type PlayerCategoryKey } from './overviewSelectors';
import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

type LeaderSection = {
  key: PlayerCategoryKey;
  title: string;
  players: TeamOverviewPlayerLeaders[PlayerCategoryKey];
};

type OverviewPlayerLeadersCardProps = {
  styles: TeamOverviewStyles;
  t: (key: string) => string;
  leaderSections: LeaderSection[];
};

export function OverviewPlayerLeadersCard({
  styles,
  t,
  leaderSections,
}: OverviewPlayerLeadersCardProps) {
  const hasAnyLeaders = leaderSections.some(section => section.players.length > 0);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('teamDetails.overview.playerLeaders')}</Text>
      {hasAnyLeaders ? (
        <View style={styles.leadersGrid}>
          {leaderSections.map(section => {
            if (section.players.length === 0) {
              return null;
            }

            const mainPlayer = section.players[0] ?? null;
            const restPlayers = section.players.slice(1, 3);

            return (
              <View key={section.key} style={styles.leaderCard}>
                <Text style={styles.leaderTitle}>{section.title}</Text>

                <View style={styles.leaderMainRow}>
                  <View style={styles.leaderMainAvatarWrap}>
                    {mainPlayer?.photo ? (
                      <AppImage source={{ uri: mainPlayer.photo }} style={styles.leaderMainAvatar} />
                    ) : (
                      <Text style={styles.leaderAvatarFallback}>{toShortInitials(mainPlayer?.name)}</Text>
                    )}
                  </View>
                  <View style={styles.leaderMainTextWrap}>
                    <Text numberOfLines={2} style={styles.leaderMainName}>
                      {toDisplayValue(mainPlayer?.name)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.leaderMainValue}>{categoryValue(mainPlayer, section.key)}</Text>

                {restPlayers.map(player => (
                  <View key={`${section.key}-${player.playerId}`} style={styles.leaderItemRow}>
                    <View style={styles.leaderItemLeft}>
                      <View style={styles.leaderItemAvatarWrap}>
                        {player.photo ? (
                          <AppImage source={{ uri: player.photo }} style={styles.leaderItemAvatar} />
                        ) : (
                          <Text style={styles.leaderAvatarFallback}>{toShortInitials(player.name)}</Text>
                        )}
                      </View>
                      <Text numberOfLines={1} style={styles.leaderItemName}>
                        {toDisplayValue(player.name)}
                      </Text>
                    </View>
                    <Text style={styles.leaderItemValue}>{categoryValue(player, section.key)}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
      )}
    </View>
  );
}
