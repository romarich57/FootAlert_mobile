import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { SearchResultsList } from '@ui/features/search/components/SearchResultsList';
import { useSearchScreenModel } from '@ui/features/search/hooks/useSearchScreenModel';
import type { SearchEntityTab } from '@ui/features/search/types/search.types';
import type { ThemeColors } from '@ui/shared/theme/theme';

type SearchTabItem = {
  id: SearchEntityTab;
  testId: string;
  translationKey: string;
};

const SEARCH_TABS: SearchTabItem[] = [
  { id: 'all', testId: 'search-screen-tab-all', translationKey: 'screens.search.tabs.all' },
  { id: 'teams', testId: 'search-screen-tab-teams', translationKey: 'screens.search.tabs.teams' },
  {
    id: 'competitions',
    testId: 'search-screen-tab-competitions',
    translationKey: 'screens.search.tabs.competitions',
  },
  {
    id: 'players',
    testId: 'search-screen-tab-players',
    translationKey: 'screens.search.tabs.players',
  },
  {
    id: 'matches',
    testId: 'search-screen-tab-matches',
    translationKey: 'screens.search.tabs.matches',
  },
];

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingTop: 8,
      gap: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 48,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      paddingVertical: 0,
    },
    clearButton: {
      height: 32,
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentedControl: {
      marginHorizontal: 16,
    },
    segment: {
      borderRadius: 18,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    segmentActive: {
      backgroundColor: colors.surfaceElevated,
    },
    segmentText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
    },
    segmentTextActive: {
      color: colors.text,
    },
    segmentedContentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
      paddingRight: 10,
    },
    segmentedTrack: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 4,
    },
  });
}

function getSearchPlaceholder(selectedTab: SearchEntityTab, t: (key: string) => string): string {
  if (selectedTab === 'teams') {
    return t('screens.search.placeholderTeams');
  }

  if (selectedTab === 'competitions') {
    return t('screens.search.placeholderCompetitions');
  }

  if (selectedTab === 'players') {
    return t('screens.search.placeholderPlayers');
  }

  if (selectedTab === 'matches') {
    return t('screens.search.placeholderMatches');
  }

  return t('screens.search.placeholderAll');
}

export function SearchScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const model = useSearchScreenModel();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.textMuted} />
          <TextInput
            testID="search-screen-input"
            style={styles.searchInput}
            placeholder={getSearchPlaceholder(model.selectedTab, t)}
            placeholderTextColor={colors.textMuted}
            value={model.query}
            onChangeText={model.setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {model.query.trim().length > 0 ? (
            <Pressable
              testID="search-screen-clear-button"
              style={styles.clearButton}
              onPress={model.handleClearQuery}
              accessibilityRole="button"
              accessibilityLabel={t('screens.search.clear')}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.segmentedControl} accessibilityRole="tablist">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentedContentContainer}
          >
            {SEARCH_TABS.map(tab => {
              const isSelected = model.selectedTab === tab.id;
              return (
                <View key={tab.id} style={styles.segmentedTrack}>
                  <Pressable
                    testID={tab.testId}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => model.handleSelectTab(tab.id)}
                    style={[styles.segment, isSelected ? styles.segmentActive : null]}
                  >
                    <Text style={[styles.segmentText, isSelected ? styles.segmentTextActive : null]}>
                      {t(tab.translationKey)}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <SearchResultsList
          selectedTab={model.selectedTab}
          hasEnoughChars={model.hasEnoughChars}
          query={model.query}
          teamResults={model.teamResults}
          playerResults={model.playerResults}
          competitionResults={model.competitionResults}
          matchResults={model.matchResults}
          isLoading={model.isLoading}
          isError={model.isError}
          onRetry={() => {
            model.retry().catch(() => undefined);
          }}
          onPressTeam={model.handlePressTeam}
          onPressPlayer={model.handlePressPlayer}
          onPressCompetition={model.handlePressCompetition}
          onPressMatch={model.handlePressMatch}
        />
      </View>
    </SafeAreaView>
  );
}
