import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { OverviewNextMatchCard } from '@ui/features/teams/components/overview/OverviewNextMatchCard';
import { createTeamOverviewStyles } from '@ui/features/teams/components/overview/TeamOverviewTab.styles';
import type { TeamMatchItem } from '@ui/features/teams/types/teams.types';
import { sampleTeamMatch } from '@ui/stories/fixtures/teamFixtures';

type OverviewNextMatchCardStoryProps = {
  nextMatch: TeamMatchItem | null;
};

function OverviewNextMatchCardStory({ nextMatch }: OverviewNextMatchCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  return (
    <OverviewNextMatchCard
      styles={styles}
      t={t}
      nextMatch={nextMatch}
      onPressMatch={() => undefined}
      onPressTeam={() => undefined}
    />
  );
}

const meta = {
  title: 'Teams/Overview/OverviewNextMatchCard',
  component: OverviewNextMatchCardStory,
  args: {
    nextMatch: sampleTeamMatch,
  },
} satisfies Meta<typeof OverviewNextMatchCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithMatch: Story = {};

export const Empty: Story = {
  args: {
    nextMatch: null,
  },
};
