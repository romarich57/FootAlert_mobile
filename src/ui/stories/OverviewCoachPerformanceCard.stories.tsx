import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { OverviewCoachPerformanceCard } from '@ui/features/teams/components/overview/OverviewCoachPerformanceCard';
import { createTeamOverviewStyles } from '@ui/features/teams/components/overview/TeamOverviewTab.styles';
import type { TeamOverviewCoachPerformance } from '@ui/features/teams/types/teams.types';
import { sampleCoachPerformance } from '@ui/stories/fixtures/teamFixtures';

type OverviewCoachPerformanceCardStoryProps = {
  coachPerformance: TeamOverviewCoachPerformance | null;
};

function OverviewCoachPerformanceCardStory({ coachPerformance }: OverviewCoachPerformanceCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  return <OverviewCoachPerformanceCard styles={styles} t={t} coachPerformance={coachPerformance} />;
}

const meta = {
  title: 'Teams/Overview/OverviewCoachPerformanceCard',
  component: OverviewCoachPerformanceCardStory,
  args: {
    coachPerformance: sampleCoachPerformance,
  },
} satisfies Meta<typeof OverviewCoachPerformanceCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    coachPerformance: null,
  },
};
