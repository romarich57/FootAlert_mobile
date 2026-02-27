import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { MatchLifecycleState } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { EventRow } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import { AppImage } from '@ui/shared/media/AppImage';

type MatchTimelineTabProps = {
  styles: MatchDetailsTabStyles;
  lifecycleState: MatchLifecycleState;
  eventRows: EventRow[];
  hasDataError?: boolean;
};

function getEventIcon(type: string) {
  const typeLower = type.toLowerCase();
  if (typeLower.includes('goal')) {
    if (typeLower.includes('own')) return { name: 'soccer', color: '#EF4444' };
    if (typeLower.includes('penalty')) return { name: 'soccer', color: '#38BDF8' };
    return { name: 'soccer', color: '#10B981' };
  }
  if (typeLower.includes('card')) {
    if (typeLower.includes('red')) return { name: 'card', color: '#EF4444' };
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

function toInitials(name: string): string {
  const chunks = name.split(/\s+/).filter(Boolean);
  if (chunks.length === 0) return '?';
  if (chunks.length === 1) return chunks[0].charAt(0).toUpperCase();
  const first = chunks[0].charAt(0);
  const last = chunks[chunks.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}

function TimelineEventCard({ styles, event, align }: { styles: MatchDetailsTabStyles; event: EventRow; align: 'left' | 'right' }) {
  const { name, color } = getEventIcon(event.type);
  const isLeft = align === 'left';
  const playerPhoto = event.playerPhoto;
  const playerName = event.playerName;

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
        <View style={[styles.timelineEventSubLine, isLeft ? { flexDirection: 'row-reverse' } : null]}>
          <View style={styles.timelineIconWrap}>
            <MaterialCommunityIcons name={name} size={14} color={color} />
          </View>
          <Text style={styles.timelineEventText} numberOfLines={1}>
            {event.assistName ? `${event.type} (${event.assistName})` : event.type}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function MatchTimelineTab({ styles, lifecycleState, eventRows, hasDataError = false }: MatchTimelineTabProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.tabs.timeline')}</Text>
        {eventRows.length === 0 ? (
          <Text style={styles.emptyText}>
            {hasDataError ? t('matchDetails.states.datasetErrors.events') : t('matchDetails.values.unavailable')}
          </Text>
        ) : null}

        {eventRows.length > 0 ? (
          <View style={styles.timelineContainer}>
            <View style={styles.timelineCenterLine} />
            {eventRows.map(event => {
              const align = event.team === 'home' ? 'left' : 'right';

              return (
                <View key={event.id} style={styles.timelineRow}>
                  <View style={align === 'left' ? styles.timelineContentLeft : styles.timelineContentEmpty}>
                    {align === 'left' ? <TimelineEventCard styles={styles} event={event} align="left" /> : null}
                  </View>

                  <View style={styles.timelineMinuteBadge}>
                    <Text style={styles.timelineMinuteText}>{event.minute}'</Text>
                  </View>

                  <View style={align === 'right' ? styles.timelineContentRight : styles.timelineContentEmpty}>
                    {align === 'right' ? <TimelineEventCard styles={styles} event={event} align="right" /> : null}
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
