import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { OnboardingStep as OnboardingStepType, OnboardingTab } from '@ui/features/onboarding/types/onboarding.types';
import { OnboardingEntityCard, type OnboardingEntityCardData } from '@ui/features/onboarding/components/OnboardingEntityCard';
import { OnboardingSearchBar } from '@ui/features/onboarding/components/OnboardingSearchBar';
import { useOnboardingTrends } from '@ui/features/onboarding/hooks/useOnboardingTrends';
import { useOnboardingSearch } from '@ui/features/onboarding/hooks/useOnboardingSearch';

type Props = {
  step: OnboardingStepType;
  selectedTab: OnboardingTab;
  onTabChange: (tab: OnboardingTab) => void;
  followedIds: string[];
  onToggleFollow: (id: string) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    tabItem: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.primary,
    },
    tabIndicator: {
      height: 2,
      marginTop: 6,
      borderRadius: 1,
      backgroundColor: 'transparent',
    },
    tabIndicatorActive: {
      backgroundColor: colors.primary,
    },
    list: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
  });
}

function EmptyState({ text, colors }: { text: string; colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function TrendingTab({
  step,
  followedIds,
  onToggleFollow,
  colors,
}: {
  step: OnboardingStepType;
  followedIds: string[];
  onToggleFollow: (id: string) => void;
  colors: ThemeColors;
}) {
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: items = [], isLoading } = useOnboardingTrends(step);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return <EmptyState text={t('onboarding.empty.trending')} colors={colors} />;
  }

  return (
    <FlashList
      data={items}
      estimatedItemSize={72}
      keyExtractor={item => item.id}
      renderItem={({ item }: { item: OnboardingEntityCardData }) => (
        <OnboardingEntityCard
          item={item}
          isFollowing={followedIds.includes(item.id)}
          onToggleFollow={onToggleFollow}
        />
      )}
      contentContainerStyle={listContentStyle}
    />
  );
}

const listContentStyle = { paddingBottom: 8 };

function SearchTab({
  step,
  followedIds,
  onToggleFollow,
  colors,
}: {
  step: OnboardingStepType;
  followedIds: string[];
  onToggleFollow: (id: string) => void;
  colors: ThemeColors;
}) {
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { query, setQuery, results, isLoading, hasEnoughChars } = useOnboardingSearch(step);

  const placeholderKey =
    step === 'teams'
      ? 'onboarding.search.placeholder.teams'
      : step === 'competitions'
        ? 'onboarding.search.placeholder.competitions'
        : 'onboarding.search.placeholder.players';

  return (
    <>
      <OnboardingSearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t(placeholderKey)}
      />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !hasEnoughChars || results.length === 0 ? (
        hasEnoughChars ? (
          <EmptyState text={t('onboarding.empty.search')} colors={colors} />
        ) : null
      ) : (
        <FlashList
          data={results}
          estimatedItemSize={72}
          keyExtractor={item => item.id}
          renderItem={({ item }: { item: OnboardingEntityCardData }) => (
            <OnboardingEntityCard
              item={item}
              isFollowing={followedIds.includes(item.id)}
              onToggleFollow={onToggleFollow}
            />
          )}
          contentContainerStyle={listContentStyle}
        />
      )}
    </>
  );
}

export function OnboardingStep({
  step,
  selectedTab,
  onTabChange,
  followedIds,
  onToggleFollow,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {(['trending', 'search'] as const).map(tab => {
          const isActive = selectedTab === tab;
          const label =
            tab === 'trending' ? t('onboarding.tabs.trending') : t('onboarding.tabs.search');
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => onTabChange(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                {label}
              </Text>
              <View style={[styles.tabIndicator, isActive ? styles.tabIndicatorActive : null]} />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.list}>
        {selectedTab === 'trending' ? (
          <TrendingTab
            step={step}
            followedIds={followedIds}
            onToggleFollow={onToggleFollow}
            colors={colors}
          />
        ) : (
          <SearchTab
            step={step}
            followedIds={followedIds}
            onToggleFollow={onToggleFollow}
            colors={colors}
          />
        )}
      </View>
    </View>
  );
}
