import { useMemo, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { OverviewCompetitionsCard } from '@ui/features/teams/components/overview/OverviewCompetitionsCard';
import { createTeamOverviewStyles } from '@ui/features/teams/components/overview/TeamOverviewTab.styles';
import { sampleCompetitionsForSeason } from '@ui/stories/fixtures/teamFixtures';

type CompetitionForSeason = ComponentProps<typeof OverviewCompetitionsCard>['competitionsForSeason'];

type OverviewCompetitionsCardStoryProps = {
  competitionsForSeason: CompetitionForSeason;
};

function OverviewCompetitionsCardStory({ competitionsForSeason }: OverviewCompetitionsCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  return <OverviewCompetitionsCard styles={styles} t={t} competitionsForSeason={competitionsForSeason} />;
}

const meta = {
  title: 'Teams/Overview/OverviewCompetitionsCard',
  component: OverviewCompetitionsCardStory,
  args: {
    competitionsForSeason: sampleCompetitionsForSeason,
  },
} satisfies Meta<typeof OverviewCompetitionsCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    competitionsForSeason: [],
  },
};
