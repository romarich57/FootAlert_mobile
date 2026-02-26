import type { Meta, StoryObj } from '@storybook/react-native';

import { MatchCard } from '@ui/features/matches/components/MatchCard';
import type { MatchItem } from '@ui/features/matches/types/matches.types';

const baseMatch: MatchItem = {
  fixtureId: '1001',
  competitionId: '61',
  competitionName: 'Ligue 1',
  competitionLogo: 'https://media.api-sports.io/football/leagues/61.png',
  competitionCountry: 'France',
  startDate: '2026-02-26T20:00:00.000Z',
  minute: 67,
  venue: 'Parc des Princes',
  status: 'live',
  statusLabel: "67'",
  homeTeamId: '85',
  homeTeamName: 'Paris SG',
  homeTeamLogo: 'https://media.api-sports.io/football/teams/85.png',
  awayTeamId: '81',
  awayTeamName: 'Marseille',
  awayTeamLogo: 'https://media.api-sports.io/football/teams/81.png',
  homeGoals: 2,
  awayGoals: 1,
  hasBroadcast: true,
};

const meta = {
  title: 'Matches/MatchCard',
  component: MatchCard,
  args: {
    match: baseMatch,
    onPress: () => undefined,
    onPressNotification: () => undefined,
    onPressHomeTeam: () => undefined,
    onPressAwayTeam: () => undefined,
  },
} satisfies Meta<typeof MatchCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Live: Story = {};

export const Upcoming: Story = {
  args: {
    match: {
      ...baseMatch,
      fixtureId: '1002',
      status: 'upcoming',
      minute: null,
      homeGoals: null,
      awayGoals: null,
    },
  },
};
