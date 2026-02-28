import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { AppImage } from '@ui/shared/media/AppImage';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
  MatchCompetitionMetaCard,
  MatchRecentResultsCard,
  MatchStandingsCard,
  MatchVenueWeatherCard,
} from '@ui/features/matches/details/components/tabs/shared/matchContextCards';
import type {
  MatchPreMatchLeaderPlayer,
  MatchPreMatchSection,
} from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type MatchPreMatchTabProps = {
  styles: MatchDetailsTabStyles;
  sections: MatchPreMatchSection[];
  isLoading: boolean;
};

function LeaderAvatar({
  styles,
  player,
}: {
  styles: MatchDetailsTabStyles;
  player: MatchPreMatchLeaderPlayer | null;
}) {
  if (player?.photo) {
    return <AppImage source={{ uri: player.photo }} style={styles.preMatchLeaderAvatar} />;
  }

  return (
    <View style={styles.preMatchLeaderAvatarFallback}>
      <Text style={styles.preMatchLeaderAvatarFallbackText}>
        {(player?.name ?? '?').slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function renderSection({
  section,
  styles,
  colors,
  t,
}: {
  section: MatchPreMatchSection;
  styles: MatchDetailsTabStyles;
  colors: ThemeColors;
  t: TFunction;
}) {
  if (!section.isAvailable || !section.payload) {
    return null;
  }

  if (section.id === 'winProbability') {
    const payload = section.payload;
    const homePct = Number.parseFloat(payload.home.replace('%', '')) || 0;
    const drawPct = Number.parseFloat(payload.draw.replace('%', '')) || 0;
    const awayPct = Number.parseFloat(payload.away.replace('%', '')) || 0;

    return (
      <View key={section.id} style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.preMatch.winProbability.title')}</Text>

        <View style={styles.preMatchProbContainer}>
          <View style={styles.preMatchProbLabelsRow}>
            <View style={styles.preMatchProbLabelCol}>
              <Text numberOfLines={1} style={styles.preMatchProbTeamName}>{payload.homeTeamName}</Text>
              <Text style={[styles.preMatchProbValue, styles.preMatchProbValueHome]}>{payload.home}</Text>
            </View>
            <View style={[styles.preMatchProbLabelCol, styles.preMatchProbLabelCenter]}>
              <Text style={styles.preMatchProbValue}>{payload.draw}</Text>
              <Text style={styles.metricLabel}>{t('matchDetails.primary.draw')}</Text>
            </View>
            <View style={[styles.preMatchProbLabelCol, styles.preMatchProbLabelRight]}>
              <Text numberOfLines={1} style={styles.preMatchProbTeamName}>{payload.awayTeamName}</Text>
              <Text style={styles.preMatchProbValue}>{payload.away}</Text>
            </View>
          </View>

          <View style={styles.preMatchProbBarRail}>
            {homePct > 0 && <View style={[styles.preMatchProbSegmentHome, { width: `${homePct}%` }]} />}
            {drawPct > 0 && <View style={[styles.preMatchProbSegmentDraw, { width: `${drawPct}%` }]} />}
            {awayPct > 0 && <View style={[styles.preMatchProbSegmentAway, { width: `${awayPct}%` }]} />}
          </View>
        </View>
      </View>
    );
  }

  if (section.id === 'venueWeather') {
    return (
      <MatchVenueWeatherCard
        key={section.id}
        styles={styles}
        colors={colors}
        t={t}
        payload={section.payload}
      />
    );
  }

  if (section.id === 'competitionMeta') {
    return (
      <MatchCompetitionMetaCard
        key={section.id}
        styles={styles}
        colors={colors}
        t={t}
        payload={section.payload}
      />
    );
  }

  if (section.id === 'recentResults') {
    return (
      <MatchRecentResultsCard
        key={section.id}
        styles={styles}
        t={t}
        payload={section.payload}
      />
    );
  }

  if (section.id === 'standings') {
    return (
      <MatchStandingsCard
        key={section.id}
        styles={styles}
        t={t}
        payload={section.payload}
      />
    );
  }

  const payload = section.payload;

  return (
    <View key={section.id} style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.preMatch.leaders.title')}</Text>

      {[
        {
          title: t('matchDetails.preMatch.leaders.topScorer'),
          home: payload.home.topScorer,
          away: payload.away.topScorer,
          getValue: (player: MatchPreMatchLeaderPlayer | null) => player?.goals,
        },
        {
          title: t('matchDetails.preMatch.leaders.topAssister'),
          home: payload.home.topAssister,
          away: payload.away.topAssister,
          getValue: (player: MatchPreMatchLeaderPlayer | null) => player?.assists,
        },
      ].map(item => (
        <View key={item.title} style={styles.preMatchLeadersRow}>
          <View style={styles.preMatchLeaderSide}>
            <LeaderAvatar styles={styles} player={item.home} />
            <View style={styles.preMatchLeaderTextWrap}>
              <Text numberOfLines={1} style={styles.preMatchLeaderName}>
                {item.home?.name ?? t('matchDetails.values.unavailable')}
              </Text>
              <Text style={styles.preMatchLeaderValue}>
                {item.getValue(item.home) ?? '—'}
              </Text>
            </View>
          </View>

          <View style={styles.preMatchLeadersCenter}>
            <Text style={styles.metricLabel}>{item.title}</Text>
          </View>

          <View style={styles.preMatchLeaderSide}>
            <View style={styles.preMatchLeaderTextWrapRight}>
              <Text numberOfLines={1} style={styles.preMatchLeaderNameRight}>
                {item.away?.name ?? t('matchDetails.values.unavailable')}
              </Text>
              <Text style={styles.preMatchLeaderValueRight}>
                {item.getValue(item.away) ?? '—'}
              </Text>
            </View>
            <LeaderAvatar styles={styles} player={item.away} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function MatchPreMatchTab({
  styles,
  sections,
  isLoading,
}: MatchPreMatchTabProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const visibleSections = sections.filter(section => section.isAvailable);

  if (visibleSections.length === 0 && isLoading) {
    return (
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t('matchDetails.preMatch.loading')}</Text>
        </View>
      </View>
    );
  }

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <View style={styles.content}>
      {visibleSections.map(section =>
        renderSection({
          section,
          styles,
          colors,
          t,
        }))}
    </View>
  );
}
