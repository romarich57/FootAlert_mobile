import { useMemo } from 'react';
import {
  Pressable,
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
import type { ThemeColors } from '@ui/shared/theme/theme';

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
      flexDirection: 'row',
      marginHorizontal: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 4,
    },
    segment: {
      flex: 1,
      borderRadius: 18,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
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
  });
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
            placeholder={
              model.selectedTab === 'teams'
                ? t('screens.search.placeholderTeams')
                : t('screens.search.placeholderPlayers')
            }
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
          <Pressable
            testID="search-screen-tab-teams"
            accessibilityRole="tab"
            accessibilityState={{ selected: model.selectedTab === 'teams' }}
            onPress={() => model.handleSelectTab('teams')}
            style={[styles.segment, model.selectedTab === 'teams' ? styles.segmentActive : null]}
          >
            <Text
              style={[
                styles.segmentText,
                model.selectedTab === 'teams' ? styles.segmentTextActive : null,
              ]}
            >
              {t('screens.search.tabs.teams')}
            </Text>
          </Pressable>
          <Pressable
            testID="search-screen-tab-players"
            accessibilityRole="tab"
            accessibilityState={{ selected: model.selectedTab === 'players' }}
            onPress={() => model.handleSelectTab('players')}
            style={[styles.segment, model.selectedTab === 'players' ? styles.segmentActive : null]}
          >
            <Text
              style={[
                styles.segmentText,
                model.selectedTab === 'players' ? styles.segmentTextActive : null,
              ]}
            >
              {t('screens.search.tabs.players')}
            </Text>
          </Pressable>
        </View>

        <SearchResultsList
          selectedTab={model.selectedTab}
          hasEnoughChars={model.hasEnoughChars}
          query={model.query}
          teamResults={model.teamResults}
          playerResults={model.playerResults}
          isLoading={model.isLoading}
          isError={model.isError}
          onRetry={() => {
            model.retry().catch(() => undefined);
          }}
          onPressTeam={model.handlePressTeam}
          onPressPlayer={model.handlePressPlayer}
        />
      </View>
    </SafeAreaView>
  );
}
