import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import {
  type PlayerCharacteristics,
  type PlayerPositionsData,
  type PlayerProfile,
  type PlayerProfileCompetitionStats,
  type PlayerTrophiesByClub,
} from '@ui/features/players/types/players.types';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';
import { getCountryFlagUrl } from '@ui/features/players/utils/countryFlag';
import { getRatingColor, toDisplayValue, toHeightValue, toSeasonLabel } from '@ui/features/players/utils/playerDisplay';
import { RadarChart } from './RadarChart';

type PlayerProfileTabProps = {
  profile: PlayerProfile;
  competitionStats: PlayerProfileCompetitionStats | null;
  characteristics: PlayerCharacteristics | null;
  positions: PlayerPositionsData | null;
  trophiesByClub: PlayerTrophiesByClub;
};

type InfoTileItem = {
  id: string;
  icon: string;
  label: string;
  value: string;
  flagUrl?: string | null;
};

const EMPTY_CHARACTERISTICS: PlayerCharacteristics = {
  touches: null,
  dribbles: null,
  chances: null,
  defense: null,
  duels: null,
  attack: null,
};

function hasDisplayValue(value: string | null | undefined): boolean {
  return toDisplayValue(value).length > 0;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 28,
      gap: 16,
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      flexShrink: 1,
    },
    cardSubtitle: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 19,
      marginTop: -6,
      marginBottom: 12,
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    infoTile: {
      flexGrow: 1,
      flexBasis: '31%',
      minWidth: 96,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 11,
      gap: 6,
    },
    infoTileHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    infoTileFlag: {
      width: 16,
      height: 12,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoTileLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    infoTileValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    competitionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    competitionLogoWrap: {
      width: 34,
      height: 34,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    competitionLogo: {
      width: 24,
      height: 24,
    },
    competitionMeta: {
      flex: 1,
      minWidth: 0,
    },
    competitionName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    competitionSeason: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
      marginTop: 2,
    },
    competitionKpis: {
      flexDirection: 'row',
      gap: 8,
    },
    competitionKpi: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 8,
      paddingVertical: 9,
      alignItems: 'center',
      gap: 4,
    },
    competitionKpiLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    competitionKpiLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    competitionKpiValue: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '800',
    },
    ratingBadge: {
      minWidth: 58,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratingBadgeText: {
      fontSize: 19,
      fontWeight: '800',
    },
    helperText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    },
    positionContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    positionTextColumn: {
      flex: 1,
      minWidth: 140,
      gap: 10,
    },
    positionLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    positionValue: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '700',
      lineHeight: 27,
    },
    secondaryPositionValue: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
    },
    pitchWrap: {
      flexGrow: 1,
      minWidth: 180,
      alignItems: 'center',
    },
    pitch: {
      width: '100%',
      maxWidth: 220,
      height: 250,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    pitchHalfLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: 1,
      backgroundColor: colors.border,
    },
    pitchCenterCircle: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: colors.border,
      transform: [{ translateX: -23 }, { translateY: -23 }],
    },
    pitchBoxTop: {
      position: 'absolute',
      left: '22%',
      right: '22%',
      top: 0,
      height: 36,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 0,
    },
    pitchBoxBottom: {
      position: 'absolute',
      left: '22%',
      right: '22%',
      bottom: 0,
      height: 36,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
    },
    pitchBadge: {
      position: 'absolute',
      minWidth: 38,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ translateX: -19 }, { translateY: -12 }],
    },
    pitchBadgeText: {
      fontSize: 14,
      fontWeight: '700',
    },
    trophiesWrap: {
      gap: 10,
    },
    clubCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    clubHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    clubLogoWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    clubLogo: {
      width: 24,
      height: 24,
    },
    clubName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      flex: 1,
    },
    trophyCompetitionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    trophyCount: {
      width: 24,
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'right',
    },
    trophyBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    trophyTitleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      flexWrap: 'wrap',
    },
    trophyName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      flexShrink: 1,
    },
    trophySeasons: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
    trophyDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 12,
      marginRight: 12,
    },
  });
}

