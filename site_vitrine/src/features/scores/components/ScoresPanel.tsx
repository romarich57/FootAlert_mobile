import type { MatchScoreCard } from '../types';
import { ScoreCard } from './ScoreCard';

type ScoresPanelProps = {
  state: 'loading' | 'error' | 'empty' | 'ready';
  cards: MatchScoreCard[];
  errorMessage?: string;
};

function LoadingSkeleton() {
  return (
    <div className="scores-grid" aria-live="polite" aria-busy="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="score-card skeleton" key={index} />
      ))}
    </div>
  );
}

export function ScoresPanel({ state, cards, errorMessage }: ScoresPanelProps) {
  if (state === 'loading') {
    return <LoadingSkeleton />;
  }

  if (state === 'error') {
    return (
      <p role="alert" className="scores-state error">
        {errorMessage || 'Impossible de récupérer les scores pour le moment.'}
      </p>
    );
  }

  if (state === 'empty') {
    return <p className="scores-state">Aucun match trouvé pour cette date.</p>;
  }

  return (
    <div className="scores-grid" aria-live="polite">
      {cards.map(card => (
        <ScoreCard key={card.fixtureId} card={card} />
      ))}
    </div>
  );
}
