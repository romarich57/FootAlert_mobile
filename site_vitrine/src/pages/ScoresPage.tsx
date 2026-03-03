import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ScoresPanel } from '@/features/scores/components/ScoresPanel';
import { fetchScoreCards } from '@/features/scores/api';
import { toIsoDate } from '@/lib/date';
import { usePageMeta } from '@/lib/seo';

const SCORES_LIMIT = 20;
const DEFAULT_TIMEZONE = 'Europe/Paris';

export function ScoresPage() {
  usePageMeta({
    title: 'Scores en direct | FootAlert',
    description:
      'Consulte les scores du jour en un coup d’oeil: équipes, score, statut et horaire de match.',
    path: '/scores',
  });

  const [date, setDate] = useState(toIsoDate(new Date()));
  const [timezone] = useState(DEFAULT_TIMEZONE);

  const query = useQuery({
    queryKey: ['scores', date, timezone],
    queryFn: ({ signal }) =>
      fetchScoreCards({
        date,
        timezone,
        limit: SCORES_LIMIT,
        signal,
      }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const state = useMemo<'loading' | 'error' | 'empty' | 'ready'>(() => {
    if (query.isLoading) {
      return 'loading';
    }

    if (query.isError) {
      return 'error';
    }

    if (!query.data || query.data.length === 0) {
      return 'empty';
    }

    return 'ready';
  }, [query.data, query.isError, query.isLoading]);

  return (
    <section className="page-stack" aria-label="Scores du jour">
      <header className="panel-card">
        <p className="eyebrow">Scores live</p>
        <h1>Résultats du jour</h1>
        <p>
          Données mises à jour automatiquement toutes les 60 secondes via l’API FootAlert.
        </p>

        <div className="score-controls">
          <label htmlFor="score-date">Date</label>
          <input
            id="score-date"
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
          />
          <span className="timezone-chip" aria-label="Fuseau horaire">
            {timezone}
          </span>
        </div>
      </header>

      <ScoresPanel
        state={state}
        cards={query.data ?? []}
        errorMessage={query.error instanceof Error ? query.error.message : undefined}
      />
    </section>
  );
}
