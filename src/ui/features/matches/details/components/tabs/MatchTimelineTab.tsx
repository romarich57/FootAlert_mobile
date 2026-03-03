import { FlatList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { MatchLifecycleState } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type {
  EventRow,
  MatchDetailsDatasetErrorReason,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import { TimelineEventCard } from '@ui/features/matches/details/components/tabs/shared/matchTimelineShared';

type MatchTimelineTabProps = {
  styles: MatchDetailsTabStyles;
  lifecycleState: MatchLifecycleState;
  eventRows: EventRow[];
  hasDataError?: boolean;
  dataErrorReason?: MatchDetailsDatasetErrorReason;
  onPressPlayer?: (playerId: string) => void;
};

export function MatchTimelineTab({
  styles,
  lifecycleState: _lifecycleState,
  eventRows,
  hasDataError = false,
  dataErrorReason = 'none',
  onPressPlayer,
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
            <FlatList
              data={eventRows}
              keyExtractor={event => event.id}
              renderItem={({ item: event }) => {
                const align = event.team === 'home' ? 'left' : 'right';

                return (
                  <View style={styles.timelineRow}>
                    <View style={align === 'left' ? styles.timelineContentLeft : styles.timelineContentEmpty}>
                      {align === 'left' ? (
                        <TimelineEventCard
                          styles={styles}
                          event={event}
                          align="left"
                          t={t}
                          onPressPlayer={onPressPlayer}
                          onPressAssist={onPressPlayer}
                        />
                      ) : null}
                    </View>

                    <View style={styles.timelineMinuteBadge}>
                      <Text style={styles.timelineMinuteText}>{event.minute}'</Text>
                    </View>

                    <View style={align === 'right' ? styles.timelineContentRight : styles.timelineContentEmpty}>
                      {align === 'right' ? (
                        <TimelineEventCard
                          styles={styles}
                          event={event}
                          align="right"
                          t={t}
                          onPressPlayer={onPressPlayer}
                          onPressAssist={onPressPlayer}
                        />
                      ) : null}
                    </View>
                  </View>
                );
              }}
              scrollEnabled={false}
              removeClippedSubviews
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={5}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}
