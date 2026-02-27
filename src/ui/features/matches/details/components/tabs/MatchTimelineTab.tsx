import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { MatchLifecycleState } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { EventRow } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

type MatchTimelineTabProps = {
  styles: MatchDetailsTabStyles;
  lifecycleState: MatchLifecycleState;
  eventRows: EventRow[];
};

export function MatchTimelineTab({ styles, lifecycleState, eventRows }: MatchTimelineTabProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.tabs.timeline')}</Text>
        {eventRows.length === 0 ? (
          <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text>
        ) : null}
        {eventRows.map(event => (
          <Pressable
            key={event.id}
            style={[styles.eventRow, lifecycleState === 'live' && event.isNew ? styles.eventRowNew : null]}
          >
            <Text style={styles.eventMinute}>{event.minute}</Text>
            <Text style={styles.eventLabel}>{event.label}</Text>
            {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
            <Text style={styles.eventDetail}>{t('matchDetails.timeline.tapHint')}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
