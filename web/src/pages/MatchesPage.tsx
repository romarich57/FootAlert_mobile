import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { JsonResults } from '@/components/JsonResults';
import { QueryState } from '@/components/QueryState';
import { truncateJsonList } from '@/lib/format';
import { readServices } from '@/lib/services';

function defaultDate() {
  return new Date().toISOString().slice(0, 10);
}

export function MatchesPage() {
  const [date, setDate] = useState(defaultDate);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris');

  const query = useQuery({
    queryKey: ['web.matches', date, timezone],
    queryFn: () => readServices.matches.fetchFixturesByDate({ date, timezone }),
  });

  const items = useMemo(() => truncateJsonList(query.data ?? []), [query.data]);

  return (
    <>
      <div className="content-card">
        <h2>Matches</h2>
        <p>Read flow: <code>GET /v1/matches</code></p>
        <div className="form-row">
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={event => setDate(event.target.value)} />
          </div>
          <div className="field">
            <label>Timezone</label>
            <input value={timezone} onChange={event => setTimezone(event.target.value)} />
          </div>
        </div>

        <QueryState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!query.isLoading && !query.isError && items.length === 0}
        />
      </div>

      {items.length > 0 ? <JsonResults title="Matches payload" items={items} /> : null}
    </>
  );
}
