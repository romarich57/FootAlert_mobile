import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { OverviewStandingHistoryCard } from '@ui/features/teams/components/overview/OverviewStandingHistoryCard';
import { createTeamOverviewStyles } from '@ui/features/teams/components/overview/TeamOverviewTab.styles';
import type { TeamOverviewHistoryPoint } from '@ui/features/teams/types/teams.types';
import { sampleStandingHistory, sampleStandingHistoryLeague } from '@ui/stories/fixtures/teamFixtures';

type OverviewStandingHistoryCardStoryProps = {
  historyPoints: TeamOverviewHistoryPoint[];
  historyLeague: {
    name: string | null;
    logo: string | null;
  };
};

function OverviewStandingHistoryCardStory({ historyPoints, historyLeague }: OverviewStandingHistoryCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  return (
    <OverviewStandingHistoryCard
      styles={styles}
      t={t}
      historyPoints={historyPoints}
      historyLeague={historyLeague}
    />
  );
}

const meta = {
  title: 'Teams/Overview/OverviewStandingHistoryCard',
  component: OverviewStandingHistoryCardStory,
  args: {
    historyPoints: sampleStandingHistory,
    historyLeague: sampleStandingHistoryLeague,
  },
} satisfies Meta<typeof OverviewStandingHistoryCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    historyPoints: [],
  },
};
