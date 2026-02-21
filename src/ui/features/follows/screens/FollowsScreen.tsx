import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { appEnv } from '@data/config/env';
import {
  FollowsFollowedSection,
  FollowsHeader,
  FollowsSegmentedControl,
  FollowsTrendsSection,
} from '@ui/features/follows/components';
import { useFollowsScreenModel } from '@ui/features/follows/hooks/useFollowsScreenModel';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 28,
    },
    trendsSection: {
      paddingHorizontal: 20,
      paddingTop: 14,
      gap: 12,
    },
    trendsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      marginBottom: 4,
    },
    trendsTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    trendsActionText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    infoText: {
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: '600',
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    limitError: {
      color: colors.warning,
      fontSize: 16,
      fontWeight: '700',
      paddingHorizontal: 20,
      paddingBottom: 6,
    },
  });
}

export function FollowsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const model = useFollowsScreenModel();
  const showLimitError = model.lastToggleError === 'limit_reached';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FollowsHeader
          title={t('follows.title')}
          onPressSearch={model.handleOpenSearch}
          searchA11yLabel={t('follows.search.openSearch')}
          isEditMode={model.isEditMode}
          onPressEdit={() => model.setIsEditMode(!model.isEditMode)}
          editLabel={t('follows.actions.edit')}
          saveLabel={t('follows.actions.done')}
        />

        <FollowsSegmentedControl
          selectedTab={model.selectedTab}
          onChangeTab={model.setSelectedTab}
          teamsLabel={t('follows.tabs.teams')}
          playersLabel={t('follows.tabs.players')}
        />

        {showLimitError ? (
          <Text style={styles.limitError}>
            {model.selectedTab === 'teams'
              ? t('follows.errors.maxTeams', { count: appEnv.followsMaxFollowedTeams })
              : t('follows.errors.maxPlayers', { count: appEnv.followsMaxFollowedPlayers })}
          </Text>
        ) : null}

        <FollowsFollowedSection
          selectedTab={model.selectedTab}
          teamCards={model.teamCards}
          playerCards={model.playerCards}
          isEditMode={model.isEditMode}
          onPressAdd={model.handleOpenSearch}
          onUnfollowTeam={model.handleToggleTeam}
          onUnfollowPlayer={model.handleTogglePlayer}
          onPressTeam={model.handleOpenTeamDetails}
          onPressPlayer={model.handleOpenPlayerDetails}
          labels={{
            addToFavorites: t('follows.cards.addToFavorites'),
            follow: t('follows.actions.follow'),
            unfollow: t('follows.actions.unfollow'),
            noNextMatch: t('follows.cards.noNextMatch'),
            goals: t('follows.cards.goals'),
            assists: t('follows.cards.assists'),
          }}
        />

        {model.isSectionLoading ? (
          <Text style={styles.infoText}>{t('follows.states.loading')}</Text>
        ) : null}

        <FollowsTrendsSection
          selectedTab={model.selectedTab}
          hideTrends={model.hideTrendsCurrentTab}
          followedTeamIds={model.followedTeamIds}
          followedPlayerIds={model.followedPlayerIds}
          teamTrends={model.asTeamTrends}
          playerTrends={model.asPlayerTrends}
          onToggleFollowTeam={model.handleToggleTeam}
          onToggleFollowPlayer={model.handleTogglePlayer}
          onPressTeam={model.handleOpenTeamDetails}
          onPressPlayer={model.handleOpenPlayerDetails}
          onToggleVisibility={() => {
            model
              .updateHideTrends(model.selectedTab, !model.hideTrendsCurrentTab)
              .catch(() => undefined);
          }}
          labels={{
            title: t('follows.trends.title'),
            show: t('follows.trends.show'),
            hide: t('follows.trends.hide'),
            noTrends: t('follows.states.noTrends'),
            follow: t('follows.actions.follow'),
            unfollow: t('follows.actions.unfollow'),
          }}
          styles={{
            trendsSection: styles.trendsSection,
            trendsHeader: styles.trendsHeader,
            trendsTitle: styles.trendsTitle,
            trendsActionText: styles.trendsActionText,
            infoText: styles.infoText,
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
