import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { OverviewRecentFormCard } from '@ui/features/teams/components/overview/OverviewRecentFormCard';
import { createTeamOverviewStyles } from '@ui/features/teams/components/overview/TeamOverviewTab.styles';
import type { TeamFormEntry } from '@ui/features/teams/types/teams.types';
import { sampleRecentForm } from '@ui/stories/fixtures/teamFixtures';

type OverviewRecentFormCardStoryProps = {
  recentForm: TeamFormEntry[];
};

function OverviewRecentFormCardStory({ recentForm }: OverviewRecentFormCardStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  return <OverviewRecentFormCard styles={styles} t={t} recentForm={recentForm} />;
}

const meta = {
  title: 'Teams/Overview/OverviewRecentFormCard',
  component: OverviewRecentFormCardStory,
  args: {
    recentForm: sampleRecentForm,
  },
} satisfies Meta<typeof OverviewRecentFormCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    recentForm: [],
  },
};
