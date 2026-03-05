import { useCallback, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';

import { CompetitionSection } from '@ui/features/matches/components/CompetitionSection';
import { DateChipsRow } from '@ui/features/matches/components/DateChipsRow';
import { FullScreenCalendarModal } from '@ui/features/matches/components/FullScreenCalendarModal';
import { MatchNotificationModal } from '@ui/features/matches/components/MatchNotificationModal';
import { MatchesHeader } from '@ui/features/matches/components/MatchesHeader';
import { HiddenCompetitionsModal } from '@ui/features/matches/components/HiddenCompetitionsModal';
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

type HiddenCompetitionItem = {
  id: string;
  name: string;
};

type MatchesScreenContentProps = {
  styles: {
    listContent: StyleProp<ViewStyle>;
    listHeader: StyleProp<ViewStyle>;
  };
  listData: MatchesFeedItem[];
  selectedDate: Date;
  statusFilter: MatchStatusFilter;
  followedOnly: boolean;
  collapsedSections: Record<string, boolean>;
  isCalendarModalVisible: boolean;
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
  onToggleFollowedOnly: () => void;
  onToggleSection: (sectionId: string) => void;
  onPressMatch: (match: MatchItem) => void;
  onToggleMatchFollow: (match: MatchItem) => void;
  isMatchFollowed: (fixtureId: string) => boolean;
  onPressTeam: (teamId: string) => void;
  onPressNotification: (match: MatchItem) => void;
  onPressCalendar: () => void;
  onPressSearch: () => void;
  onRetry: () => void;
  onCloseCalendarModal: () => void;
  onCloseNotificationModal: () => void;
  onSaveNotificationPrefs: (prefs: MatchNotificationPrefs) => void;
  onHideCompetition: (competitionId: string) => void;
  onUnhideCompetition: (competitionId: string) => void;
  hiddenCompetitions: HiddenCompetitionItem[];
  isManageHiddenModalVisible: boolean;
  onCloseManageHiddenModal: () => void;
};

export function MatchesScreenContent({
  styles,
  listData,
  selectedDate,
  statusFilter,
  followedOnly,
  collapsedSections,
  isCalendarModalVisible,
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
  onToggleFollowedOnly,
  onToggleSection,
  onPressMatch,
  onToggleMatchFollow,
  isMatchFollowed,
  onPressTeam,
  onPressNotification,
  onPressCalendar,
  onPressSearch,
  onRetry,
  onCloseCalendarModal,
  onCloseNotificationModal,
  onSaveNotificationPrefs,

  onUnhideCompetition,
  hiddenCompetitions,
  isManageHiddenModalVisible,
  onCloseManageHiddenModal,
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
          onToggleMatchFollow={onToggleMatchFollow}
          isMatchFollowed={isMatchFollowed}
          onPressNotification={onPressNotification}
          onPressHomeTeam={onPressTeam}
          onPressAwayTeam={onPressTeam}
        />
      );
    },
    [
      collapsedSections,
      isMatchFollowed,
      onPressMatch,
      onPressNotification,
      onPressTeam,
      onToggleMatchFollow,
      onToggleSection,
    ],
  );
  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.listHeader}>
        <MatchesHeader
          onPressCalendar={onPressCalendar}
          onPressSearch={onPressSearch}
        />
        <DateChipsRow selectedDate={selectedDate} onSelectDate={onSelectDate} />
        <StatusFiltersRow
          filter={statusFilter}
          onFilterChange={onFilterChange}
          followedOnly={followedOnly}
          onToggleFollowedOnly={onToggleFollowedOnly}
        />

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
      onPressSearch,
      onRetry,
      onSelectDate,
      onToggleFollowedOnly,
      selectedDate,
      showEmpty,
      showError,
      showErrorBanner,
      showLoading,
      showOfflineBanner,
      showOfflineWithoutCache,
      statusFilter,
      followedOnly,
      styles.listHeader,
    ],
  );

  return (
    <>
      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={item => item.type}
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

      <FullScreenCalendarModal
        visible={isCalendarModalVisible}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onClose={onCloseCalendarModal}
      />

      <HiddenCompetitionsModal
        visible={isManageHiddenModalVisible}
        onClose={onCloseManageHiddenModal}
        hiddenCompetitions={hiddenCompetitions}
        onUnhide={onUnhideCompetition}
      />
    </>
  );
}
