import { memo, useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamTrophiesData, TeamTrophyGroup } from '@ui/features/teams/types/teams.types';
import { toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamTrophiesTabProps = {
  data: TeamTrophiesData | undefined;
  isLoading: boolean;
  isError: boolean;
  hasFetched?: boolean;
  onRetry: () => void;
};

type TrophyPlaceKey = 'champion' | 'runnerUp' | 'semifinalist' | 'title';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    listContent: {
      paddingTop: 12,
      paddingBottom: 16,
    },
    stateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
      marginTop: 12,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
    retryText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    groupCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginTop: 12,
    },
    groupHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 2,
    },
    groupIcon: {
      width: 18,
      textAlign: 'center',
    },
    groupTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
      flexShrink: 1,
      lineHeight: 24,
    },
    placementsWrap: {
      marginTop: 2,
    },
    placeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingBottom: 10,
      gap: 12,
    },
    placeCount: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
      width: 26,
      textAlign: 'right',
    },
    placeBody: {
      flex: 1,
      minWidth: 0,
    },
    placeLine: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      columnGap: 6,
      rowGap: 2,
    },
    placeText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 22,
      flexShrink: 1,
    },
    seasonText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 22,
      flexShrink: 1,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
  });
}



type TeamTrophyGroupRowProps = {
  group: TeamTrophyGroup;
  placeLabels: Record<TrophyPlaceKey, string>;
  styles: ReturnType<typeof createStyles>;
};

const TeamTrophyGroupRow = memo(function TeamTrophyGroupRow({
  group,
  placeLabels,
  styles,
}: TeamTrophyGroupRowProps) {
  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeaderRow}>
        <MaterialCommunityIcons
          name="trophy-outline"
          size={18}
          color={styles.groupTitle.color}
          style={styles.groupIcon}
        />
        <Text style={styles.groupTitle}>{toDisplayValue(group.competition)}</Text>
      </View>

      <View style={styles.placementsWrap}>
        {group.placements.map((item, index) => (
          <View key={item.place}>
            <View style={styles.placeRow}>
              <Text style={styles.placeCount}>{item.count}</Text>
              <View style={styles.placeBody}>
                <View style={styles.placeLine}>
                  <Text style={styles.placeText}>
                    {placeLabels[item.place as TrophyPlaceKey] || item.place}
                  </Text>
                  {item.seasons.length > 0 ? (
                    <Text style={styles.seasonText}>({item.seasons.join(' • ')})</Text>
                  ) : null}
                </View>
              </View>
            </View>
            {index < group.placements.length - 1 ? (
              <View testID="team-trophy-placement-separator" style={styles.rowDivider} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
});

export function TeamTrophiesTab({
  data,
  isLoading,
  isError,
  hasFetched = true,
  onRetry,
}: TeamTrophiesTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeLabels: Record<TrophyPlaceKey, string> = useMemo(
    () => ({
      champion: t('teamDetails.trophies.places.champion'),
      runnerUp: t('teamDetails.trophies.places.runnerUp'),
      semifinalist: t('teamDetails.trophies.places.semifinalist'),
      title: t('teamDetails.trophies.places.title'),
    }),
    [t],
  );
  const groups = useMemo(() => data?.groups ?? [], [data?.groups]);

  const renderGroupItem = useCallback<ListRenderItem<TeamTrophyGroup>>(
    ({ item }) => (
      <TeamTrophyGroupRow
        group={item}
        placeLabels={placeLabels}
        styles={styles}
      />
    ),
    [styles, placeLabels],
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} style={{ alignSelf: 'center' }} />
        </View>
      ) : null}

      {isError ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
          <Pressable onPress={onRetry}>
            <Text style={styles.retryText}>{t('actions.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !isError ? (
        <FlashList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={96}
          ListEmptyComponent={
            hasFetched ? <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text> : null
          }
        />
      ) : null}
    </View>
  );
}
