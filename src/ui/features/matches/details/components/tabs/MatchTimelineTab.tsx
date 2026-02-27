import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { MatchLifecycleState } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type {
  EventRow,
  MatchDetailsDatasetErrorReason,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import { AppImage } from '@ui/shared/media/AppImage';

type MatchTimelineTabProps = {
  styles: MatchDetailsTabStyles;
  lifecycleState: MatchLifecycleState;
  eventRows: EventRow[];
  hasDataError?: boolean;
  dataErrorReason?: MatchDetailsDatasetErrorReason;
};

function getEventIcon(type: string, detail: string) {
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

function getEventDetailTranslationKey(detail: string): string | null {
  const d = detail.toLowerCase();
  if (d.includes('own goal')) return 'own_goal';
  if (d.includes('missed penalty')) return 'missed_penalty';
  if (d.includes('normal goal')) return 'normal_goal';
  if (d.includes('penalty')) return 'penalty';
  if (d.includes('second yellow')) return 'second_yellow_card';
  if (d.includes('yellow')) return 'yellow_card';
  if (d.includes('red')) return 'red_card';
  if (d.includes('subst')) return 'substitution';
  if (d.includes('goal cancelled')) return 'goal_cancelled';
  if (d.includes('penalty awarded')) return 'penalty_awarded';
  if (d.includes('goal confirmed')) return 'goal_confirmed';
  return null;
}

function getEventDisplayName(type: string, detail: string, t: (key: string) => string): string {
  const keyMatch = getEventDetailTranslationKey(detail);
  if (keyMatch) {
    return t(`matchDetails.timeline.events.${keyMatch}`);
  }
  if (type.toLowerCase() === 'goal') return t('matchDetails.timeline.events.normal_goal');
  return type;
}

function toInitials(name: string): string {
  const chunks = name.split(/\s+/).filter(Boolean);
  if (chunks.length === 0) return '?';
  if (chunks.length === 1) return chunks[0].charAt(0).toUpperCase();
  const first = chunks[0].charAt(0);
  const last = chunks[chunks.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}

function TimelineEventCard({
  styles,
  event,
  align,
  t,
}: {
  styles: MatchDetailsTabStyles;
  event: EventRow;
  align: 'left' | 'right';
  t: (key: string) => string;
}) {
  const { name, color } = getEventIcon(event.type, event.detail);
  const isLeft = align === 'left';
  const playerPhoto = event.playerPhoto;
  const playerName = event.playerName;
  const eventDisplayName = getEventDisplayName(event.type, event.detail, t);

  return (
    <View style={[styles.timelineCard, isLeft ? styles.timelineCardLeft : null]}>
      <View style={styles.timelineAvatarWrap}>
        {playerPhoto ? (
          <AppImage source={{ uri: playerPhoto }} style={styles.timelineAvatar} resizeMode="contain" />
        ) : (
          <Text style={styles.timelineAvatarFallbackText}>{toInitials(playerName)}</Text>
        )}
      </View>

      <View style={isLeft ? styles.timelineEventDetailsLeft : styles.timelineEventDetailsRight}>
        <Text style={styles.timelinePlayerName} numberOfLines={1}>
          {playerName}
        </Text>
        <View style={[styles.timelineEventSubLine, isLeft ? styles.timelineEventSubLineReversed : null]}>
          <View style={styles.timelineIconWrap}>
            <MaterialCommunityIcons name={name} size={14} color={color} />
          </View>
          <Text style={styles.timelineEventText} numberOfLines={1}>
            {event.assistName ? `${eventDisplayName} (${event.assistName})` : eventDisplayName}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function MatchTimelineTab({
  styles,
  lifecycleState: _lifecycleState,
  eventRows,
  hasDataError = false,
  dataErrorReason = 'none',
}: MatchTimelineTabProps) {
  const { t } = useTranslation();
  const emptyStateKey =
    hasDataError && dataErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.events'
      : hasDataError
        ? 'matchDetails.states.datasetErrors.events'
        : 'matchDetails.values.unavailable';

  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.tabs.timeline')}</Text>
        {eventRows.length === 0 ? (
          <Text style={styles.emptyText}>{t(emptyStateKey)}</Text>
        ) : null}

        {eventRows.length > 0 ? (
          <View style={styles.timelineContainer}>
            <View style={styles.timelineCenterLine} />
            {eventRows.map(event => {
              const align = event.team === 'home' ? 'left' : 'right';

              return (
                <View key={event.id} style={styles.timelineRow}>
                  <View style={align === 'left' ? styles.timelineContentLeft : styles.timelineContentEmpty}>
                    {align === 'left' ? <TimelineEventCard styles={styles} event={event} align="left" t={t} /> : null}
                  </View>

                  <View style={styles.timelineMinuteBadge}>
                    <Text style={styles.timelineMinuteText}>{event.minute}'</Text>
                  </View>

                  <View style={align === 'right' ? styles.timelineContentRight : styles.timelineContentEmpty}>
                    {align === 'right' ? <TimelineEventCard styles={styles} event={event} align="right" t={t} /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}
