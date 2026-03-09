import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { resolveAppLocaleTag } from '@ui/shared/i18n/locale';
import { MatchPrimaryPreMatchSection } from '@ui/features/matches/details/components/tabs/components/primary/MatchPrimaryPreMatchSection';
import { MatchPrimaryLiveSection } from '@ui/features/matches/details/components/tabs/components/primary/MatchPrimaryLiveSection';
import { MatchPrimaryFinishedSummary } from '@ui/features/matches/details/components/tabs/components/primary/MatchPrimaryFinishedSummary';
import type { MatchPrimaryTabProps } from '@ui/features/matches/details/components/tabs/components/primary/MatchPrimaryTab.types';
import { buildMatchPrimaryViewModel } from '@ui/features/matches/details/components/tabs/mappers/buildMatchPrimaryViewModel';

export function MatchPrimaryTab({
  styles,
  lifecycleState,
  homeTeamName,
  awayTeamName,
  winPercent,
  venueName,
  venueCity,
  competitionName,
  insightText,
  isLiveRefreshing,
  statRows,
  eventRows,
  finalScorers,
  postMatchTab,
  matchScore,
  statsError = false,
  statsErrorReason = 'none',
  eventsError = false,
  eventsErrorReason = 'none',
  predictionsError = false,
  predictionsErrorReason = 'none',
  onPressMatch,
  onPressTeam,
  onPressPlayer,
  onPressCompetition,
}: MatchPrimaryTabProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const locale = resolveAppLocaleTag(i18n.language);
  const {
    homePct,
    drawPct,
    awayPct,
    statsErrorKey,
    eventsErrorKey,
    predictionsErrorKey,
    homeScorers,
    awayScorers,
    keyMomentsRows,
    postMatchSections,
  } = buildMatchPrimaryViewModel({
    winPercent,
    statsErrorReason,
    eventsErrorReason,
    predictionsErrorReason,
    finalScorers,
    eventRows,
    postMatchTab,
  });

  return (
    <View style={styles.content} testID="match-primary-tab">
      {lifecycleState === 'pre_match' ? (
        <MatchPrimaryPreMatchSection
          styles={styles}
          t={t}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homePct={homePct}
          drawPct={drawPct}
          awayPct={awayPct}
          homeValue={winPercent.home}
          drawValue={winPercent.draw}
          awayValue={winPercent.away}
          venueName={venueName}
          venueCity={venueCity}
          competitionName={competitionName}
          insightText={insightText}
          predictionsError={predictionsError}
          predictionsErrorKey={predictionsErrorKey}
        />
      ) : null}

      {lifecycleState === 'live' ? (
        <MatchPrimaryLiveSection
          styles={styles}
          t={t}
          isLiveRefreshing={isLiveRefreshing}
          statRows={statRows}
          eventRows={eventRows}
          statsError={statsError}
          statsErrorKey={statsErrorKey}
          eventsError={eventsError}
          eventsErrorKey={eventsErrorKey}
          venueName={venueName}
          venueCity={venueCity}
        />
      ) : null}

      {lifecycleState === 'finished' ? (
        <MatchPrimaryFinishedSummary
          styles={styles}
          colors={colors}
          t={t}
          locale={locale}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          matchScore={matchScore}
          homeScorers={homeScorers}
          awayScorers={awayScorers}
          statRows={statRows}
          keyMomentsRows={keyMomentsRows}
          postMatchSections={postMatchSections}
          statsError={statsError}
          statsErrorKey={statsErrorKey}
          eventsError={eventsError}
          eventsErrorKey={eventsErrorKey}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
          onPressPlayer={onPressPlayer}
          onPressCompetition={onPressCompetition}
        />
      ) : null}
    </View>
  );
}
