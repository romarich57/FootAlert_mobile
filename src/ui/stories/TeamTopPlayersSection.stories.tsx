import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { TeamTopPlayersSection } from '@ui/features/teams/components/stats/TeamTopPlayersSection';
import { createTeamStatsTabStyles } from '@ui/features/teams/components/stats/TeamStatsTab.styles';
import type { TeamStatsData } from '@ui/features/teams/types/teams.types';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';
import { sampleTeamStatsData } from '@ui/stories/fixtures/teamFixtures';

type TeamTopPlayersSectionStoryProps = {
  data: TeamStatsData | undefined;
};

function TeamTopPlayersSectionStory({ data }: TeamTopPlayersSectionStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamStatsTabStyles(colors), [colors]);

  return (
    <TeamTopPlayersSection
      data={data}
      styles={styles}
      colors={colors}
      t={t}
      onPressPlayer={() => undefined}
      localizePosition={value => localizePlayerPosition(value, t)}
    />
  );
}

const meta = {
  title: 'Teams/Stats/TeamTopPlayersSection',
  component: TeamTopPlayersSectionStory,
  args: {
    data: sampleTeamStatsData,
  },
} satisfies Meta<typeof TeamTopPlayersSectionStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    data: {
      ...sampleTeamStatsData,
      topPlayersByCategory: {
        ratings: [],
        scorers: [],
        assisters: [],
      },
    },
  },
};
