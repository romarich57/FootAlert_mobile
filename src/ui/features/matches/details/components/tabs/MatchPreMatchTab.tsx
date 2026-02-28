import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { formatMatchRound } from '@ui/shared/utils/formatMatchRound';
import { AppImage } from '@ui/shared/media/AppImage';
import type {
  MatchPreMatchLeaderPlayer,
  MatchPreMatchRecentResult,
  MatchPreMatchSection,
} from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type MatchPreMatchTabProps = {
  styles: MatchDetailsTabStyles;
  sections: MatchPreMatchSection[];
  isLoading: boolean;
};

function ResultPill({
  styles,
  result,
  score,
}: {
  styles: MatchDetailsTabStyles;
  result: MatchPreMatchRecentResult['result'];
  score: string | null;
}) {
  const badgeStyle =
    result === 'W'
      ? styles.preMatchResultBadgeWin
      : result === 'L'
        ? styles.preMatchResultBadgeLoss
        : styles.preMatchResultBadgeDraw;

  return (
    <View style={[styles.preMatchResultBadge, badgeStyle]}>
      <Text style={styles.preMatchResultBadgeText}>{score ?? '—'}</Text>
    </View>
  );
}

function TeamLogo({
  styles,
  logo,
  fallback,
}: {
  styles: MatchDetailsTabStyles;
  logo: string | null;
  fallback: string;
}) {
  if (logo) {
    return <AppImage source={{ uri: logo }} style={styles.preMatchTeamLogo} resizeMode="contain" />;
  }

  return (
    <View style={styles.preMatchTeamLogoFallback}>
      <Text style={styles.preMatchTeamLogoFallbackText}>{fallback.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

function TeamRecentColumn({
  styles,
  teamName,
  teamLogo,
  matches,
}: {
  styles: MatchDetailsTabStyles;
  teamName: string;
  teamLogo: string | null;
  matches: MatchPreMatchRecentResult[];
}) {
  return (
    <View style={styles.preMatchRecentColumn}>
      <View style={styles.preMatchRecentTeamHeader}>
        <TeamLogo styles={styles} logo={teamLogo} fallback={teamName} />
        <Text style={styles.preMatchRecentTeamTitle} numberOfLines={1}>
          {teamName}
        </Text>
      </View>
      {matches.map(match => (
        <View key={match.fixtureId} style={styles.preMatchRecentMatchRow}>
          <TeamLogo
            styles={styles}
            logo={match.homeTeamLogo}
            fallback={match.homeTeamName ?? ''}
          />
          <ResultPill styles={styles} result={match.result} score={match.score} />
          <TeamLogo
            styles={styles}
            logo={match.awayTeamLogo}
            fallback={match.awayTeamName ?? ''}
          />
        </View>
      ))}
    </View>
  );
}

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
  t,
}: {
  section: MatchPreMatchSection;
  styles: MatchDetailsTabStyles;
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

        <View style={styles.probBarWrap}>
          <View style={styles.row}>
            <Text style={styles.metricLabel}>{payload.homeTeamName}</Text>
            <Text style={styles.metricValue}>{payload.home}</Text>
          </View>
          <View style={styles.probBarRail}>
            <View style={[styles.probBarFill, { width: `${Math.max(0, Math.min(100, homePct))}%` }]} />
          </View>
        </View>

        <View style={styles.probBarWrap}>
          <View style={styles.row}>
            <Text style={styles.metricLabel}>{t('matchDetails.primary.draw')}</Text>
            <Text style={styles.metricValue}>{payload.draw}</Text>
          </View>
          <View style={styles.probBarRail}>
            <View style={[styles.probBarFill, { width: `${Math.max(0, Math.min(100, drawPct))}%` }]} />
          </View>
        </View>

        <View style={styles.probBarWrap}>
          <View style={styles.row}>
            <Text style={styles.metricLabel}>{payload.awayTeamName}</Text>
            <Text style={styles.metricValue}>{payload.away}</Text>
          </View>
          <View style={styles.probBarRail}>
            <View style={[styles.probBarFill, { width: `${Math.max(0, Math.min(100, awayPct))}%` }]} />
          </View>
        </View>
      </View>
    );
  }

  if (section.id === 'venueWeather') {
    const payload = section.payload;
    const weatherLabel = payload.weather?.description ?? t('matchDetails.values.unavailable');
    const weatherTemp = payload.weather?.temperature;
    const weatherText =
      typeof weatherTemp === 'number'
        ? `${Math.round(weatherTemp)}°C · ${weatherLabel}`
        : weatherLabel;

    return (
      <View key={section.id} style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.preMatch.venueWeather.title')}</Text>

        <View style={styles.row}>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{t('matchDetails.labels.venue')}</Text>
            <Text style={styles.metricValue}>
              {payload.venueName ?? t('matchDetails.values.unavailable')}
            </Text>
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{t('matchDetails.labels.city')}</Text>
            <Text style={styles.metricValue}>
              {payload.venueCity ?? t('matchDetails.values.unavailable')}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{t('matchDetails.labels.capacity')}</Text>
            <Text style={styles.metricValue}>
              {typeof payload.capacity === 'number'
                ? payload.capacity.toLocaleString('fr-FR')
                : t('matchDetails.values.unavailable')}
            </Text>
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{t('matchDetails.labels.surface')}</Text>
            <Text style={styles.metricValue}>
              {payload.surface ?? t('matchDetails.values.unavailable')}
            </Text>
          </View>
        </View>

        <View style={styles.preMatchInlineInfo}>
          <MaterialCommunityIcons name="weather-partly-cloudy" size={18} color="#FACC15" />
          <Text style={styles.newsText}>{weatherText}</Text>
        </View>
      </View>
    );
  }

  if (section.id === 'competitionMeta') {
    const payload = section.payload;
    const roundLabel = payload.competitionRound
      ? formatMatchRound(payload.competitionRound, t)
      : null;

    return (
      <View key={section.id} style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.preMatch.competitionMeta.title')}</Text>

        <View style={styles.preMatchMetaRow}>
          <MaterialCommunityIcons name="trophy-outline" size={16} color="#9CA3AF" />
          <Text style={styles.newsText}>
            {payload.competitionName ?? t('matchDetails.values.unavailable')}
            {payload.competitionType ? ` · ${payload.competitionType}` : ''}
          </Text>
        </View>

        {roundLabel ? (
          <View style={styles.preMatchMetaRow}>
            <MaterialCommunityIcons name="shape-outline" size={16} color="#9CA3AF" />
            <Text style={styles.newsText}>{roundLabel}</Text>
          </View>
        ) : null}

        <View style={styles.preMatchMetaRow}>
          <MaterialCommunityIcons name="calendar-clock-outline" size={16} color="#9CA3AF" />
          <Text style={styles.newsText}>
            {payload.kickoffDisplay ?? t('matchDetails.values.unavailable')}
          </Text>
        </View>

        {payload.referee ? (
          <View style={styles.preMatchMetaRow}>
            <MaterialCommunityIcons name="card-account-details-outline" size={16} color="#9CA3AF" />
            <Text style={styles.newsText}>{payload.referee}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (section.id === 'recentResults') {
    const payload = section.payload;

    return (
      <View key={section.id} style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.preMatch.recentResults.title')}</Text>
        <View style={styles.preMatchRecentColumns}>
          <TeamRecentColumn
            styles={styles}
            teamName={payload.home.teamName}
            teamLogo={payload.home.teamLogo}
            matches={payload.home.matches}
          />
          <TeamRecentColumn
            styles={styles}
            teamName={payload.away.teamName}
            teamLogo={payload.away.teamLogo}
            matches={payload.away.matches}
          />
        </View>
      </View>
    );
  }

  if (section.id === 'standings') {
    const payload = section.payload;

    return (
      <View key={section.id} style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.preMatch.standings.title')}</Text>
        <Text style={styles.cardSubtitle}>
          {payload.competitionName ?? t('matchDetails.values.unavailable')}
        </Text>

        <View style={styles.preMatchStandingsHeader}>
          <Text style={[styles.preMatchStandingsCell, styles.preMatchStandingsCellRank]}>#</Text>
          <Text style={[styles.preMatchStandingsCell, styles.preMatchStandingsCellTeam]}>
            {t('teamDetails.standings.headers.team')}
          </Text>
          <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.played')}</Text>
          <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.win')}</Text>
          <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.draw')}</Text>
          <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.loss')}</Text>
          <Text style={styles.preMatchStandingsCell}>DB</Text>
          <Text style={[styles.preMatchStandingsCell, styles.preMatchStandingsCellPoints]}>
            {t('teamDetails.standings.headers.points')}
          </Text>
        </View>

        {[payload.home, payload.away].map(row => (
          <View key={row.teamId ?? row.teamName ?? 'row'} style={styles.preMatchStandingsRow}>
            <Text style={[styles.preMatchStandingsCellValue, styles.preMatchStandingsCellRank]}>
              {row.rank ?? '—'}
            </Text>
            <View style={[styles.preMatchStandingsTeamCell, styles.preMatchStandingsCellTeam]}>
              <TeamLogo styles={styles} logo={row.teamLogo} fallback={row.teamName ?? ''} />
              <Text style={styles.preMatchStandingsTeamName} numberOfLines={1}>
                {row.teamName ?? t('matchDetails.values.unavailable')}
              </Text>
            </View>
            <Text style={styles.preMatchStandingsCellValue}>{row.played ?? '—'}</Text>
            <Text style={styles.preMatchStandingsCellValue}>{row.win ?? '—'}</Text>
            <Text style={styles.preMatchStandingsCellValue}>{row.draw ?? '—'}</Text>
            <Text style={styles.preMatchStandingsCellValue}>{row.lose ?? '—'}</Text>
            <Text style={styles.preMatchStandingsCellValue}>{row.goalDiff ?? '—'}</Text>
            <Text style={[styles.preMatchStandingsCellValue, styles.preMatchStandingsCellPoints]}>
              {row.points ?? '—'}
            </Text>
          </View>
        ))}
      </View>
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
          t,
        }))}
    </View>
  );
}
