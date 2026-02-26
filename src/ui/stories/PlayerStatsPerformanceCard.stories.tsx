import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { PlayerStatsPerformanceCard } from '@ui/features/players/components/stats/PlayerStatsPerformanceCard';
import type { StatMode } from '@ui/features/players/components/stats/playerStatsRows';
import { createPlayerStatsTabStyles } from '@ui/features/players/components/stats/PlayerStatsTab.styles';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import {
  buildSamplePlayerStatsRows,
  sampleGoalkeeperSeasonStats,
  samplePlayerSeasonStats,
} from '@ui/stories/fixtures/playerFixtures';

type PlayerStatsPerformanceCardStoryProps = {
  mode: StatMode;
  stats: PlayerSeasonStats;
};

function PlayerStatsPerformanceCardStory({ mode, stats }: PlayerStatsPerformanceCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createPlayerStatsTabStyles(colors), [colors]);
  const rows = useMemo(() => buildSamplePlayerStatsRows(t, mode, stats), [mode, stats, t]);

  return (
    <PlayerStatsPerformanceCard
      styles={styles}
      colors={colors}
      t={t}
      mode={mode}
      onChangeMode={() => undefined}
      rows={rows}
    />
  );
}

const meta = {
  title: 'Players/Stats/PlayerStatsPerformanceCard',
  component: PlayerStatsPerformanceCardStory,
  args: {
    mode: 'total',
    stats: samplePlayerSeasonStats,
  },
} satisfies Meta<typeof PlayerStatsPerformanceCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PerNinety: Story = {
  args: {
    mode: 'per90',
  },
};

export const Goalkeeper: Story = {
  args: {
    stats: sampleGoalkeeperSeasonStats,
  },
};
