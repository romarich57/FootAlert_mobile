import type { MatchPrimaryPostMatchSection } from '@ui/features/matches/details/components/tabs/components/primary/MatchPrimaryTab.types';
import type { MatchPrimaryTabProps } from '@ui/features/matches/details/components/tabs/components/primary/MatchPrimaryTab.types';

type BuildMatchPrimaryViewModelParams = Pick<
  MatchPrimaryTabProps,
  | 'winPercent'
  | 'statsErrorReason'
  | 'eventsErrorReason'
  | 'predictionsErrorReason'
  | 'finalScorers'
  | 'eventRows'
  | 'postMatchTab'
>;

export function buildMatchPrimaryViewModel({
  winPercent,
  statsErrorReason,
  eventsErrorReason,
  predictionsErrorReason,
  finalScorers,
  eventRows,
  postMatchTab,
}: BuildMatchPrimaryViewModelParams) {
  const homePct = Number.parseFloat(winPercent.home.replace('%', '')) || 0;
  const drawPct = Number.parseFloat(winPercent.draw.replace('%', '')) || 0;
  const awayPct = Number.parseFloat(winPercent.away.replace('%', '')) || 0;

  const statsErrorKey =
    statsErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.statistics'
      : 'matchDetails.states.datasetErrors.statistics';
  const eventsErrorKey =
    eventsErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.events'
      : 'matchDetails.states.datasetErrors.events';
  const predictionsErrorKey =
    predictionsErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.predictions'
      : 'matchDetails.states.datasetErrors.predictions';

  return {
    homePct,
    drawPct,
    awayPct,
    statsErrorKey,
    eventsErrorKey,
    predictionsErrorKey,
    homeScorers: finalScorers.filter(row => row.team === 'home'),
    awayScorers: finalScorers.filter(row => row.team === 'away'),
    keyMomentsRows: eventRows.slice(0, 6),
    postMatchSections: (postMatchTab?.sectionsOrdered ?? []).filter(
      (section): section is MatchPrimaryPostMatchSection => section.isAvailable,
    ),
  };
}
