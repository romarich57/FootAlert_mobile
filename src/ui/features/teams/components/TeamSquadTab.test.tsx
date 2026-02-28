import React from 'react';
import { screen } from '@testing-library/react-native';

import { TeamSquadTab } from '@ui/features/teams/components/TeamSquadTab';
import type { TeamSquadData } from '@ui/features/teams/types/teams.types';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('TeamSquadTab', () => {
  it('renders all rows when player ids collide across roles', () => {
    const data: TeamSquadData = {
      coach: {
        id: 'shared-id',
        name: 'Coach Shared',
        photo: null,
        age: 51,
      },
      players: [
        {
          playerId: 'shared-id',
          name: 'Goalkeeper Shared',
          photo: null,
          age: 29,
          number: 1,
          position: 'Goalkeeper',
          role: 'goalkeepers',
        },
        {
          playerId: 'shared-id',
          name: 'Attacker Shared',
          photo: null,
          age: 24,
          number: 9,
          position: 'Attacker',
          role: 'attackers',
        },
      ],
    };

    renderWithAppProviders(
      <TeamSquadTab data={data} isLoading={false} isError={false} onRetry={jest.fn()} />,
    );

    expect(screen.getByText('Coach Shared')).toBeTruthy();
    expect(screen.getByText(/Goalkeeper Shared/)).toBeTruthy();
    expect(screen.getByText(/Attacker Shared/)).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.squad.coach'))).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.squad.roles.goalkeepers'))).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.squad.roles.attackers'))).toBeTruthy();
  });
});
