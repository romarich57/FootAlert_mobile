import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { TeamTabs } from '@ui/features/teams/components/TeamTabs';
import '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('TeamTabs', () => {
  it('switches tab when pressed', () => {
    const onChangeTab = jest.fn();

    renderWithAppProviders(
      <TeamTabs
        activeTab="overview"
        onChangeTab={onChangeTab}
        tabs={[
          { key: 'overview', label: 'Aperçu' },
          { key: 'matches', label: 'Matchs' },
        ]}
      />,
    );

    fireEvent.press(screen.getByText('Matchs'));

    expect(onChangeTab).toHaveBeenCalledWith('matches');
  });
});
