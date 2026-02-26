import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { TeamPointsCard } from '@ui/features/teams/components/stats/TeamPointsCard';
import { createTeamStatsTabStyles } from '@ui/features/teams/components/stats/TeamStatsTab.styles';
import type { TeamStatsData } from '@ui/features/teams/types/teams.types';
import { sampleTeamStatsData } from '@ui/stories/fixtures/teamFixtures';

type TeamPointsCardStoryProps = {
  data: TeamStatsData;
};

function TeamPointsCardStory({ data }: TeamPointsCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamStatsTabStyles(colors), [colors]);

  return <TeamPointsCard data={data} styles={styles} t={t} />;
}

const meta = {
  title: 'Teams/Stats/TeamPointsCard',
  component: TeamPointsCardStory,
  args: {
    data: sampleTeamStatsData,
  },
} satisfies Meta<typeof TeamPointsCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
