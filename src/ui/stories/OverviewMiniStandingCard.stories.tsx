import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { OverviewMiniStandingCard } from '@ui/features/teams/components/overview/OverviewMiniStandingCard';
import { createTeamOverviewStyles } from '@ui/features/teams/components/overview/TeamOverviewTab.styles';
import type { TeamOverviewMiniStanding } from '@ui/features/teams/types/teams.types';
import { sampleMiniStanding } from '@ui/stories/fixtures/teamFixtures';

type OverviewMiniStandingCardStoryProps = {
  miniStanding: TeamOverviewMiniStanding | null;
};

function OverviewMiniStandingCardStory({ miniStanding }: OverviewMiniStandingCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  return <OverviewMiniStandingCard styles={styles} t={t} miniStanding={miniStanding} />;
}

const meta = {
  title: 'Teams/Overview/OverviewMiniStandingCard',
  component: OverviewMiniStandingCardStory,
  args: {
    miniStanding: sampleMiniStanding,
  },
} satisfies Meta<typeof OverviewMiniStandingCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    miniStanding: null,
  },
};
