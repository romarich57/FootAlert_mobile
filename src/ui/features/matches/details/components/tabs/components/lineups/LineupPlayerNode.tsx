import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppPressable } from '@ui/shared/components';
import { AppImage } from '@ui/shared/media/AppImage';
import type { MatchLineupPlayer } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import {
  formatShortPlayerName,
  resolveRatingVariant,
  toInitials,
} from '@ui/features/matches/details/components/tabs/lineups/lineupFormatters';
import { LineupRatingChip } from '@ui/features/matches/details/components/tabs/components/lineups/LineupRatingChip';

type LineupPlayerNodeProps = {
  styles: MatchDetailsTabStyles;
  player: MatchLineupPlayer;
  eventMode: 'pitch' | 'bench';
  onPressPlayer?: (playerId: string) => void;
};

export function LineupPlayerNode({
  styles,
  player,
  eventMode,
  onPressPlayer,
}: LineupPlayerNodeProps) {
  const ratingVariant = resolveRatingVariant(player.rating);
  const hasOutgoingSub = typeof player.outMinute === 'number' && Number.isFinite(player.outMinute);
  const hasIncomingSub = typeof player.inMinute === 'number' && Number.isFinite(player.inMinute);
  const hasGoal = typeof player.goals === 'number' && player.goals > 0;
  const hasYellow = typeof player.yellowCards === 'number' && player.yellowCards > 0;
  const hasRed = typeof player.redCards === 'number' && player.redCards > 0;

  const content = (
    <View style={styles.lineupPlayerNode}>
      <View style={styles.lineupPlayerAvatarWrap}>
        <View style={styles.lineupPlayerImageWrap}>
          {player.photo ? (
            <AppImage source={{ uri: player.photo }} style={styles.lineupPlayerAvatar} resizeMode="contain" />
          ) : (
            <View style={styles.lineupPlayerAvatarFallback}>
              <Text style={styles.lineupPlayerAvatarFallbackText}>{toInitials(player.name)}</Text>
            </View>
          )}
        </View>

        {player.isCaptain ? (
          <View style={styles.lineupCaptainArmbandWrap}>
            <MaterialCommunityIcons name="alpha-c-box" size={18} color="#FDE047" />
          </View>
        ) : null}

        <LineupRatingChip styles={styles} rating={player.rating} variant={ratingVariant} />

        {eventMode === 'pitch' && (hasOutgoingSub || hasIncomingSub) ? (
          <View style={styles.lineupPlayerEventWrap}>
            <Text style={styles.lineupPlayerEventMinute}>
              {(hasOutgoingSub ? player.outMinute : player.inMinute) ?? '--'}'
            </Text>
            <MaterialCommunityIcons
              name="swap-vertical"
              size={16}
              color={hasOutgoingSub ? '#F87171' : '#34D399'}
            />
          </View>
        ) : null}

        {eventMode === 'bench' && hasIncomingSub ? (
          <View style={styles.lineupBenchEventWrap}>
            <Text style={styles.lineupBenchEventMinute}>{player.inMinute}'</Text>
            <MaterialCommunityIcons name="swap-vertical" size={16} color="#34D399" />
          </View>
        ) : null}

        {hasGoal ? (
          <View style={styles.lineupPlayerGoalIconWrap}>
            <MaterialCommunityIcons name="soccer" size={13} color="#111827" />
          </View>
        ) : null}

        {hasYellow || hasRed ? (
          <View style={styles.lineupPlayerCardIconWrap}>
            <MaterialCommunityIcons
              name="card"
              size={12}
              color={hasRed ? '#EF4444' : '#F59E0B'}
            />
          </View>
        ) : null}
      </View>

      <Text style={styles.lineupPlayerName} numberOfLines={2}>
        {formatShortPlayerName(player)}
      </Text>
    </View>
  );

  if (player.id && onPressPlayer) {
    return (
      <AppPressable
        onPress={() => onPressPlayer(player.id)}
        accessibilityRole='button'
        accessibilityLabel={player.name}
      >
        {content}
      </AppPressable>
    );
  }

  return content;
}
