import { useMemo, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { OverviewPlayerLeadersCard } from '@ui/features/teams/components/overview/OverviewPlayerLeadersCard';
import type { PlayerCategoryKey } from '@ui/features/teams/components/overview/overviewSelectors';
import { createTeamOverviewStyles } from '@ui/features/teams/components/overview/TeamOverviewTab.styles';
import type { TeamOverviewPlayerLeaders } from '@ui/features/teams/types/teams.types';
import { samplePlayerLeaders } from '@ui/stories/fixtures/teamFixtures';

type OverviewPlayerLeadersCardStoryProps = {
  leaders: TeamOverviewPlayerLeaders;
};

function OverviewPlayerLeadersCardStory({ leaders }: OverviewPlayerLeadersCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  const leaderSections = useMemo<ComponentProps<typeof OverviewPlayerLeadersCard>['leaderSections']>(
    () =>
      (['scorers', 'assisters', 'ratings'] as PlayerCategoryKey[]).map(key => ({
        key,
        title: t(`teamDetails.stats.categories.${key === 'ratings' ? 'rating' : key}`),
        players: leaders[key],
      })),
    [leaders, t],
  );

  return <OverviewPlayerLeadersCard styles={styles} t={t} leaderSections={leaderSections} />;
}

const meta = {
  title: 'Teams/Overview/OverviewPlayerLeadersCard',
  component: OverviewPlayerLeadersCardStory,
  args: {
    leaders: samplePlayerLeaders,
  },
} satisfies Meta<typeof OverviewPlayerLeadersCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    leaders: {
      ratings: [],
      scorers: [],
      assisters: [],
    },
  },
};
