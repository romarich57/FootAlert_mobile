import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('shows hero and legal links', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /La vitrine officielle de l’app FootAlert/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voir les tutoriels/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Politique de confidentialité/i })).toBeInTheDocument();
  });
});
