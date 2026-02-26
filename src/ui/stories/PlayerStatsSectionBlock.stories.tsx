import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { PlayerStatsSectionBlock } from '@ui/features/players/components/stats/PlayerStatsSectionBlock';
import type {
  StatRowConfig,
  StatSectionKey,
} from '@ui/features/players/components/stats/playerStatsRows';
import { createPlayerStatsTabStyles } from '@ui/features/players/components/stats/PlayerStatsTab.styles';
import { sampleSectionRows, sampleSparseSectionRows } from '@ui/stories/fixtures/playerFixtures';

type PlayerStatsSectionBlockStoryProps = {
  sectionKey: StatSectionKey;
  title: string;
  rows: StatRowConfig[];
};

function PlayerStatsSectionBlockStory({ sectionKey, title, rows }: PlayerStatsSectionBlockStoryProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createPlayerStatsTabStyles(colors), [colors]);

  return (
    <PlayerStatsSectionBlock
      sectionKey={sectionKey}
      rows={rows}
      title={title}
      styles={styles}
      colors={colors}
    />
  );
}

const meta = {
  title: 'Players/Stats/PlayerStatsSectionBlock',
  component: PlayerStatsSectionBlockStory,
  args: {
    sectionKey: 'shooting',
    title: 'Shooting',
    rows: sampleSectionRows,
  },
} satisfies Meta<typeof PlayerStatsSectionBlockStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sparse: Story = {
  args: {
    rows: sampleSparseSectionRows,
  },
};