export function PlayerProfileTab({
  profile,
  competitionStats,
  characteristics,
  positions,
  trophiesByClub,
}: PlayerProfileTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const infoTiles = useMemo<InfoTileItem[]>(() => {
    const entries: InfoTileItem[] = [];
    const height = toHeightValue(profile.height);
    if (height) {
      entries.push({
        id: 'height',
        icon: 'human-male-height',
        label: t('playerDetails.profile.labels.height'),
        value: `${height} ${t('playerDetails.profile.units.centimeters')}`,
      });
    }

    if (typeof profile.age === 'number') {
      entries.push({
        id: 'age',
        icon: 'calendar-account',
        label: t('playerDetails.profile.labels.age'),
        value: `${profile.age} ${t('playerDetails.profile.units.years')}`,
      });
    }

    const nationality = toDisplayValue(profile.nationality);
    if (nationality) {
      const flagUrl = getCountryFlagUrl(profile.nationality);
      entries.push({
        id: 'country',
        icon: 'flag-variant-outline',
        label: t('playerDetails.profile.labels.country'),
        value: nationality.length > 3 ? nationality.slice(0, 3).toUpperCase() : nationality.toUpperCase(),
        flagUrl,
      });
    }

    if (typeof profile.number === 'number') {
      entries.push({
        id: 'number',
        icon: 'numeric',
        label: t('playerDetails.profile.labels.number'),
        value: String(profile.number),
      });
    }

    if (hasDisplayValue(profile.foot)) {
      entries.push({
        id: 'dominantFoot',
        icon: 'shoe-cleat',
        label: t('playerDetails.profile.labels.dominantFoot'),
        value: toDisplayValue(profile.foot),
      });
    }

    if (hasDisplayValue(profile.transferValue)) {
      entries.push({
        id: 'marketValue',
        icon: 'cash-multiple',
        label: t('playerDetails.profile.labels.marketValue'),
        value: toDisplayValue(profile.transferValue),
      });
    }

    return entries;
  }, [profile.age, profile.foot, profile.height, profile.nationality, profile.number, profile.transferValue, t]);

  const competitionSeason = competitionStats ? toSeasonLabel(competitionStats.season) : '';
  const competitionRating = toDisplayValue(competitionStats?.rating);
  const shouldRenderPositions = Boolean(positions && positions.all.length > 0);
  const shouldRenderTrophies = trophiesByClub.length > 0;

  const profileCharacteristics = characteristics ?? EMPTY_CHARACTERISTICS;
  const competitionKpis = competitionStats
    ? [
        {
          id: 'matches',
          icon: 'calendar-check',
          label: t('playerDetails.profile.labels.matches'),
          value: toDisplayValue(competitionStats.matches),
        },
        {
          id: 'goals',
          icon: 'soccer',
          label: t('playerDetails.profile.labels.goals'),
          value: toDisplayValue(competitionStats.goals),
        },
        {
          id: 'assists',
          icon: 'shoe-cleat',
          label: t('playerDetails.profile.labels.assists'),
          value: toDisplayValue(competitionStats.assists),
        },
      ]
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      removeClippedSubviews
      scrollEventThrottle={16}
    >
      {infoTiles.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.infoGrid}>
            {infoTiles.map(item => (
              <View key={item.id} style={styles.infoTile} testID={`player-profile-info-${item.id}`}>
                <View style={styles.infoTileHead}>
                  {item.flagUrl ? (
                    <Image source={{ uri: item.flagUrl }} style={styles.infoTileFlag} testID={`player-profile-flag-${item.id}`} />
                  ) : (
                    <MaterialCommunityIcons name={item.icon} size={14} color={colors.textMuted} />
                  )}
                  <Text style={styles.infoTileLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
                <Text style={styles.infoTileValue} numberOfLines={1}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card} testID="player-profile-competition-card">
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="chart-box-outline" size={18} color={colors.text} />
          <Text style={styles.cardTitle}>{t('playerDetails.profile.labels.latestCompetitionStats')}</Text>
        </View>

        {competitionStats ? (
          <>
            <View style={styles.competitionHeader}>
              <View style={styles.competitionLogoWrap}>
                {competitionStats.leagueLogo ? (
                  <Image source={{ uri: competitionStats.leagueLogo }} style={styles.competitionLogo} resizeMode="contain" />
                ) : (
                  <MaterialCommunityIcons name="shield-outline" size={18} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.competitionMeta}>
                <Text style={styles.competitionName} numberOfLines={1}>
                  {toDisplayValue(competitionStats.leagueName)}
                </Text>
                {competitionSeason ? (
                  <Text style={styles.competitionSeason}>{competitionSeason}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.competitionKpis} testID="player-profile-competition-stats">
              {competitionKpis.map(kpi => (
                <View key={kpi.id} style={styles.competitionKpi}>
                  <View style={styles.competitionKpiLabelRow}>
                    <MaterialCommunityIcons name={kpi.icon} size={12} color={colors.textMuted} />
                    <Text style={styles.competitionKpiLabel}>{kpi.label}</Text>
                  </View>
                  <Text
                    style={styles.competitionKpiValue}
                    testID={`player-profile-competition-${kpi.id}-value`}
                  >
                    {kpi.value}
                  </Text>
                </View>
              ))}
              <View style={styles.competitionKpi}>
                <View style={styles.competitionKpiLabelRow}>
                  <MaterialCommunityIcons name="star-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.competitionKpiLabel}>{t('playerDetails.stats.labels.rating')}</Text>
                </View>
                <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(competitionStats.rating) || colors.border }]}>
                  <Text
                    style={[styles.ratingBadgeText, { color: colors.primaryContrast }]}
                    testID="player-profile-competition-rating-value"
                  >
                    {competitionRating}
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.helperText}>{t('playerDetails.profile.states.noCompetitionStats')}</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="radar" size={18} color={colors.text} />
          <Text style={styles.cardTitle}>{t('playerDetails.profile.labels.characteristics')}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{t('playerDetails.profile.labels.characteristicsSubtitle')}</Text>
        <RadarChart data={profileCharacteristics} size={280} />
      </View>

      {shouldRenderPositions && positions ? (
        <View style={styles.card} testID="player-profile-position-section">
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="map-marker-path" size={18} color={colors.text} />
            <Text style={styles.cardTitle}>{t('playerDetails.profile.labels.position')}</Text>
          </View>

          <View style={styles.positionContent}>
            <View style={styles.positionTextColumn}>
              <View>
                <Text style={styles.positionLabel}>{t('playerDetails.profile.labels.primaryPosition')}</Text>
                <Text style={styles.positionValue}>
                  {localizePlayerPosition(positions.primary?.label ?? '', t) || toDisplayValue(positions.primary?.label)}
                </Text>
              </View>
              {positions.others.length > 0 ? (
                <View>
                  <Text style={styles.positionLabel}>{t('playerDetails.profile.labels.otherPositions')}</Text>
                  {positions.others.map(item => (
                    <Text key={item.id} style={styles.secondaryPositionValue}>
                      {localizePlayerPosition(item.label, t) || item.label}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.pitchWrap}>
              <View style={styles.pitch}>
                <View style={styles.pitchBoxTop} />
                <View style={styles.pitchBoxBottom} />
                <View style={styles.pitchHalfLine} />
                <View style={styles.pitchCenterCircle} />
                {positions.all.map(position => (
                  <View
                    key={`position-${position.id}`}
                    style={[
                      styles.pitchBadge,
                      {
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        backgroundColor: position.isPrimary ? colors.primary : colors.surface,
                        borderColor: position.isPrimary ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pitchBadgeText,
                        { color: position.isPrimary ? colors.primaryContrast : colors.text },
                      ]}
                    >
                      {position.shortLabel}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {shouldRenderTrophies ? (
        <View style={styles.card} testID="player-profile-trophies-section">
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.text} />
            <Text style={styles.cardTitle}>{t('playerDetails.profile.labels.trophies')}</Text>
          </View>

          <View style={styles.trophiesWrap}>
            {trophiesByClub.map(clubGroup => (
              <View
                key={`${clubGroup.clubId ?? 'unknown'}-${clubGroup.clubName ?? 'unknown'}`}
                style={styles.clubCard}
              >
                <View style={styles.clubHeader}>
                  <View style={styles.clubLogoWrap}>
                    {clubGroup.clubLogo ? (
                      <Image source={{ uri: clubGroup.clubLogo }} style={styles.clubLogo} resizeMode="contain" />
                    ) : (
                      <MaterialCommunityIcons name="shield-outline" size={18} color={colors.textMuted} />
                    )}
                  </View>
                  <Text style={styles.clubName} numberOfLines={1}>
                    {toDisplayValue(clubGroup.clubName) || t('playerDetails.profile.labels.unknownClub')}
                  </Text>
                </View>

                {clubGroup.competitions.map((competition, index) => (
                  <View
                    key={`${clubGroup.clubId ?? 'unknown'}-${competition.competition}-${competition.count}-${competition.seasons.join('-')}`}
                  >
                    <View style={styles.trophyCompetitionRow}>
                      <Text style={styles.trophyCount}>{competition.count}</Text>
                      <View style={styles.trophyBody}>
                        <View style={styles.trophyTitleLine}>
                          <MaterialCommunityIcons name="trophy-variant-outline" size={16} color={colors.textMuted} />
                          <Text style={styles.trophyName}>{competition.competition}</Text>
                        </View>
                        {competition.seasons.length > 0 ? (
                          <Text style={styles.trophySeasons}>({competition.seasons.join(' • ')})</Text>
                        ) : null}
                      </View>
                    </View>
                    {index < clubGroup.competitions.length - 1 ? <View style={styles.trophyDivider} /> : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
