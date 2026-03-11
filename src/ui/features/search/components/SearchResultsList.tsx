import { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { appEnv } from '@data/config/env';
import { resolveAppLocaleTag } from '@ui/shared/i18n/locale';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { getMatchStatusLabel } from '@ui/features/matches/utils/getMatchStatusLabel';
import { buildSearchItems, formatMatchKickoff } from '@ui/features/search/components/searchResultsItems';
import type {
  SearchEntityTab,
} from '@ui/features/search/types/search.types';
import { createSearchResultsListStyles } from '@ui/features/search/components/SearchResultsList.styles';
import { SearchResultsState } from '@ui/features/search/components/SearchResultsState';
import {
  SearchCompetitionRow,
  SearchMatchRow,
  SearchPlayerRow,
  SearchSectionHeader,
  SearchTeamRow,
} from '@ui/features/search/components/SearchResultRows';
import type {
  SearchCompetitionResult,
  SearchMatchResult,
  SearchPlayerResult,
  SearchTeamResult,
} from '@ui/features/search/types/search.types';

type SearchResultsListProps = {
  selectedTab: SearchEntityTab;
  hasEnoughChars: boolean;
  query: string;
  teamResults: SearchTeamResult[];
  playerResults: SearchPlayerResult[];
  competitionResults: SearchCompetitionResult[];
  matchResults: SearchMatchResult[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPressTeam: (teamId: string) => void;
  onPressPlayer: (playerId: string) => void;
  onPressCompetition: (competitionId: string) => void;
  onPressMatch: (fixtureId: string) => void;
};

export function SearchResultsList({
  selectedTab,
  hasEnoughChars,
  query,
  teamResults,
  playerResults,
  competitionResults,
  matchResults,
  isLoading,
  isError,
  onRetry,
  onPressTeam,
  onPressPlayer,
  onPressCompetition,
  onPressMatch,
}: SearchResultsListProps) {
  const { colors } = useAppTheme();
  const { i18n, t } = useTranslation();
  const styles = useMemo(() => createSearchResultsListStyles(colors), [colors]);
  const localeTag = useMemo(() => resolveAppLocaleTag(i18n.language), [i18n.language]);

  const items = useMemo(
    () =>
      buildSearchItems(
        selectedTab,
        {
          teams: t('screens.search.tabs.teams'),
          competitions: t('screens.search.tabs.competitions'),
          players: t('screens.search.tabs.players'),
          matches: t('screens.search.tabs.matches'),
        },
        teamResults,
        competitionResults,
        playerResults,
        matchResults,
      ),
    [competitionResults, matchResults, playerResults, selectedTab, t, teamResults],
  );
  const hasEmptyQuerySuggestions =
    !query.trim().length &&
    ((selectedTab === 'teams' && teamResults.length > 0) ||
      (selectedTab === 'players' && playerResults.length > 0));

  if (!query.trim().length) {
    if (hasEmptyQuerySuggestions) {
      return (
        <FlashList
          key={`search-suggestions-${selectedTab}`}
          data={items}
          keyExtractor={item => item.key}
          getItemType={item => item.type}
          estimatedItemSize={74}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            if (item.type === 'section-header') {
              return <SearchSectionHeader title={item.title} styles={styles} />;
            }

            if (item.type === 'team') {
              return <SearchTeamRow item={item.item} styles={styles} onPress={onPressTeam} />;
            }

            if (item.type === 'player') {
              return (
                <SearchPlayerRow item={item.item} styles={styles} t={t} onPress={onPressPlayer} />
              );
            }

            return null;
          }}
        />
      );
    }

    if (isLoading && (selectedTab === 'teams' || selectedTab === 'players')) {
      return <SearchResultsState message={t('screens.search.loading')} styles={styles} />;
    }

    if (isError && (selectedTab === 'teams' || selectedTab === 'players')) {
      return (
        <SearchResultsState
          message={t('screens.search.error')}
          retryLabel={t('actions.retry')}
          onRetry={onRetry}
          styles={styles}
        />
      );
    }

    return <SearchResultsState message={t('screens.search.hint')} styles={styles} />;
  }

  if (!hasEnoughChars) {
    return (
      <SearchResultsState
        message={t('screens.search.minChars', { count: appEnv.followsSearchMinChars })}
        styles={styles}
      />
    );
  }

  if (isLoading) {
    return <SearchResultsState message={t('screens.search.loading')} styles={styles} />;
  }

  if (isError) {
    return (
      <SearchResultsState
        message={t('screens.search.error')}
        retryLabel={t('actions.retry')}
        onRetry={onRetry}
        styles={styles}
      />
    );
  }

  if (items.length === 0) {
    return <SearchResultsState message={t('screens.search.empty')} styles={styles} />;
  }

  return (
    <FlashList
      key={`search-results-${selectedTab}`}
      data={items}
      keyExtractor={item => item.key}
      getItemType={item => item.type}
      estimatedItemSize={74}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        if (item.type === 'section-header') {
          return <SearchSectionHeader title={item.title} styles={styles} />;
        }

        if (item.type === 'team') {
          return <SearchTeamRow item={item.item} styles={styles} onPress={onPressTeam} />;
        }

        if (item.type === 'player') {
          return (
            <SearchPlayerRow item={item.item} styles={styles} t={t} onPress={onPressPlayer} />
          );
        }

        if (item.type === 'competition') {
          return (
            <SearchCompetitionRow
              item={item.item}
              styles={styles}
              iconColor={colors.textMuted}
              onPress={onPressCompetition}
            />
          );
        }

        return (
          <SearchMatchRow
            item={item.item}
            styles={styles}
            iconColor={colors.textMuted}
            kickoff={formatMatchKickoff(item.item.kickoffAt, localeTag)}
            statusLabel={getMatchStatusLabel(
              {
                short: item.item.statusShort,
                long: item.item.statusShort,
                elapsed: null,
              },
              t,
            )}
            t={t}
            onPress={onPressMatch}
          />
        );
      }}
    />
  );
}
