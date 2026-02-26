import type { Meta, StoryObj } from '@storybook/react-native';

import { TransferCard } from '@ui/features/competitions/components/TransferCard';
import type { Transfer } from '@ui/features/competitions/types/competitions.types';

const sampleTransfer: Transfer = {
  id: 'tr-1',
  playerId: 10,
  playerName: 'Kylian Mbappé',
  playerPhoto: 'https://media.api-sports.io/football/players/276.png',
  date: '2026-01-20',
  timestamp: 1768867200,
  type: 'Transfer',
  direction: 'arrival',
  isArrival: true,
  isDeparture: false,
  teamIn: {
    id: 541,
    name: 'Real Madrid',
    logo: 'https://media.api-sports.io/football/teams/541.png',
  },
  teamOut: {
    id: 85,
    name: 'Paris SG',
    logo: 'https://media.api-sports.io/football/teams/85.png',
  },
};

const meta = {
  title: 'Competitions/TransferCard',
  component: TransferCard,
  args: {
    transfer: sampleTransfer,
  },
  decorators: [
    Story => <Story />,
  ],
} satisfies Meta<typeof TransferCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
