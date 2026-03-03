import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { TFunction } from 'i18next';

import { formatMatchRound } from '@ui/shared/utils/formatMatchRound';
import { AppImage } from '@ui/shared/media/AppImage';
import { AppPressable } from '@ui/shared/components';
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
  teamId,
  teamLogo,
  matches,
  onPressMatch,
  onPressTeam,
}: {
  styles: MatchDetailsTabStyles;
  teamName: string;
  teamId: string | null;
  teamLogo: string | null;
  matches: MatchPreMatchRecentResult[];
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
}) {
  return (
    <View style={styles.preMatchRecentColumn}>
      {teamId && onPressTeam ? (
        <AppPressable
          style={styles.preMatchRecentTeamHeader}
          onPress={() => onPressTeam(teamId)}
          accessibilityRole='button'
          accessibilityLabel={teamName}
        >
          <MatchTeamLogo styles={styles} logo={teamLogo} fallback={teamName} />
          <Text style={styles.preMatchRecentTeamTitle} numberOfLines={1}>
            {teamName}
          </Text>
        </AppPressable>
      ) : (
        <View style={styles.preMatchRecentTeamHeader}>
          <MatchTeamLogo styles={styles} logo={teamLogo} fallback={teamName} />
          <Text style={styles.preMatchRecentTeamTitle} numberOfLines={1}>
            {teamName}
          </Text>
        </View>
      )}
      {matches.map(match => (
        <View key={match.fixtureId} style={styles.preMatchRecentMatchRow}>
          {match.homeTeamId && onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(match.homeTeamId ?? '')}
              accessibilityRole='button'
              accessibilityLabel={match.homeTeamName ?? teamName}
            >
              <MatchTeamLogo
                styles={styles}
                logo={match.homeTeamLogo}
                fallback={match.homeTeamName ?? ''}
              />
            </AppPressable>
          ) : (
            <MatchTeamLogo
              styles={styles}
              logo={match.homeTeamLogo}
              fallback={match.homeTeamName ?? ''}
            />
          )}
          {onPressMatch ? (
            <AppPressable
              onPress={() => onPressMatch(match.fixtureId)}
              accessibilityRole='button'
              accessibilityLabel={match.score ?? match.fixtureId}
            >
              <ResultPill styles={styles} result={match.result} score={match.score} />
            </AppPressable>
          ) : (
            <ResultPill styles={styles} result={match.result} score={match.score} />
          )}
          {match.awayTeamId && onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(match.awayTeamId ?? '')}
              accessibilityRole='button'
              accessibilityLabel={match.awayTeamName ?? teamName}
            >
              <MatchTeamLogo
                styles={styles}
                logo={match.awayTeamLogo}
                fallback={match.awayTeamName ?? ''}
              />
            </AppPressable>
          ) : (
            <MatchTeamLogo
              styles={styles}
              logo={match.awayTeamLogo}
              fallback={match.awayTeamName ?? ''}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function TeamUpcomingColumn({
  styles,
  t,
  teamName,
  teamId,
  teamLogo,
  matches,
  onPressMatch,
  onPressTeam,
}: {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  teamName: string;
  teamId: string | null;
  teamLogo: string | null;
  matches: MatchPostMatchUpcomingMatchesPayload['home']['matches'];
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
}) {
  return (
    <View style={styles.preMatchRecentColumn}>
      {teamId && onPressTeam ? (
        <AppPressable
          style={styles.preMatchRecentTeamHeader}
          onPress={() => onPressTeam(teamId)}
          accessibilityRole='button'
          accessibilityLabel={teamName}
        >
          <MatchTeamLogo styles={styles} logo={teamLogo} fallback={teamName} />
          <Text style={styles.preMatchRecentTeamTitle} numberOfLines={1}>
            {teamName}
          </Text>
        </AppPressable>
      ) : (
        <View style={styles.preMatchRecentTeamHeader}>
          <MatchTeamLogo styles={styles} logo={teamLogo} fallback={teamName} />
          <Text style={styles.preMatchRecentTeamTitle} numberOfLines={1}>
            {teamName}
          </Text>
        </View>
      )}

      {matches.map(match => (
        <View key={match.fixtureId} style={styles.preMatchRecentMatchRow}>
          {match.homeTeamId && onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(match.homeTeamId ?? '')}
              accessibilityRole='button'
              accessibilityLabel={match.homeTeamName ?? teamName}
            >
              <MatchTeamLogo
                styles={styles}
                logo={match.homeTeamLogo}
                fallback={match.homeTeamName ?? ''}
              />
            </AppPressable>
          ) : (
            <MatchTeamLogo
              styles={styles}
              logo={match.homeTeamLogo}
              fallback={match.homeTeamName ?? ''}
            />
          )}
          {onPressMatch ? (
            <AppPressable
              style={styles.postMatchUpcomingInfo}
              onPress={() => onPressMatch(match.fixtureId)}
              accessibilityRole='button'
              accessibilityLabel={`${match.homeTeamName ?? '—'} vs ${match.awayTeamName ?? '—'}`}
            >
              <Text numberOfLines={1} style={styles.newsText}>
                {match.homeTeamName ?? '—'} vs {match.awayTeamName ?? '—'}
              </Text>
              <Text numberOfLines={1} style={styles.postMatchUpcomingMeta}>
                {match.kickoffDisplay ?? t('matchDetails.values.unavailable')}
              </Text>
            </AppPressable>
          ) : (
            <View style={styles.postMatchUpcomingInfo}>
              <Text numberOfLines={1} style={styles.newsText}>
                {match.homeTeamName ?? '—'} vs {match.awayTeamName ?? '—'}
              </Text>
              <Text numberOfLines={1} style={styles.postMatchUpcomingMeta}>
                {match.kickoffDisplay ?? t('matchDetails.values.unavailable')}
              </Text>
            </View>
          )}
          {match.awayTeamId && onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(match.awayTeamId ?? '')}
              accessibilityRole='button'
              accessibilityLabel={match.awayTeamName ?? teamName}
            >
              <MatchTeamLogo
                styles={styles}
                logo={match.awayTeamLogo}
                fallback={match.awayTeamName ?? ''}
              />
            </AppPressable>
          ) : (
            <MatchTeamLogo
              styles={styles}
              logo={match.awayTeamLogo}
              fallback={match.awayTeamName ?? ''}
            />
          )}
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
  onPressCompetition,
}: {
  styles: MatchDetailsTabStyles;
  colors: ThemeColors;
  t: TFunction;
  payload: MatchPreMatchCompetitionMetaPayload;
  onPressCompetition?: (competitionId: string) => void;
}) {
  const roundLabel = payload.competitionRound
    ? formatMatchRound(payload.competitionRound, t)
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.preMatch.competitionMeta.title')}</Text>

      <View style={styles.preMatchGridContainer}>
        {payload.competitionId && onPressCompetition ? (
          <AppPressable
            style={[styles.preMatchGridItem, styles.preMatchGridItemFull]}
            onPress={() => onPressCompetition(payload.competitionId ?? '')}
            accessibilityRole='button'
            accessibilityLabel={payload.competitionName ?? t('matchDetails.values.unavailable')}
          >
            <View style={styles.preMatchGridIconRow}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.primary} />
              <Text style={styles.preMatchGridLabel}>{t('matchDetails.labels.league')}</Text>
            </View>
            <Text style={styles.preMatchGridValue}>
              {payload.competitionName ?? t('matchDetails.values.unavailable')}
              {payload.competitionType ? ` · ${payload.competitionType}` : ''}
            </Text>
          </AppPressable>
        ) : (
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
        )}

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
  onPressTeam,
}: {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  payload: MatchPreMatchStandingsPayload;
  onPressTeam?: (teamId: string) => void;
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
        <Text style={styles.preMatchStandingsCell}>{t('teamDetails.standings.headers.goalDiff')}</Text>
        <Text style={[styles.preMatchStandingsCell, styles.preMatchStandingsCellPoints]}>
          {t('teamDetails.standings.headers.points')}
        </Text>
      </View>

      {[payload.home, payload.away].map(row => (
        <View key={row.teamId ?? row.teamName ?? 'row'} style={styles.preMatchStandingsRow}>
          <Text style={[styles.preMatchStandingsCellValue, styles.preMatchStandingsCellRank]}>
            {row.rank ?? '—'}
          </Text>
          {row.teamId && onPressTeam ? (
            <AppPressable
              style={[styles.preMatchStandingsTeamCell, styles.preMatchStandingsCellTeam]}
              onPress={() => onPressTeam(row.teamId ?? '')}
              accessibilityRole='button'
              accessibilityLabel={row.teamName ?? t('matchDetails.values.unavailable')}
            >
              <MatchTeamLogo styles={styles} logo={row.teamLogo} fallback={row.teamName ?? ''} />
              <Text style={styles.preMatchStandingsTeamName} numberOfLines={1}>
                {row.teamName ?? t('matchDetails.values.unavailable')}
              </Text>
            </AppPressable>
          ) : (
            <View style={[styles.preMatchStandingsTeamCell, styles.preMatchStandingsCellTeam]}>
              <MatchTeamLogo styles={styles} logo={row.teamLogo} fallback={row.teamName ?? ''} />
              <Text style={styles.preMatchStandingsTeamName} numberOfLines={1}>
                {row.teamName ?? t('matchDetails.values.unavailable')}
              </Text>
            </View>
          )}
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
  onPressMatch,
  onPressTeam,
}: {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  payload: MatchPreMatchRecentResultsPayload;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.preMatch.recentResults.title')}</Text>
      <View style={styles.preMatchRecentColumns}>
        <TeamRecentColumn
          styles={styles}
          teamName={payload.home.teamName}
          teamId={payload.home.teamId}
          teamLogo={payload.home.teamLogo}
          matches={payload.home.matches}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
        />
        <TeamRecentColumn
          styles={styles}
          teamName={payload.away.teamName}
          teamId={payload.away.teamId}
          teamLogo={payload.away.teamLogo}
          matches={payload.away.matches}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
        />
      </View>
    </View>
  );
}

export function MatchUpcomingMatchesCard({
  styles,
  t,
  payload,
  onPressMatch,
  onPressTeam,
}: {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  payload: MatchPostMatchUpcomingMatchesPayload;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('matchDetails.postMatch.upcomingMatches.title')}</Text>
      <View style={styles.preMatchRecentColumns}>
        <TeamUpcomingColumn
          styles={styles}
          t={t}
          teamName={payload.home.teamName}
          teamId={payload.home.teamId}
          teamLogo={payload.home.teamLogo}
          matches={payload.home.matches}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
        />
        <TeamUpcomingColumn
          styles={styles}
          t={t}
          teamName={payload.away.teamName}
          teamId={payload.away.teamId}
          teamLogo={payload.away.teamLogo}
          matches={payload.away.matches}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
        />
      </View>
    </View>
  );
}
