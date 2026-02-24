import { memo, useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      gap: 10,
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
      fontSize: 15,
      fontWeight: '600',
    },
    retryText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
    summaryCard: {
      marginTop: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10,
    },
    summaryTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    summaryLabel: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: '700',
    },
    summaryValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    groupCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginTop: 10,
      gap: 8,
    },
    groupHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    },
    groupTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    placeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 12,
      gap: 12,
    },
    placeCount: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
      width: 24,
      textAlign: 'right',
    },
    placeInfo: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    placeText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    seasonText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
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
        <MaterialCommunityIcons name="trophy-outline" size={20} color={styles.groupTitle.color} />
        <Text style={styles.groupTitle}>{toDisplayValue(group.competition)}</Text>
      </View>

      {group.placements.map((item, index) => (
        <View key={index} style={styles.placeRow}>
          <Text style={styles.placeCount}>{item.count}</Text>
          <View style={styles.placeInfo}>
            <Text style={styles.placeText}>{placeLabels[item.place as TrophyPlaceKey] || item.place}</Text>
            {item.seasons.length > 0 ? (
              <Text style={styles.seasonText}>({item.seasons.join(' • ')})</Text>
            ) : null}
          </View>
        </View>
      ))}
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
          <Text style={styles.stateText}>{t('teamDetails.states.loading')}</Text>
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
          // @ts-ignore FlashList runtime supports estimatedItemSize.
          estimatedItemSize={96}
          ListEmptyComponent={
            hasFetched ? <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text> : null
          }
        />
      ) : null}
    </View>
  );
}
