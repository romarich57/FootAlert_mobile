import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { JsonResults } from '@/components/JsonResults';
import { QueryState } from '@/components/QueryState';
import { truncateJsonList } from '@/lib/format';
import { readServices } from '@/lib/services';

export function CompetitionsPage() {
  const [competitionId, setCompetitionId] = useState('39');
  const [season, setSeason] = useState(new Date().getFullYear().toString());

  const listQuery = useQuery({
    queryKey: ['web.competitions.list'],
    queryFn: () => readServices.competitions.fetchAllLeagues(),
  });

  const standingsQuery = useQuery({
    queryKey: ['web.competitions.standings', competitionId, season],
    queryFn: () => readServices.competitions.fetchLeagueStandings(Number(competitionId), Number(season)),
    enabled: Boolean(competitionId && season),
  });

  const matchesQuery = useQuery({
    queryKey: ['web.competitions.matches', competitionId, season],
    queryFn: () => readServices.competitions.fetchLeagueFixtures(Number(competitionId), Number(season)),
    enabled: Boolean(competitionId && season),
  });

  const isLoading = listQuery.isLoading || standingsQuery.isLoading || matchesQuery.isLoading;
  const isError = listQuery.isError || standingsQuery.isError || matchesQuery.isError;
  const error = listQuery.error ?? standingsQuery.error ?? matchesQuery.error;

  const sections = useMemo(
    () => [
      { section: 'allCompetitions', payload: truncateJsonList(listQuery.data ?? [], 12) },
      { section: 'competitionStandings', payload: standingsQuery.data },
      { section: 'competitionMatches', payload: truncateJsonList(matchesQuery.data ?? [], 8) },
    ],
    [listQuery.data, standingsQuery.data, matchesQuery.data],
  );

  return (
    <>
      <div className="content-card">
        <h2>Competitions</h2>
        <p>Read flows: <code>/v1/competitions/*</code></p>

        <div className="form-row">
          <div className="field">
            <label>Competition ID</label>
            <input value={competitionId} onChange={event => setCompetitionId(event.target.value)} />
          </div>
          <div className="field">
            <label>Season</label>
            <input value={season} onChange={event => setSeason(event.target.value)} />
          </div>
        </div>

        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!isLoading && !isError && sections.length === 0}
        />
      </div>

      {!isLoading && !isError ? <JsonResults title="Competitions payload" items={sections} /> : null}
    </>
  );
}
