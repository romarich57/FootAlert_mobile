import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { MatchDetailsHeader } from '@ui/features/matches/details/components/MatchDetailsHeader';
import type { ApiFootballFixtureDto } from '@ui/features/matches/types/matches.types';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

const fixture: ApiFootballFixtureDto = {
  fixture: {
    id: 42,
    date: '2026-02-27T20:00:00.000Z',
    status: {
      short: '2H',
      long: 'Second Half',
      elapsed: 78,
    },
    venue: {
      name: 'Stadium',
      city: 'Paris',
    },
  },
  league: {
    id: 61,
    name: 'Ligue 1',
    country: 'France',
    logo: '',
  },
  teams: {
    home: {
      id: 1,
      name: 'Paris',
      logo: '',
    },
    away: {
      id: 2,
      name: 'Lyon',
      logo: '',
    },
  },
  goals: {
    home: 2,
    away: 1,
  },
};

describe('MatchDetailsHeader', () => {
  it('renders live status badge and minute label', () => {
    renderWithAppProviders(
      <MatchDetailsHeader
        fixture={fixture}
        lifecycleState="live"
        statusLabel="78'"
        kickoffLabel="20:00"
        countdownLabel="Soon"
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByText(i18n.t('matches.liveLabel'))).toBeTruthy();
    expect(screen.getByText("78'")).toBeTruthy();
    expect(screen.getByText('2-1')).toBeTruthy();
  });

  it('disables optional action buttons when callbacks are not provided', () => {
    renderWithAppProviders(
      <MatchDetailsHeader
        fixture={fixture}
        lifecycleState="pre_match"
        statusLabel={i18n.t('matches.status.upcoming')}
        kickoffLabel="20:00"
        countdownLabel="2 h"
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByLabelText(i18n.t('matchDetails.actions.notifications')).props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(screen.getByLabelText(i18n.t('matchDetails.actions.favorite')).props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(screen.getByLabelText(i18n.t('matchDetails.actions.menu')).props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('calls optional actions when handlers are provided', () => {
    const onPressMenu = jest.fn();

    renderWithAppProviders(
      <MatchDetailsHeader
        fixture={fixture}
        lifecycleState="finished"
        statusLabel="FT"
        kickoffLabel="20:00"
        countdownLabel="2 h"
        onBack={jest.fn()}
        onPressMenu={onPressMenu}
      />,
    );

    fireEvent.press(screen.getByLabelText(i18n.t('matchDetails.actions.menu')));
    expect(onPressMenu).toHaveBeenCalled();
    expect(screen.getByText('FT')).toBeTruthy();
  });
});
