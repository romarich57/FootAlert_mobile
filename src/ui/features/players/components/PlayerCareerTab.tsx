import React, { useMemo, useState, type ReactElement } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerCareerSeason, PlayerCareerTeam } from '@ui/features/players/types/players.types';
import { getRatingColor } from '@ui/features/players/utils/playerDisplay';

type PlayerCareerTabProps = {
  seasons: PlayerCareerSeason[];
  teams: PlayerCareerTeam[];
  nationality?: string;
};

type CareerViewMode = 'season' | 'team';

type PlayerCareerListItemKey =
  | 'season-career-card'
  | 'professional-team-section'
  | 'national-team-section'
  | 'team-empty-state'
  | 'team-legend';

type PlayerCareerContentItem = {
  key: PlayerCareerListItemKey;
  content: ReactElement;
};

function formatStatValue(value: number | null): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return String(value);
}

function formatSeasonValue(season: string | null): string | null {
  if (!season) {
    return null;
  }

  const seasonYear = Number.parseInt(season, 10);
  if (!Number.isFinite(seasonYear)) {
    return season;
  }

  return `${seasonYear}/${seasonYear + 1}`;
}

function formatLabelValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function formatRatingValue(
  rating: string | null,
  languageTag: string,
): string | null {
  if (!rating) {
    return null;
  }

  const parsed = Number.parseFloat(rating);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Intl.NumberFormat(languageTag, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(parsed);
}

function parseSeasonYear(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function parsePeriodBounds(period: string | null): { start: number; end: number } {
  if (!period) {
    return {
      start: Number.NEGATIVE_INFINITY,
      end: Number.NEGATIVE_INFINITY,
    };
  }

  const years = (period.match(/\d{4}/g) ?? [])
    .map(token => Number.parseInt(token, 10))
    .filter((value): value is number => Number.isFinite(value));

  if (years.length === 0) {
    return {
      start: Number.NEGATIVE_INFINITY,
      end: Number.NEGATIVE_INFINITY,
    };
  }

  return {
    start: Math.min(...years),
    end: Math.max(...years),
  };
}

function looksLikeNationalTeam(teamName: string | null, nationality?: string): boolean {
  if (!teamName) {
    return false;
  }

  const normalizedTeamName = teamName.trim();
  if (!normalizedTeamName) {
    return false;
  }

  if (nationality && normalizedTeamName.toLowerCase() === nationality.trim().toLowerCase()) {
    return true;
  }

  return /(U21|U20|U19|U18|U17|National)/i.test(normalizedTeamName);
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 40,
      gap: 14,
    },
    segmentedContainer: {
      marginBottom: 8,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      flexDirection: 'row',
    },
    segmentedButton: {
      flex: 1,
      borderRadius: 20,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentedButtonActive: {
      backgroundColor: colors.surfaceElevated,
    },
    segmentedLabel: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textMuted,
    },
    segmentedLabelActive: {
      color: colors.text,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      flex: 1,
      paddingRight: 10,
    },
    rowSeparator: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    seasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 10,
    },
    teamLogo: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    teamLogoFallback: {
      opacity: 0,
    },
    seasonIdentity: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    teamName: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    subText: {
      color: colors.textMuted,
      fontSize: 15,
      marginTop: 2,
    },
    seasonStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statCell: {
      width: 34,
      alignItems: 'center',
    },
    statValue: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    ratingBadge: {
      minWidth: 46,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratingText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    ratingPlaceholder: {
      minWidth: 46,
      height: 26,
    },
    metricHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metricHeaderCell: {
      width: 34,
      alignItems: 'center',
    },
    teamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 16,
    },
    teamIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    teamStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    teamStatCell: {
      width: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamStatValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    sectionSpacer: {
      marginTop: 14,
    },
    legend: {
      flexDirection: 'row',
      gap: 22,
      marginTop: 8,
      paddingLeft: 6,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 15,
      paddingVertical: 12,
      textAlign: 'center',
    },
  });
}

