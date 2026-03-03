import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScoresPanel } from './ScoresPanel';

const sampleCards = [
  {
    fixtureId: '42',
    kickoffAt: '2026-03-04T20:00:00+00:00',
    statusShort: 'FT',
    leagueName: 'Serie A',
    homeTeamName: 'Inter',
    awayTeamName: 'Milan',
    homeGoals: 3,
    awayGoals: 2,
  },
];

describe('ScoresPanel states', () => {
  it('renders loading skeleton', () => {
    const { container } = render(<ScoresPanel state="loading" cards={[]} />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('renders error message', () => {
    render(<ScoresPanel state="error" cards={[]} errorMessage="network down" />);
    expect(screen.getByRole('alert')).toHaveTextContent('network down');
  });

  it('renders empty state', () => {
    render(<ScoresPanel state="empty" cards={[]} />);
    expect(screen.getByText(/Aucun match trouvé/i)).toBeInTheDocument();
  });

  it('renders score cards when ready', () => {
    render(<ScoresPanel state="ready" cards={sampleCards} />);
    expect(screen.getByLabelText(/Inter contre Milan/i)).toBeInTheDocument();
  });
});
