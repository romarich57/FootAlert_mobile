import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { OverviewStadiumInfoCard } from '@ui/features/teams/components/overview/OverviewStadiumInfoCard';
import { createTeamOverviewStyles } from '@ui/features/teams/components/overview/TeamOverviewTab.styles';
import type { TeamIdentity } from '@ui/features/teams/types/teams.types';
import { sampleTeamIdentity } from '@ui/stories/fixtures/teamFixtures';

type OverviewStadiumInfoCardStoryProps = {
  team: TeamIdentity;
};

function OverviewStadiumInfoCardStory({ team }: OverviewStadiumInfoCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  return <OverviewStadiumInfoCard styles={styles} t={t} team={team} />;
}

const meta = {
  title: 'Teams/Overview/OverviewStadiumInfoCard',
  component: OverviewStadiumInfoCardStory,
  args: {
    team: sampleTeamIdentity,
  },
} satisfies Meta<typeof OverviewStadiumInfoCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MissingImage: Story = {
  args: {
    team: {
      ...sampleTeamIdentity,
      venueImage: null,
      venueCapacity: null,
      founded: null,
    },
  },
};
