import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { TeamComparisonMetricsSection } from '@ui/features/teams/components/stats/TeamComparisonMetricsSection';
import { createTeamStatsTabStyles } from '@ui/features/teams/components/stats/TeamStatsTab.styles';
import type { TeamComparisonMetric } from '@ui/features/teams/types/teams.types';
import { sampleTeamStatsData } from '@ui/stories/fixtures/teamFixtures';

type TeamComparisonMetricsSectionStoryProps = {
  metrics: TeamComparisonMetric[];
};

function TeamComparisonMetricsSectionStory({ metrics }: TeamComparisonMetricsSectionStoryProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamStatsTabStyles(colors), [colors]);

  return <TeamComparisonMetricsSection metrics={metrics} styles={styles} colors={colors} t={t} />;
}

const meta = {
  title: 'Teams/Stats/TeamComparisonMetricsSection',
  component: TeamComparisonMetricsSectionStory,
  args: {
    metrics: sampleTeamStatsData.comparisonMetrics,
  },
} satisfies Meta<typeof TeamComparisonMetricsSectionStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    metrics: [],
  },
};
