import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { JsonResults } from '@/components/JsonResults';
import { QueryState } from '@/components/QueryState';
import { readServices } from '@/lib/services';

export function SearchPage() {
  const [tab, setTab] = useState<'teams' | 'players'>('teams');
  const [query, setQuery] = useState('paris');

  const searchQuery = useQuery({
    queryKey: ['web.search', tab, query],
    queryFn: () =>
      tab === 'teams'
        ? readServices.follows.searchTeams(query)
        : readServices.follows.searchPlayers(query),
    enabled: query.trim().length >= 2,
  });

  const items = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  return (
    <>
      <div className="content-card">
        <h2>Search</h2>
        <p>Read flows: <code>/v1/follows/search/teams</code> and <code>/v1/follows/search/players</code></p>

        <div className="form-row">
          <div className="field">
            <label>Entity</label>
            <select value={tab} onChange={event => setTab(event.target.value as 'teams' | 'players')}>
              <option value="teams">Teams</option>
              <option value="players">Players</option>
            </select>
          </div>

          <div className="field">
            <label>Query</label>
            <input value={query} onChange={event => setQuery(event.target.value)} />
          </div>
        </div>

        <QueryState
          isLoading={searchQuery.isLoading}
          isError={searchQuery.isError}
          error={searchQuery.error}
          isEmpty={!searchQuery.isLoading && !searchQuery.isError && items.length === 0}
        />
      </div>

      {items.length > 0 ? <JsonResults title="Search payload" items={items} /> : null}
    </>
  );
}
