import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { JsonResults } from '@/components/JsonResults';
import { QueryState } from '@/components/QueryState';
import { readServices } from '@/lib/services';

export function TeamsPage() {
  const [teamId, setTeamId] = useState('33');
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [leagueId, setLeagueId] = useState('39');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris');

  const detailsQuery = useQuery({
    queryKey: ['web.team.details', teamId],
    queryFn: () => readServices.teams.fetchTeamDetails(teamId),
    enabled: Boolean(teamId),
  });

  const fixturesQuery = useQuery({
    queryKey: ['web.team.fixtures', teamId, season, timezone, leagueId],
    queryFn: () =>
      readServices.teams.fetchTeamFixtures({
        teamId,
        season: Number(season),
        timezone,
        leagueId,
      }),
    enabled: Boolean(teamId && season && timezone),
  });

  const standingsQuery = useQuery({
    queryKey: ['web.team.standings', leagueId, season],
    queryFn: () => readServices.teams.fetchLeagueStandings(leagueId, Number(season)),
    enabled: Boolean(leagueId && season),
  });

  const isLoading = detailsQuery.isLoading || fixturesQuery.isLoading || standingsQuery.isLoading;
  const isError = detailsQuery.isError || fixturesQuery.isError || standingsQuery.isError;
  const error = detailsQuery.error ?? fixturesQuery.error ?? standingsQuery.error;

  const response = useMemo(
    () => [
      { section: 'teamDetails', payload: detailsQuery.data },
      { section: 'teamFixtures', payload: fixturesQuery.data ?? [] },
      { section: 'leagueStandings', payload: standingsQuery.data },
    ],
    [detailsQuery.data, fixturesQuery.data, standingsQuery.data],
  );

  return (
    <>
      <div className="content-card">
        <h2>Teams</h2>
        <p>Read flows: <code>/v1/teams/*</code> and <code>/v1/teams/standings</code></p>
        <div className="form-row">
          <div className="field">
            <label>Team ID</label>
            <input value={teamId} onChange={event => setTeamId(event.target.value)} />
          </div>
          <div className="field">
            <label>Season</label>
            <input value={season} onChange={event => setSeason(event.target.value)} />
          </div>
          <div className="field">
            <label>League ID</label>
            <input value={leagueId} onChange={event => setLeagueId(event.target.value)} />
          </div>
          <div className="field">
            <label>Timezone</label>
            <input value={timezone} onChange={event => setTimezone(event.target.value)} />
          </div>
        </div>

        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!isLoading && !isError && !detailsQuery.data && (fixturesQuery.data ?? []).length === 0}
        />
      </div>

      {!isLoading && !isError ? <JsonResults title="Teams payload" items={response} /> : null}
    </>
  );
}
