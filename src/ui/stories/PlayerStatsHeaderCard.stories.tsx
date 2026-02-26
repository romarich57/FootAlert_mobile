import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { PlayerStatsHeaderCard } from '@ui/features/players/components/stats/PlayerStatsHeaderCard';
import { createPlayerStatsTabStyles } from '@ui/features/players/components/stats/PlayerStatsTab.styles';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import { samplePlayerLeagueName, samplePlayerSeasonStats } from '@ui/stories/fixtures/playerFixtures';

type PlayerStatsHeaderCardStoryProps = {
  leagueName: string;
  stats: PlayerSeasonStats;
};

function PlayerStatsHeaderCardStory({ leagueName, stats }: PlayerStatsHeaderCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createPlayerStatsTabStyles(colors), [colors]);

  return (
    <PlayerStatsHeaderCard
      styles={styles}
      colors={colors}
      t={t}
      leagueName={leagueName}
      stats={stats}
    />
  );
}

const meta = {
  title: 'Players/Stats/PlayerStatsHeaderCard',
  component: PlayerStatsHeaderCardStory,
  args: {
    leagueName: samplePlayerLeagueName,
    stats: samplePlayerSeasonStats,
  },
} satisfies Meta<typeof PlayerStatsHeaderCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
