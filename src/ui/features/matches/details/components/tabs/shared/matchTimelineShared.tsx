import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { TFunction } from 'i18next';

import { AppImage } from '@ui/shared/media/AppImage';
import { AppPressable } from '@ui/shared/components';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { EventRow } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

export function getTimelineEventIcon(type: string, detail: string) {
  const typeLower = type.toLowerCase();
  const detailLower = detail.toLowerCase();

  if (typeLower.includes('goal')) {
    if (detailLower.includes('own')) return { name: 'soccer', color: '#EF4444' };
    if (detailLower.includes('penalty')) return { name: 'soccer', color: '#38BDF8' };
    return { name: 'soccer', color: '#10B981' };
  }
  if (typeLower.includes('card')) {
    if (detailLower.includes('red')) return { name: 'card', color: '#EF4444' };
    return { name: 'card', color: '#FDE047' };
  }
  if (typeLower.includes('subst')) {
    return { name: 'swap-vertical', color: '#38BDF8' };
  }
  if (typeLower.includes('var')) {
    return { name: 'monitor', color: '#A3A3A3' };
  }
  return { name: 'information', color: '#A3A3A3' };
}

export function getTimelineEventDetailTranslationKey(detail: string): string | null {
  const detailLower = detail.toLowerCase();
  if (detailLower.includes('own goal')) return 'own_goal';
  if (detailLower.includes('missed penalty')) return 'missed_penalty';
  if (detailLower.includes('normal goal')) return 'normal_goal';
  if (detailLower.includes('penalty')) return 'penalty';
  if (detailLower.includes('second yellow')) return 'second_yellow_card';
  if (detailLower.includes('yellow')) return 'yellow_card';
  if (detailLower.includes('red')) return 'red_card';
  if (detailLower.includes('subst')) return 'substitution';
  if (detailLower.includes('goal cancelled')) return 'goal_cancelled';
  if (detailLower.includes('penalty awarded')) return 'penalty_awarded';
  if (detailLower.includes('goal confirmed')) return 'goal_confirmed';
  return null;
}

export function getTimelineEventDisplayName(type: string, detail: string, t: TFunction): string {
  const keyMatch = getTimelineEventDetailTranslationKey(detail);
  if (keyMatch) {
    return t(`matchDetails.timeline.events.${keyMatch}`);
  }
  if (type.toLowerCase() === 'goal') return t('matchDetails.timeline.events.normal_goal');
  return type;
}

