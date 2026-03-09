import { useCallback, useState } from 'react';

import {
  getNotificationSubscriptions,
  upsertNotificationSubscriptions,
} from '@data/endpoints/notificationsApi';
import {
  buildNotificationSubscriptions,
  hydrateNotificationToggles,
} from '@data/notifications/subscriptionMappings';
import type { CompetitionNotificationPrefs } from '@ui/features/competitions/components/CompetitionNotificationModal';
import {
  COMPETITION_ALERT_MAP,
  COMPETITION_NOTIFICATION_DEFAULTS,
  COMPETITION_NOTIFICATION_TOGGLE_DEFAULTS,
} from '@ui/features/competitions/notifications/competitionNotificationConfig';

type UseCompetitionNotificationPrefsParams = {
  competitionId: string | null;
  isCompetitionFollowed: boolean;
  closeModal: () => void;
};

export function useCompetitionNotificationPrefs({
  competitionId,
  isCompetitionFollowed,
  closeModal,
}: UseCompetitionNotificationPrefsParams) {
  const [notificationPrefs, setNotificationPrefs] = useState<CompetitionNotificationPrefs>({
    ...COMPETITION_NOTIFICATION_DEFAULTS,
    enabled: isCompetitionFollowed,
  });

  const loadCompetitionNotificationPrefs = useCallback(async () => {
    if (!competitionId) {
      return;
    }

    try {
      const subscriptions = await getNotificationSubscriptions({
        scopeKind: 'competition',
        scopeId: competitionId,
      });
      const toggles = hydrateNotificationToggles(
        COMPETITION_NOTIFICATION_TOGGLE_DEFAULTS,
        COMPETITION_ALERT_MAP,
        subscriptions,
      );
      const hasEnabledAlert = Object.values(toggles).some(Boolean);
      setNotificationPrefs({
        enabled: hasEnabledAlert || isCompetitionFollowed,
        ...toggles,
      });
    } catch {
      setNotificationPrefs(current => ({
        ...current,
        enabled: isCompetitionFollowed,
      }));
    }
  }, [competitionId, isCompetitionFollowed]);

  const saveCompetitionNotificationPrefs = useCallback(
    (prefs: CompetitionNotificationPrefs) => {
      setNotificationPrefs(prefs);
      if (!competitionId) {
        closeModal();
        return;
      }

      const { enabled, ...toggles } = prefs;
      void upsertNotificationSubscriptions({
        scopeKind: 'competition',
        scopeId: competitionId,
        subscriptions: buildNotificationSubscriptions(toggles, COMPETITION_ALERT_MAP, {
          disableAll: !enabled,
        }),
      }).finally(() => {
        closeModal();
      });
    },
    [closeModal, competitionId],
  );

  return {
    notificationPrefs,
    loadCompetitionNotificationPrefs,
    saveCompetitionNotificationPrefs,
  };
}
