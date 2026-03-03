import { formatKickoff } from '@/lib/date';

import type { MatchScoreCard } from '../types';

type ScoreCardProps = {
  card: MatchScoreCard;
};

export function ScoreCard({ card }: ScoreCardProps) {
  return (
    <article className="score-card" aria-label={`${card.homeTeamName} contre ${card.awayTeamName}`}>
      <div className="score-meta">
        <span>{card.leagueName || 'Compétition'}</span>
        <strong>{card.statusShort || 'LIVE'}</strong>
      </div>

      <div className="score-row">
        <span className="team-name">{card.homeTeamName}</span>
        <span className="goal">{card.homeGoals ?? '-'}</span>
      </div>
      <div className="score-row">
        <span className="team-name">{card.awayTeamName}</span>
        <span className="goal">{card.awayGoals ?? '-'}</span>
      </div>

      <div className="score-kickoff">Coup d&apos;envoi: {formatKickoff(card.kickoffAt)}</div>
    </article>
  );
}
