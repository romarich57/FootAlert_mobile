import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { JsonResults } from '@/components/JsonResults';
import { QueryState } from '@/components/QueryState';
import { readServices } from '@/lib/services';

export function FollowsPage() {
  const [leagueIds, setLeagueIds] = useState('39,140,78,61,135,2,3');
  const [season, setSeason] = useState(new Date().getFullYear().toString());

  const teamsTrendsQuery = useQuery({
    queryKey: ['web.follows.trends.teams', leagueIds, season],
    queryFn: () => readServices.follows.fetchTeamsTrends(leagueIds, Number(season)),
    enabled: Boolean(leagueIds && season),
  });

  const playersTrendsQuery = useQuery({
    queryKey: ['web.follows.trends.players', leagueIds, season],
    queryFn: () => readServices.follows.fetchPlayersTrends(leagueIds, Number(season)),
    enabled: Boolean(leagueIds && season),
  });

  const isLoading = teamsTrendsQuery.isLoading || playersTrendsQuery.isLoading;
  const isError = teamsTrendsQuery.isError || playersTrendsQuery.isError;
  const error = teamsTrendsQuery.error ?? playersTrendsQuery.error;

  const sections = useMemo(
    () => [
      { section: 'teamsTrends', payload: teamsTrendsQuery.data ?? [] },
      { section: 'playersTrends', payload: playersTrendsQuery.data ?? [] },
    ],
    [teamsTrendsQuery.data, playersTrendsQuery.data],
  );

  return (
    <>
      <div className="content-card">
        <h2>Follows</h2>
        <p>Read flows: <code>/v1/follows/trends/*</code></p>

        <div className="form-row">
          <div className="field">
            <label>League IDs (comma separated)</label>
            <input value={leagueIds} onChange={event => setLeagueIds(event.target.value)} />
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

      {!isLoading && !isError ? <JsonResults title="Follows payload" items={sections} /> : null}
    </>
  );
}
