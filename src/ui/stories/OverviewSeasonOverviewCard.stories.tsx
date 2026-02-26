import { useMemo, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { OverviewSeasonOverviewCard } from '@ui/features/teams/components/overview/OverviewSeasonOverviewCard';
import { createTeamOverviewStyles } from '@ui/features/teams/components/overview/TeamOverviewTab.styles';
import type { TeamSeasonLineup } from '@ui/features/teams/types/teams.types';
import { sampleSeasonLineup } from '@ui/stories/fixtures/teamFixtures';

type OverviewSeasonOverviewCardStoryProps = {
  rank: number | null;
  points: number | null;
  played: number | null;
  goalDiff: number | null;
  seasonLineup: TeamSeasonLineup | null;
};

function OverviewSeasonOverviewCardStory({ rank, points, played, goalDiff, seasonLineup }: OverviewSeasonOverviewCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  const seasonStatCards = useMemo<ComponentProps<typeof OverviewSeasonOverviewCard>['seasonStatCards']>(
    () => [
      { key: 'rank', iconName: 'medal-outline', label: t('teamDetails.labels.rank'), value: rank },
      { key: 'points', iconName: 'star-outline', label: t('teamDetails.labels.points'), value: points },
      { key: 'played', iconName: 'calendar-month-outline', label: t('teamDetails.labels.played'), value: played },
      { key: 'goalDiff', iconName: 'soccer', label: t('teamDetails.labels.goalDiff'), value: goalDiff },
    ],
    [goalDiff, played, points, rank, t],
  );

  return (
    <OverviewSeasonOverviewCard
      styles={styles}
      colors={colors}
      t={t}
      seasonStatCards={seasonStatCards}
      seasonLineup={seasonLineup}
    />
  );
}

const meta = {
  title: 'Teams/Overview/OverviewSeasonOverviewCard',
  component: OverviewSeasonOverviewCardStory,
  args: {
    rank: 2,
    points: 51,
    played: 24,
    goalDiff: 25,
    seasonLineup: sampleSeasonLineup,
  },
} satisfies Meta<typeof OverviewSeasonOverviewCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoLineup: Story = {
  args: {
    seasonLineup: null,
  },
};
