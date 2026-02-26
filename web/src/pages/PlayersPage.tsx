import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { JsonResults } from '@/components/JsonResults';
import { QueryState } from '@/components/QueryState';
import { readServices } from '@/lib/services';

export function PlayersPage() {
  const [playerId, setPlayerId] = useState('276');
  const [teamId, setTeamId] = useState('33');
  const [season, setSeason] = useState(new Date().getFullYear().toString());

  const detailsQuery = useQuery({
    queryKey: ['web.player.details', playerId, season],
    queryFn: () => readServices.players.fetchPlayerDetails(playerId, Number(season)),
    enabled: Boolean(playerId && season),
  });

  const trophiesQuery = useQuery({
    queryKey: ['web.player.trophies', playerId],
    queryFn: () => readServices.players.fetchPlayerTrophies(playerId),
    enabled: Boolean(playerId),
  });

  const matchesQuery = useQuery({
    queryKey: ['web.player.matches', playerId, teamId, season],
    queryFn: () =>
      readServices.players.fetchPlayerMatchesAggregate(playerId, teamId, Number(season)),
    enabled: Boolean(playerId && teamId && season),
  });

  const isLoading = detailsQuery.isLoading || trophiesQuery.isLoading || matchesQuery.isLoading;
  const isError = detailsQuery.isError || trophiesQuery.isError || matchesQuery.isError;
  const error = detailsQuery.error ?? trophiesQuery.error ?? matchesQuery.error;

  const response = useMemo(
    () => [
      { section: 'playerDetails', payload: detailsQuery.data },
      { section: 'playerTrophies', payload: trophiesQuery.data ?? [] },
      { section: 'playerMatches', payload: matchesQuery.data ?? [] },
    ],
    [detailsQuery.data, trophiesQuery.data, matchesQuery.data],
  );

  return (
    <>
      <div className="content-card">
        <h2>Players</h2>
        <p>Read flows: <code>/v1/players/*</code></p>

        <div className="form-row">
          <div className="field">
            <label>Player ID</label>
            <input value={playerId} onChange={event => setPlayerId(event.target.value)} />
          </div>
          <div className="field">
            <label>Team ID</label>
            <input value={teamId} onChange={event => setTeamId(event.target.value)} />
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
          isEmpty={!isLoading && !isError && !detailsQuery.data && (trophiesQuery.data ?? []).length === 0}
        />
      </div>

      {!isLoading && !isError ? <JsonResults title="Players payload" items={response} /> : null}
    </>
  );
}