export function toTimelineInitials(name: string): string {
  const chunks = name.split(/\s+/).filter(Boolean);
  if (chunks.length === 0) return '?';
  if (chunks.length === 1) return chunks[0].charAt(0).toUpperCase();
  const first = chunks[0].charAt(0);
  const last = chunks[chunks.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}

function EventActorAvatar({
  styles,
  playerPhoto,
  playerName,
}: {
  styles: MatchDetailsTabStyles;
  playerPhoto: string | null;
  playerName: string;
}) {
  return (
    <View style={styles.timelineAvatarWrap}>
      {playerPhoto ? (
        <AppImage source={{ uri: playerPhoto }} style={styles.timelineAvatar} resizeMode="contain" />
      ) : (
        <Text style={styles.timelineAvatarFallbackText}>{toTimelineInitials(playerName)}</Text>
      )}
    </View>
  );
}

export function TimelineEventCard({
  styles,
  event,
  align,
  t,
  onPressPlayer,
  onPressAssist,
}: {
  styles: MatchDetailsTabStyles;
  event: EventRow;
  align: 'left' | 'right';
  t: TFunction;
  onPressPlayer?: (playerId: string) => void;
  onPressAssist?: (playerId: string) => void;
}) {
  const { name, color } = getTimelineEventIcon(event.type, event.detail);
  const isLeft = align === 'left';
  const eventDisplayName = getTimelineEventDisplayName(event.type, event.detail, t);
  const playerNameNode =
    event.playerId && onPressPlayer ? (
      <AppPressable
        onPress={() => onPressPlayer(event.playerId ?? '')}
        accessibilityRole='button'
        accessibilityLabel={event.playerName}
      >
        <Text style={styles.timelinePlayerName} numberOfLines={1}>
          {event.playerName}
        </Text>
      </AppPressable>
    ) : (
      <Text style={styles.timelinePlayerName} numberOfLines={1}>
        {event.playerName}
      </Text>
    );

  return (
    <View style={[styles.timelineCard, isLeft ? styles.timelineCardLeft : null]}>
      <EventActorAvatar styles={styles} playerPhoto={event.playerPhoto} playerName={event.playerName} />

      <View style={isLeft ? styles.timelineEventDetailsLeft : styles.timelineEventDetailsRight}>
        {playerNameNode}
        <View style={[styles.timelineEventSubLine, isLeft ? styles.timelineEventSubLineReversed : null]}>
          <View style={styles.timelineIconWrap}>
            <MaterialCommunityIcons name={name} size={14} color={color} />
          </View>
          <Text style={styles.timelineEventText} numberOfLines={1}>{eventDisplayName}</Text>
          {event.assistName ? (
            event.assistId && onPressAssist ? (
              <AppPressable
                onPress={() => onPressAssist(event.assistId ?? '')}
                accessibilityRole='button'
                accessibilityLabel={event.assistName}
              >
                <Text style={styles.timelineEventText} numberOfLines={1}>
                  {`(${event.assistName})`}
                </Text>
              </AppPressable>
            ) : (
              <Text style={styles.timelineEventText} numberOfLines={1}>
                {`(${event.assistName})`}
              </Text>
            )
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function CompactTimelineEventRow({
  styles,
  event,
  t,
  onPressPlayer,
  onPressAssist,
}: {
  styles: MatchDetailsTabStyles;
  event: EventRow;
  t: TFunction;
  onPressPlayer?: (playerId: string) => void;
  onPressAssist?: (playerId: string) => void;
}) {
  const { name, color } = getTimelineEventIcon(event.type, event.detail);
  const eventDisplayName = getTimelineEventDisplayName(event.type, event.detail, t);
  const playerNameNode =
    event.playerId && onPressPlayer ? (
      <AppPressable
        onPress={() => onPressPlayer(event.playerId ?? '')}
        accessibilityRole='button'
        accessibilityLabel={event.playerName}
      >
        <Text style={styles.compactTimelinePlayer} numberOfLines={1}>
          {event.playerName}
        </Text>
      </AppPressable>
    ) : (
      <Text style={styles.compactTimelinePlayer} numberOfLines={1}>
        {event.playerName}
      </Text>
    );

  return (
    <View style={styles.compactTimelineRow}>
      <Text style={styles.compactTimelineMinute}>{event.minute}</Text>

      <EventActorAvatar styles={styles} playerPhoto={event.playerPhoto} playerName={event.playerName} />

      <View style={styles.compactTimelineTextWrap}>
        {playerNameNode}
        <View style={styles.compactTimelineDetailRow}>
          <MaterialCommunityIcons name={name} size={14} color={color} />
          <Text style={styles.compactTimelineDetail} numberOfLines={1}>{eventDisplayName}</Text>
          {event.assistName ? (
            event.assistId && onPressAssist ? (
              <AppPressable
                onPress={() => onPressAssist(event.assistId ?? '')}
                accessibilityRole='button'
                accessibilityLabel={event.assistName}
              >
                <Text style={styles.compactTimelineDetail} numberOfLines={1}>
                  {`(${event.assistName})`}
                </Text>
              </AppPressable>
            ) : (
              <Text style={styles.compactTimelineDetail} numberOfLines={1}>
                {`(${event.assistName})`}
              </Text>
            )
          ) : null}
        </View>
      </View>
    </View>
  );
}
