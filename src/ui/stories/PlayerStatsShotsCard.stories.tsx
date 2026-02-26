import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
  computeShotAccuracy,
  computeShotConversion,
} from '@ui/features/players/components/stats/playerStatsRows';
import { PlayerStatsShotsCard } from '@ui/features/players/components/stats/PlayerStatsShotsCard';
import { createPlayerStatsTabStyles } from '@ui/features/players/components/stats/PlayerStatsTab.styles';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import {
  sampleGoalkeeperSeasonStats,
  samplePlayerLeagueName,
  samplePlayerSeasonStats,
} from '@ui/stories/fixtures/playerFixtures';

type PlayerStatsShotsCardStoryProps = {
  stats: PlayerSeasonStats;
  leagueName: string | null;
};

function PlayerStatsShotsCardStory({ stats, leagueName }: PlayerStatsShotsCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createPlayerStatsTabStyles(colors), [colors]);
  const shotAccuracy = useMemo(() => computeShotAccuracy(stats), [stats]);
  const shotConversion = useMemo(() => computeShotConversion(stats), [stats]);

  return (
    <PlayerStatsShotsCard
      styles={styles}
      colors={colors}
      t={t}
      stats={stats}
      leagueName={leagueName}
      shotAccuracy={shotAccuracy}
      shotConversion={shotConversion}
    />
  );
}

const meta = {
  title: 'Players/Stats/PlayerStatsShotsCard',
  component: PlayerStatsShotsCardStory,
  args: {
    stats: samplePlayerSeasonStats,
    leagueName: samplePlayerLeagueName,
  },
} satisfies Meta<typeof PlayerStatsShotsCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const GoalkeeperNoShots: Story = {
  args: {
    stats: sampleGoalkeeperSeasonStats,
    leagueName: null,
  },
};
