import { useCallback, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';

import { CompetitionSection } from '@ui/features/matches/components/CompetitionSection';
import { DateChipsRow } from '@ui/features/matches/components/DateChipsRow';
import { MatchNotificationModal } from '@ui/features/matches/components/MatchNotificationModal';
import { MatchesHeader } from '@ui/features/matches/components/MatchesHeader';
import { PartnerBannerCard } from '@ui/features/matches/components/PartnerBannerCard';
import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';
import { StatusFiltersRow } from '@ui/features/matches/components/StatusFiltersRow';
import type {
  CompetitionSection as CompetitionSectionType,
  MatchItem,
  MatchNotificationPrefs,
  MatchStatusFilter,
} from '@ui/features/matches/types/matches.types';

type MatchesFeedItem =
  | {
      type: 'section';
      key: string;
      section: CompetitionSectionType;
    }
  | {
      type: 'ad';
      key: string;
    };

type MatchesScreenContentProps = {
  styles: {
    listContent: StyleProp<ViewStyle>;
    listHeader: StyleProp<ViewStyle>;
  };
  listData: MatchesFeedItem[];
  selectedDate: Date;
  statusFilter: MatchStatusFilter;
  collapsedSections: Record<string, boolean>;
  isRefetching: boolean;
  showLoading: boolean;
  showError: boolean;
  showOfflineBanner: boolean;
  showOfflineWithoutCache: boolean;
  showEmpty: boolean;
  showErrorBanner: boolean;
  isSlowNetwork: boolean;
  lastUpdatedAt: string | null;
  notificationModalMatch: MatchItem | null;
  notificationPrefs: MatchNotificationPrefs;
  onSelectDate: (date: Date) => void;
  onFilterChange: (filter: MatchStatusFilter) => void;
  onToggleSection: (sectionId: string) => void;
  onPressMatch: (match: MatchItem) => void;
  onPressTeam: (teamId: string) => void;
  onPressNotification: (match: MatchItem) => void;
  onPressCalendar: () => void;
  onPressSearch: () => void;
  onPressNotifications: () => void;
  onRetry: () => void;
  onCloseNotificationModal: () => void;
  onSaveNotificationPrefs: (prefs: MatchNotificationPrefs) => void;
};

export function MatchesScreenContent({
  styles,
  listData,
  selectedDate,
  statusFilter,
  collapsedSections,
  isRefetching,
  showLoading,
  showError,
  showOfflineBanner,
  showOfflineWithoutCache,
  showEmpty,
  showErrorBanner,
  isSlowNetwork,
  lastUpdatedAt,
  notificationModalMatch,
  notificationPrefs,
  onSelectDate,
  onFilterChange,
  onToggleSection,
  onPressMatch,
  onPressTeam,
  onPressNotification,
  onPressCalendar,
  onPressSearch,
  onPressNotifications,
  onRetry,
  onCloseNotificationModal,
  onSaveNotificationPrefs,
}: MatchesScreenContentProps) {
  const keyExtractor = useCallback((item: MatchesFeedItem) => item.key, []);
  const renderItem = useCallback<ListRenderItem<MatchesFeedItem>>(
    ({ item }) => {
      if (item.type === 'ad') {
        return <PartnerBannerCard />;
      }

      return (
        <CompetitionSection
          section={item.section}
          collapsed={Boolean(collapsedSections[item.section.id])}
          onToggle={onToggleSection}
          onPressMatch={onPressMatch}
          onPressNotification={onPressNotification}
          onPressHomeTeam={onPressTeam}
          onPressAwayTeam={onPressTeam}
        />
      );
    },
    [collapsedSections, onPressMatch, onPressNotification, onPressTeam, onToggleSection],
  );
  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.listHeader}>
        <MatchesHeader
          onPressCalendar={onPressCalendar}
          onPressSearch={onPressSearch}
          onPressNotifications={onPressNotifications}
        />
        <DateChipsRow selectedDate={selectedDate} onSelectDate={onSelectDate} />
        <StatusFiltersRow filter={statusFilter} onFilterChange={onFilterChange} />

        {showLoading ? <ScreenStateView state="loading" /> : null}
        {showError ? <ScreenStateView state="error" onRetry={onRetry} /> : null}
        {showOfflineBanner ? (
          <ScreenStateView state="offline" lastUpdatedAt={lastUpdatedAt} />
        ) : null}
        {showOfflineWithoutCache ? (
          <ScreenStateView state="offline" lastUpdatedAt={lastUpdatedAt} />
        ) : null}
        {showErrorBanner ? <ScreenStateView state="error" onRetry={onRetry} /> : null}
        {isSlowNetwork ? <ScreenStateView state="slow" /> : null}
        {showEmpty ? <ScreenStateView state="empty" /> : null}
      </View>
    ),
    [
      isSlowNetwork,
      lastUpdatedAt,
      onFilterChange,
      onPressCalendar,
      onPressNotifications,
      onPressSearch,
      onRetry,
      onSelectDate,
      selectedDate,
      showEmpty,
      showError,
      showErrorBanner,
      showLoading,
      showOfflineBanner,
      showOfflineWithoutCache,
      statusFilter,
      styles.listHeader,
    ],
  );

  return (
    <>
      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        // @ts-ignore FlashList runtime supports estimatedItemSize.
        estimatedItemSize={420}
        refreshing={isRefetching}
        onRefresh={onRetry}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeaderComponent}
      />

      <MatchNotificationModal
        key={notificationModalMatch?.fixtureId ?? 'notification-modal'}
        visible={Boolean(notificationModalMatch)}
        initialPrefs={notificationPrefs}
        onClose={onCloseNotificationModal}
        onSave={onSaveNotificationPrefs}
      />
    </>
  );
}
