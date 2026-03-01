import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { TFunction } from 'i18next';

import { formatMatchRound } from '@ui/shared/utils/formatMatchRound';
import { AppImage } from '@ui/shared/media/AppImage';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type {
  MatchPostMatchUpcomingMatchesPayload,
  MatchPreMatchCompetitionMetaPayload,
  MatchPreMatchRecentResult,
  MatchPreMatchRecentResultsPayload,
  MatchPreMatchStandingsPayload,
  MatchPreMatchVenueWeatherPayload,
} from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

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

function formatLocaleNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function MatchTeamLogo({
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
        <MatchTeamLogo styles={styles} logo={teamLogo} fallback={teamName} />
        <Text style={styles.preMatchRecentTeamTitle} numberOfLines={1}>
          {teamName}
        </Text>
      </View>
      {matches.map(match => (
        <View key={match.fixtureId} style={styles.preMatchRecentMatchRow}>
          <MatchTeamLogo
            styles={styles}
            logo={match.homeTeamLogo}
            fallback={match.homeTeamName ?? ''}
          />
          <ResultPill styles={styles} result={match.result} score={match.score} />
          <MatchTeamLogo
            styles={styles}
            logo={match.awayTeamLogo}
            fallback={match.awayTeamName ?? ''}
          />
        </View>
      ))}
    </View>
  );
}

function TeamUpcomingColumn({
  styles,
  t,
  teamName,
  teamLogo,
  matches,
}: {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  teamName: string;
  teamLogo: string | null;
  matches: MatchPostMatchUpcomingMatchesPayload['home']['matches'];
}) {
  return (
    <View style={styles.preMatchRecentColumn}>
      <View style={styles.preMatchRecentTeamHeader}>
        <MatchTeamLogo styles={styles} logo={teamLogo} fallback={teamName} />
        <Text style={styles.preMatchRecentTeamTitle} numberOfLines={1}>
          {teamName}
        </Text>
      </View>

      {matches.map(match => (
        <View key={match.fixtureId} style={styles.preMatchRecentMatchRow}>
          <MatchTeamLogo
            styles={styles}
            logo={match.homeTeamLogo}
            fallback={match.homeTeamName ?? ''}
          />
          <View style={styles.postMatchUpcomingInfo}>
            <Text numberOfLines={1} style={styles.newsText}>
              {match.homeTeamName ?? '—'} vs {match.awayTeamName ?? '—'}
            </Text>
            <Text numberOfLines={1} style={styles.postMatchUpcomingMeta}>
              {match.kickoffDisplay ?? t('matchDetails.values.unavailable')}
            </Text>
          </View>
          <MatchTeamLogo
            styles={styles}
            logo={match.awayTeamLogo}
            fallback={match.awayTeamName ?? ''}
          />
        </View>
      ))}
    </View>
  );
}