function TeamLogo({
  logo,
  styles,
  size = 36,
}: {
  logo: string | null;
  styles: ReturnType<typeof createStyles>;
  size?: number;
}) {
  if (logo) {
    return (
      <Image
        source={{ uri: logo }}
        style={[styles.teamLogo, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.teamLogo,
        styles.teamLogoFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  );
}

export function PlayerCareerTab({ seasons, teams, nationality }: PlayerCareerTabProps) {
  const { colors } = useAppTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<CareerViewMode>('season');

  const seasonRows = useMemo(() => {
    return [...seasons]
      .filter(season => !looksLikeNationalTeam(season.team.name, nationality))
      .sort((first, second) => {
        const firstYear = parseSeasonYear(first.season);
        const secondYear = parseSeasonYear(second.season);
        if (secondYear !== firstYear) {
          return secondYear - firstYear;
        }

        const firstMatches = typeof first.matches === 'number' ? first.matches : Number.NEGATIVE_INFINITY;
        const secondMatches = typeof second.matches === 'number' ? second.matches : Number.NEGATIVE_INFINITY;
        if (secondMatches !== firstMatches) {
          return secondMatches - firstMatches;
        }

        const firstGoals = typeof first.goals === 'number' ? first.goals : Number.NEGATIVE_INFINITY;
        const secondGoals = typeof second.goals === 'number' ? second.goals : Number.NEGATIVE_INFINITY;
        return secondGoals - firstGoals;
      });
  }, [seasons, nationality]);

  const { professionalTeams, nationalTeams } = useMemo(() => {
    const sortedTeams = [...teams].sort((first, second) => {
      const firstBounds = parsePeriodBounds(first.period);
      const secondBounds = parsePeriodBounds(second.period);

      if (secondBounds.end !== firstBounds.end) {
        return secondBounds.end - firstBounds.end;
      }

      if (secondBounds.start !== firstBounds.start) {
        return secondBounds.start - firstBounds.start;
      }

      const firstMatches = typeof first.matches === 'number' ? first.matches : Number.NEGATIVE_INFINITY;
      const secondMatches = typeof second.matches === 'number' ? second.matches : Number.NEGATIVE_INFINITY;
      if (secondMatches !== firstMatches) {
        return secondMatches - firstMatches;
      }

      const firstGoals = typeof first.goals === 'number' ? first.goals : Number.NEGATIVE_INFINITY;
      const secondGoals = typeof second.goals === 'number' ? second.goals : Number.NEGATIVE_INFINITY;
      return secondGoals - firstGoals;
    });

    const professional: PlayerCareerTeam[] = [];
    const national: PlayerCareerTeam[] = [];

    sortedTeams.forEach(team => {
      if (looksLikeNationalTeam(team.team.name, nationality)) {
        national.push(team);
        return;
      }

      professional.push(team);
    });

    return {
      professionalTeams: professional,
      nationalTeams: national,
    };
  }, [teams, nationality]);

  const renderTeamSection = (
    sectionTitle: string,
    sectionTeams: PlayerCareerTeam[],
  ) => {
    if (sectionTeams.length === 0) {
      return null;
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{sectionTitle}</Text>
          <View style={styles.metricHeader}>
            <View style={styles.metricHeaderCell}>
              <MaterialCommunityIcons
                name="ticket-confirmation-outline"
                size={21}
                color={colors.textMuted}
              />
            </View>
            <View style={styles.metricHeaderCell}>
              <MaterialCommunityIcons name="soccer" size={21} color={colors.textMuted} />
            </View>
          </View>
        </View>

        {sectionTeams.map((team, index) => {
          const matches = formatStatValue(team.matches);
          const goals = formatStatValue(team.goals);

          return (
            <View
              key={`team-${team.team.id ?? team.team.name ?? 'unknown'}-${team.period ?? index}`}
              style={[styles.teamRow, index > 0 ? styles.rowSeparator : null]}
            >
              <View style={styles.teamIdentity}>
                <TeamLogo logo={team.team.logo} styles={styles} />
                <View style={styles.seasonIdentity}>
                  {formatLabelValue(team.team.name) ? (
                    <Text style={styles.teamName} numberOfLines={1}>
                      {formatLabelValue(team.team.name)}
                    </Text>
                  ) : null}
                  {formatLabelValue(team.period) ? (
                    <Text style={styles.subText}>{formatLabelValue(team.period)}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.teamStats}>
                <View style={styles.teamStatCell}>
                  {matches ? <Text style={styles.teamStatValue}>{matches}</Text> : null}
                </View>
                <View style={styles.teamStatCell}>
                  {goals ? <Text style={styles.teamStatValue}>{goals}</Text> : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const contentItems: PlayerCareerContentItem[] = [];

  if (mode === 'season') {
    contentItems.push({
      key: 'season-career-card',
      content: (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('playerDetails.career.labels.professionalCareer')}</Text>
            <View style={styles.metricHeader}>
              <View style={styles.metricHeaderCell}>
                <MaterialCommunityIcons
                  name="ticket-confirmation-outline"
                  size={20}
                  color={colors.textMuted}
                />
              </View>
              <View style={styles.metricHeaderCell}>
                <MaterialCommunityIcons name="soccer" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.metricHeaderCell}>
                <MaterialCommunityIcons name="shoe-cleat" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.metricHeaderCell}>
                <MaterialCommunityIcons name="star" size={20} color={colors.textMuted} />
              </View>
            </View>
          </View>

          {seasonRows.length === 0 ? (
            <Text style={styles.emptyText}>{t('playerDetails.career.states.emptySeason')}</Text>
          ) : (
            seasonRows.map((season, index) => {
              const ratingLabel = formatRatingValue(season.rating, i18n.language);

              return (
                <View
                  key={`season-${season.season ?? 'unknown'}-${season.team.id ?? season.team.name ?? 'unknown'}-${season.matches ?? 'na'}-${season.goals ?? 'na'}-${season.assists ?? 'na'}-${season.rating ?? 'na'}`}
                  style={[styles.seasonRow, index > 0 ? styles.rowSeparator : null]}
                >
                  <TeamLogo logo={season.team.logo} styles={styles} />

                  <View style={styles.seasonIdentity}>
                    {formatLabelValue(season.team.name) ? (
                      <Text style={styles.teamName} numberOfLines={1}>
                        {formatLabelValue(season.team.name)}
                      </Text>
                    ) : null}
                    {formatSeasonValue(season.season) ? (
                      <Text style={styles.subText}>{formatSeasonValue(season.season)}</Text>
                    ) : null}
                  </View>

                  <View style={styles.seasonStats}>
                    <View style={styles.statCell}>
                      {formatStatValue(season.matches) ? (
                        <Text style={styles.statValue}>{formatStatValue(season.matches)}</Text>
                      ) : null}
                    </View>
                    <View style={styles.statCell}>
                      {formatStatValue(season.goals) ? (
                        <Text style={styles.statValue}>{formatStatValue(season.goals)}</Text>
                      ) : null}
                    </View>
                    <View style={styles.statCell}>
                      {formatStatValue(season.assists) ? (
                        <Text style={styles.statValue}>{formatStatValue(season.assists)}</Text>
                      ) : null}
                    </View>
                    {ratingLabel ? (
                      <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(season.rating) }]}>
                        <Text style={styles.ratingText}>
                          {ratingLabel}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.ratingPlaceholder} />
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      ),
    });
  } else {
    if (professionalTeams.length > 0) {
      const professionalSection = renderTeamSection(
        t('playerDetails.career.labels.professionalCareer'),
        professionalTeams,
      );
      if (professionalSection) {
        contentItems.push({
          key: 'professional-team-section',
          content: professionalSection,
        });
      }
    }

    if (nationalTeams.length > 0) {
      const nationalSection = renderTeamSection(
        t('playerDetails.career.labels.nationalTeam'),
        nationalTeams,
      );
      if (nationalSection) {
        contentItems.push({
          key: 'national-team-section',
          content: (
            <View style={professionalTeams.length > 0 ? styles.sectionSpacer : null}>
              {nationalSection}
            </View>
          ),
        });
      }
    }

    if (professionalTeams.length === 0 && nationalTeams.length === 0) {
      contentItems.push({
        key: 'team-empty-state',
        content: (
          <Text style={styles.emptyText}>{t('playerDetails.career.states.emptyTeam')}</Text>
        ),
      });
    }

    contentItems.push({
      key: 'team-legend',
      content: (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <MaterialCommunityIcons
              name="ticket-confirmation-outline"
              size={18}
              color={colors.textMuted}
            />
            <Text style={styles.legendText}>{t('playerDetails.career.labels.matchesPlayed')}</Text>
          </View>
          <View style={styles.legendItem}>
            <MaterialCommunityIcons name="soccer" size={18} color={colors.textMuted} />
            <Text style={styles.legendText}>{t('playerDetails.career.labels.goals')}</Text>
          </View>
        </View>
      ),
    });
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={contentItems}
        keyExtractor={item => item.key}
        getItemType={() => 'player-career-section'}
        // @ts-ignore FlashList runtime supports estimatedItemSize.
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
