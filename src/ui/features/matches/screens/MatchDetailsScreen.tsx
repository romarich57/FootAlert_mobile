import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { fetchFixtureById } from '@data/endpoints/matchesApi';
import {
  classifyFixtureStatus,
  formatStatusLabel,
} from '@data/mappers/fixturesMapper';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { IconActionButton } from '@ui/shared/components';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { MIN_TOUCH_TARGET, type ThemeColors } from '@ui/shared/theme/theme';

type MatchDetailsRoute = RouteProp<RootStackParamList, 'MatchDetails'>;
type MatchDetailsNavigation = NativeStackNavigationProp<RootStackParamList, 'MatchDetails'>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 16,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 24,
      backgroundColor: colors.background,
    },
    backButton: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      borderRadius: MIN_TOUCH_TARGET / 2,
      backgroundColor: colors.surface,
    },
    competitionName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    competitionCountry: {
      color: colors.textMuted,
      fontSize: 14,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      gap: 14,
    },
    teamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    teamName: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    score: {
      minWidth: 70,
      textAlign: 'center',
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
    },
    detailsLabel: {
      color: colors.textMuted,
      fontSize: 13,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    detailsValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 8,
    },
    errorText: {
      color: colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    retryText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}

function formatDateTime(dateIso: string | undefined): string {
  if (!dateIso) {
    return '';
  }
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) {
    return '';
  }
  return `${home} - ${away}`;
}

export function MatchDetailsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<MatchDetailsNavigation>();
  const route = useRoute<MatchDetailsRoute>();
  const safeMatchId = sanitizeNumericEntityId(route.params.matchId);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );

  const fixtureQuery = useQuery({
    queryKey: queryKeys.matchDetails(safeMatchId ?? 'invalid', timezone),
    queryFn: ({ signal }) =>
      fetchFixtureById({ fixtureId: safeMatchId ?? '', timezone, signal }),
    enabled: Boolean(safeMatchId),
    ...featureQueryOptions.matches.details,
  });

  const fixture = fixtureQuery.data;

  if (!safeMatchId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('matchDetails.states.error')}</Text>
      </View>
    );
  }

  if (fixtureQuery.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.errorText}>{t('matchDetails.states.loading')}</Text>
      </View>
    );
  }

  if (fixtureQuery.isError || !fixture) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('matchDetails.states.error')}</Text>
        <Pressable onPress={() => fixtureQuery.refetch()}>
          <Text style={styles.retryText}>{t('actions.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const matchStatus = classifyFixtureStatus(fixture.fixture.status.short);
  const statusLabel =
    matchStatus === 'upcoming'
      ? t('matches.status.upcoming')
      : formatStatusLabel(
          matchStatus,
          fixture.fixture.status.elapsed,
          fixture.fixture.status.short,
        );

  return (
    <View style={styles.container}>
      <IconActionButton
        accessibilityLabel={t('actions.back')}
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
      </IconActionButton>

      <View>
        <Text style={styles.competitionName}>{fixture.league.name}</Text>
        <Text style={styles.competitionCountry}>{fixture.league.country}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.teamsRow}>
          <Text style={styles.teamName}>{fixture.teams.home.name}</Text>
          <Text style={styles.score}>
            {formatScore(fixture.goals.home, fixture.goals.away)}
          </Text>
          <Text style={styles.teamName}>{fixture.teams.away.name}</Text>
        </View>

        <View>
          <Text style={styles.detailsLabel}>{t('matchDetails.labels.status')}</Text>
          <Text style={styles.detailsValue}>{statusLabel}</Text>

          <Text style={styles.detailsLabel}>{t('matchDetails.labels.kickoff')}</Text>
          <Text style={styles.detailsValue}>
            {formatDateTime(fixture.fixture.date)}
          </Text>

          <Text style={styles.detailsLabel}>{t('matchDetails.labels.venue')}</Text>
          <Text style={styles.detailsValue}>{fixture.fixture.venue.name ?? ''}</Text>
        </View>
      </View>
    </View>
  );
}
