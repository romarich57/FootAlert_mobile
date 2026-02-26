import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { MatchesScreenContent } from '@ui/features/matches/components/MatchesScreenContent';
import { useMatchesScreenModel } from '@ui/features/matches/hooks/useMatchesScreenModel';
import type { ThemeColors } from '@ui/shared/theme/theme';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 18,
      gap: 20,
    },
    listHeader: {
      gap: 18,
      paddingBottom: 6,
    },
  });
}

export function MatchesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const model = useMatchesScreenModel();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MatchesScreenContent
        styles={{
          listContent: styles.listContent,
          listHeader: styles.listHeader,
        }}
        listData={model.listData}
        selectedDate={model.selectedDate}
        statusFilter={model.statusFilter}
        collapsedSections={model.collapsedSections}
        isRefetching={model.isRefetching}
        showLoading={model.showLoading}
        showError={model.showError}
        showOfflineBanner={model.showOfflineBanner}
        showOfflineWithoutCache={model.showOfflineWithoutCache}
        showEmpty={model.showEmpty}
        showErrorBanner={model.showErrorBanner}
        isSlowNetwork={model.isSlowNetwork}
        lastUpdatedAt={model.lastUpdatedAt}
        notificationModalMatch={model.notificationModalMatch}
        notificationPrefs={model.notificationPrefs}
        onSelectDate={model.setSelectedDate}
        onFilterChange={model.setStatusFilter}
        onToggleSection={model.handleToggleSection}
        onPressMatch={model.handlePressMatch}
        onPressTeam={model.handlePressTeam}
        onPressNotification={model.handlePressNotification}
        onPressCalendar={model.handlePressCalendar}
        onPressSearch={model.handlePressSearch}
        onPressNotifications={model.handlePressNotifications}
        onRetry={model.refetch}
        onCloseNotificationModal={model.closeNotificationModal}
        onSaveNotificationPrefs={model.handleSaveNotificationPrefs}
        onPressManageHidden={model.handlePressManageHidden}
        onHideCompetition={model.handleHideCompetition}
        onUnhideCompetition={model.handleUnhideCompetition}
        hiddenCompetitionsIds={model.hiddenCompetitionsIds}
        isManageHiddenModalVisible={model.isManageHiddenModalVisible}
        onCloseManageHiddenModal={model.closeManageHiddenModal}
      />
    </SafeAreaView>
  );
}
