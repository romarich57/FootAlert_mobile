import { useMemo, useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
  createPlayerCareerTabStyles,
  type PlayerCareerTabStyles,
} from '@ui/features/players/components/career/PlayerCareerTab.styles';
import { PlayerCareerSeasonCard } from '@ui/features/players/components/career/PlayerCareerSeasonCard';
import {
  PlayerCareerTeamLegend,
  PlayerCareerTeamSectionCard,
} from '@ui/features/players/components/career/PlayerCareerTeamSectionCard';
import {
  buildSeasonRows,
  splitCareerTeams,
} from '@ui/features/players/components/career/playerCareer.utils';
import type { PlayerCareerSeason, PlayerCareerTeam } from '@ui/features/players/types/players.types';

type PlayerCareerTabProps = {
  seasons: PlayerCareerSeason[];
  teams: PlayerCareerTeam[];
  nationality?: string;
};

type CareerViewMode = 'season' | 'team';

type PlayerCareerContentItem = {
  key: string;
  content: ReactElement;
};

function buildTeamModeItems(
  professionalTeams: PlayerCareerTeam[],
  nationalTeams: PlayerCareerTeam[],
  styles: PlayerCareerTabStyles,
  t: (key: string) => string,
  iconColor: string,
): PlayerCareerContentItem[] {
  const items: PlayerCareerContentItem[] = [];

  if (professionalTeams.length > 0) {
    items.push({
      key: 'professional-team-section',
      content: (
        <PlayerCareerTeamSectionCard
          sectionTitle={t('playerDetails.career.labels.professionalCareer')}
          sectionTeams={professionalTeams}
          styles={styles}
          iconColor={iconColor}
        />
      ),
    });
  }

  if (nationalTeams.length > 0) {
    const nationalSection = (
      <PlayerCareerTeamSectionCard
        sectionTitle={t('playerDetails.career.labels.nationalTeam')}
        sectionTeams={nationalTeams}
        styles={styles}
        iconColor={iconColor}
      />
    );

    items.push({
      key: 'national-team-section',
      content: professionalTeams.length > 0 ? <View style={styles.sectionSpacer}>{nationalSection}</View> : nationalSection,
    });
  }

  if (professionalTeams.length === 0 && nationalTeams.length === 0) {
    items.push({
      key: 'team-empty-state',
      content: <Text style={styles.emptyText}>{t('playerDetails.career.states.emptyTeam')}</Text>,
    });
  }

  items.push({
    key: 'team-legend',
    content: (
      <PlayerCareerTeamLegend
        styles={styles}
        iconColor={iconColor}
        matchesPlayedLabel={t('playerDetails.career.labels.matchesPlayed')}
        goalsLabel={t('playerDetails.career.labels.goals')}
      />
    ),
  });

  return items;
}

export function PlayerCareerTab({ seasons, teams, nationality }: PlayerCareerTabProps) {
  const { colors } = useAppTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => createPlayerCareerTabStyles(colors), [colors]);
  const [mode, setMode] = useState<CareerViewMode>('season');

  const seasonRows = useMemo(() => buildSeasonRows(seasons, nationality), [seasons, nationality]);
  const { professionalTeams, nationalTeams } = useMemo(
    () => splitCareerTeams(teams, nationality),
    [teams, nationality],
  );

  const contentItems = useMemo<PlayerCareerContentItem[]>(() => {
    if (mode === 'season') {
      return [
        {
          key: 'season-career-card',
          content: (
            <PlayerCareerSeasonCard
              seasonRows={seasonRows}
              languageTag={i18n.language}
              styles={styles}
              title={t('playerDetails.career.labels.professionalCareer')}
              emptyLabel={t('playerDetails.career.states.emptySeason')}
              iconColor={colors.textMuted}
            />
          ),
        },
      ];
    }

    return buildTeamModeItems(professionalTeams, nationalTeams, styles, t, colors.textMuted);
  }, [
    colors.textMuted,
    i18n.language,
    mode,
    nationalTeams,
    professionalTeams,
    seasonRows,
    styles,
    t,
  ]);

  return (
    <View style={styles.container}>
      <FlashList
        data={contentItems}
        keyExtractor={item => item.key}
        getItemType={() => 'player-career-section'}
        estimatedItemSize={230}
        renderItem={({ item }) => item.content}
        ListHeaderComponent={
          <View style={styles.segmentedContainer} accessibilityRole="tablist">
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'season' }}
              onPress={() => setMode('season')}
              style={[styles.segmentedButton, mode === 'season' ? styles.segmentedButtonActive : null]}
            >
              <Text style={[styles.segmentedLabel, mode === 'season' ? styles.segmentedLabelActive : null]}>
                {t('playerDetails.career.tabs.season')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'team' }}
              onPress={() => setMode('team')}
              style={[styles.segmentedButton, mode === 'team' ? styles.segmentedButtonActive : null]}
            >
              <Text style={[styles.segmentedLabel, mode === 'team' ? styles.segmentedLabelActive : null]}>
                {t('playerDetails.career.tabs.team')}
              </Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}
