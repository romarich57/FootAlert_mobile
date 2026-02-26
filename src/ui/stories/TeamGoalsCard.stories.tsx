import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { TeamGoalsCard } from '@ui/features/teams/components/stats/TeamGoalsCard';
import { createTeamStatsTabStyles } from '@ui/features/teams/components/stats/TeamStatsTab.styles';
import type { TeamStatsData } from '@ui/features/teams/types/teams.types';
import { sampleTeamStatsData } from '@ui/stories/fixtures/teamFixtures';

type TeamGoalsCardStoryProps = {
  data: TeamStatsData | undefined;
};

function TeamGoalsCardStory({ data }: TeamGoalsCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamStatsTabStyles(colors), [colors]);

  return <TeamGoalsCard data={data} styles={styles} t={t} />;
}

const meta = {
  title: 'Teams/Stats/TeamGoalsCard',
  component: TeamGoalsCardStory,
  args: {
    data: sampleTeamStatsData,
  },
} satisfies Meta<typeof TeamGoalsCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sparse: Story = {
  args: {
    data: {
      ...sampleTeamStatsData,
      goalsForPerMatch: null,
      goalsAgainstPerMatch: null,
      cleanSheets: null,
      failedToScore: null,
      goalBreakdown: [],
    },
  },
};
