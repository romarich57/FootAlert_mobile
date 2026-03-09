import { Text, View } from 'react-native';
import type { TFunction } from 'i18next';

import type { EventRow, StatRow } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type MatchPrimaryLiveSectionProps = {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  isLiveRefreshing: boolean;
  statRows: StatRow[];
  eventRows: EventRow[];
  statsError: boolean;
  statsErrorKey: string;
  eventsError: boolean;
  eventsErrorKey: string;
  venueName: string;
  venueCity: string;
};

export function MatchPrimaryLiveSection({
  styles,
  t,
  isLiveRefreshing,
  statRows,
  eventRows,
  statsError,
  statsErrorKey,
  eventsError,
  eventsErrorKey,
  venueName,
  venueCity,
}: MatchPrimaryLiveSectionProps) {
  return (
    <>
      <View style={styles.card}>
        <View style={styles.inlineRow}>
          <View style={styles.livePulse} />
          <Text style={styles.cardTitle}>{t('matchDetails.primary.liveSummaryTitle')}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{t('matchDetails.primary.liveAutoUpdate')}</Text>
        {isLiveRefreshing ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('matchDetails.live.updating')}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.tabs.stats')}</Text>
        {statRows.length === 0 ? (
          <Text style={styles.emptyText}>
            {statsError ? t(statsErrorKey) : t('matchDetails.values.unavailable')}
          </Text>
        ) : null}
        {statRows.slice(0, 6).map(row => (
          <View key={row.key} style={styles.statRow}>
            <View style={styles.statHeaderRow}>
              <Text style={styles.statValue}>{row.homeValue}</Text>
              <Text style={styles.statLabel}>{t(row.labelKey)}</Text>
              <Text style={styles.statValue}>{row.awayValue}</Text>
            </View>
            <View style={styles.statBarRail}>
              <View style={[styles.statBarHome, { width: `${row.homePercent}%` }]} />
              <View style={[styles.statBarAway, { width: `${row.awayPercent}%` }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.primary.keyMomentsTitle')}</Text>
        {eventRows.length === 0 ? (
          <Text style={styles.emptyText}>
            {eventsError ? t(eventsErrorKey) : t('matchDetails.values.unavailable')}
          </Text>
        ) : null}
        {eventRows.slice(0, 6).map(event => (
          <View key={event.id} style={[styles.eventRow, event.isNew ? styles.eventRowNew : null]}>
            <Text style={styles.eventMinute}>{event.minute}</Text>
            <Text style={styles.eventLabel}>{event.label}</Text>
            {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.primary.conditionsTitle')}</Text>
        <Text style={styles.newsText}>
          {venueName} · {venueCity}
        </Text>
        <Text style={styles.newsText}>{t('matchDetails.values.weatherPlaceholder')}</Text>
      </View>
    </>
  );
}