export function MatchVenueWeatherCard({
  styles,
  colors,
  t,
  locale,
  payload,
}: {
  styles: MatchDetailsTabStyles;
  colors: ThemeColors;
  t: TFunction;
  locale: string;
  payload: MatchPreMatchVenueWeatherPayload;
}) {
  const weatherLabel = payload.weather?.description ?? null;
  const weatherTemp = payload.weather?.temperature;
  const hasCapacity = typeof payload.capacity === 'number';
  const hasSurface = Boolean(payload.surface);
  const hasWeather = typeof weatherTemp === 'number' || Boolean(weatherLabel);
  const weatherText =
    typeof weatherTemp === 'number' && weatherLabel
      ? `${Math.round(weatherTemp)}°C · ${weatherLabel}`
      : typeof weatherTemp === 'number'
        ? `${Math.round(weatherTemp)}°C`
        : (weatherLabel ?? '');

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.preMatch.venueWeather.title')}</Text>

      <View style={styles.preMatchGridContainer}>
        <View style={styles.preMatchGridItem}>
          <View style={styles.preMatchGridIconRow}>
            <MaterialCommunityIcons name="stadium-variant" size={18} color={colors.primary} />
            <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.venue')}</Text>
          </View>
          <Text style={styles.preMatchGridValue} numberOfLines={1}>
            {payload.venueName ?? t('matchDetails.values.unavailable')}
          </Text>
        </View>

        <View style={styles.preMatchGridItem}>
          <View style={styles.preMatchGridIconRow}>
            <MaterialCommunityIcons name="city-variant" size={18} color={colors.primary} />
            <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.city')}</Text>
          </View>
          <Text style={styles.preMatchGridValue} numberOfLines={1}>
            {payload.venueCity ?? t('matchDetails.values.unavailable')}
          </Text>
        </View>

        {hasCapacity ? (
          <View style={styles.preMatchGridItem}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="account-group" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.capacity')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>{formatLocaleNumber(payload.capacity ?? 0, locale)}</Text>
          </View>
        ) : null}

        {hasSurface ? (
          <View style={styles.preMatchGridItem}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="grass" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.surface')}</Text>
            </View>
            <Text style={styles.preMatchGridValue} numberOfLines={1}>{payload.surface}</Text>
          </View>
        ) : null}

        {hasWeather ? (
          <View style={[styles.preMatchGridItem, styles.preMatchGridItemFull]}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="weather-partly-cloudy" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.preMatch.venueWeather.title')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>{weatherText}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function MatchCompetitionMetaCard({
  styles,
  colors,
  t,
  payload,
}: {
  styles: MatchDetailsTabStyles;
  colors: ThemeColors;
  t: TFunction;
  payload: MatchPreMatchCompetitionMetaPayload;
}) {
  const roundLabel = payload.competitionRound
    ? formatMatchRound(payload.competitionRound, t)
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.preMatch.competitionMeta.title')}</Text>

      <View style={styles.preMatchGridContainer}>
        <View style={[styles.preMatchGridItem, styles.preMatchGridItemFull]}>
          <View style={styles.preMatchGridIconRow}>
            <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.primary} />
            <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.league')}</Text>
          </View>
          <Text style={styles.preMatchGridValue}>
            {payload.competitionName ?? t('matchDetails.values.unavailable')}
            {payload.competitionType ? ` · ${payload.competitionType}` : ''}
          </Text>
        </View>

        {roundLabel ? (
          <View style={styles.preMatchGridItem}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="shape-outline" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.roundTitle')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>{roundLabel}</Text>
          </View>
        ) : null}

        {payload.referee ? (
          <View style={styles.preMatchGridItem}>
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="card-account-details-outline" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.referee')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>{payload.referee}</Text>
          </View>
        ) : null}

        <View style={[styles.preMatchGridItem, styles.preMatchGridItemFull]}>
          <View style={styles.preMatchGridIconRow}>
            <MaterialCommunityIcons name="calendar-clock-outline" size={18} color={colors.primary} />
            <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.date')}</Text>
          </View>
          <Text style={styles.preMatchGridValue}>
            {payload.kickoffDisplay ?? t('matchDetails.values.unavailable')}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function MatchStandingsCard({
  styles,
  t,
  payload,
}: {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  payload: MatchPreMatchStandingsPayload;
}) {
  return (
    <View style={styles.card}>
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
            <MatchTeamLogo styles={styles} logo={row.teamLogo} fallback={row.teamName ?? ''} />
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

export function MatchRecentResultsCard({
  styles,
  t,
  payload,
}: {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  payload: MatchPreMatchRecentResultsPayload;
}) {
  return (
    <View style={styles.card}>
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

export function MatchUpcomingMatchesCard({
  styles,
  t,
  payload,
}: {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  payload: MatchPostMatchUpcomingMatchesPayload;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.postMatch.upcomingMatches.title')}</Text>
      <View style={styles.preMatchRecentColumns}>
        <TeamUpcomingColumn
          styles={styles}
          t={t}
          teamName={payload.home.teamName}
          teamLogo={payload.home.teamLogo}
          matches={payload.home.matches}
        />
        <TeamUpcomingColumn
          styles={styles}
          t={t}
          teamName={payload.away.teamName}
          teamLogo={payload.away.teamLogo}
          matches={payload.away.matches}
        />
      </View>
    </View>
  );
}
