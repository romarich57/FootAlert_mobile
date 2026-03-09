import { useCallback, useState } from 'react';

import {
  getNotificationSubscriptions,
  upsertNotificationSubscriptions,
} from '@data/endpoints/notificationsApi';
import {
  buildNotificationSubscriptions,
  hydrateNotificationToggles,
  type AlertTypeMap,
} from '@data/notifications/subscriptionMappings';
import type { PlayerNotificationPrefs } from '@ui/features/players/components/PlayerNotificationModal';

type PlayerAlertPrefKey = Exclude<keyof PlayerNotificationPrefs, 'enabled'>;

const PLAYER_NOTIFICATION_DEFAULTS: PlayerNotificationPrefs = {
  enabled: false,
  startingLineup: true,
  goals: true,
  assists: true,
  yellowCards: true,
  redCards: true,
  missedPenalty: true,
  transfers: true,
  substitution: true,
  matchRating: true,
};

const PLAYER_NOTIFICATION_TOGGLE_DEFAULTS: Omit<PlayerNotificationPrefs, 'enabled'> = {
  startingLineup: PLAYER_NOTIFICATION_DEFAULTS.startingLineup,
  goals: PLAYER_NOTIFICATION_DEFAULTS.goals,
  assists: PLAYER_NOTIFICATION_DEFAULTS.assists,
  yellowCards: PLAYER_NOTIFICATION_DEFAULTS.yellowCards,
  redCards: PLAYER_NOTIFICATION_DEFAULTS.redCards,
  missedPenalty: PLAYER_NOTIFICATION_DEFAULTS.missedPenalty,
  transfers: PLAYER_NOTIFICATION_DEFAULTS.transfers,
  substitution: PLAYER_NOTIFICATION_DEFAULTS.substitution,
  matchRating: PLAYER_NOTIFICATION_DEFAULTS.matchRating,
};

const PLAYER_ALERT_MAP: AlertTypeMap<PlayerAlertPrefKey> = {
  startingLineup: 'starting_lineup',
  goals: 'goal',
  assists: 'assist',
  yellowCards: 'yellow_card',
  redCards: 'red_card',
  missedPenalty: 'missed_penalty',
  transfers: 'transfer',
  substitution: 'substitution',
  matchRating: 'match_rating',
};

type UsePlayerNotificationPrefsParams = {
  playerId: string | null;
  isPlayerFollowed: boolean;
  closeModal: () => void;
};

export function usePlayerNotificationPrefs({
  playerId,
  isPlayerFollowed,
  closeModal,
}: UsePlayerNotificationPrefsParams) {
  const [notificationPrefs, setNotificationPrefs] = useState<PlayerNotificationPrefs>({
    ...PLAYER_NOTIFICATION_DEFAULTS,
    enabled: isPlayerFollowed,
  });

  const loadPlayerNotificationPrefs = useCallback(async () => {
    if (!playerId) {
      return;
    }

    try {
      const subscriptions = await getNotificationSubscriptions({
        scopeKind: 'player',
        scopeId: playerId,
      });
      const toggles = hydrateNotificationToggles(
        PLAYER_NOTIFICATION_TOGGLE_DEFAULTS,
        PLAYER_ALERT_MAP,
        subscriptions,
      );
      const hasEnabledAlert = Object.values(toggles).some(Boolean);
      setNotificationPrefs({
        enabled: hasEnabledAlert || isPlayerFollowed,
        ...toggles,
      });
    } catch {
      setNotificationPrefs(current => ({
        ...current,
        enabled: isPlayerFollowed,
      }));
    }
  }, [isPlayerFollowed, playerId]);

  const savePlayerNotificationPrefs = useCallback(
    (prefs: PlayerNotificationPrefs) => {
      setNotificationPrefs(prefs);
      if (!playerId) {
        closeModal();
        return;
      }

      const { enabled, ...toggles } = prefs;
      void upsertNotificationSubscriptions({
        scopeKind: 'player',
        scopeId: playerId,
        subscriptions: buildNotificationSubscriptions(toggles, PLAYER_ALERT_MAP, {
          disableAll: !enabled,
        }),
      }).finally(() => {
        closeModal();
      });
    },
    [closeModal, playerId],
  );

  return {
    notificationPrefs,
    loadPlayerNotificationPrefs,
    savePlayerNotificationPrefs,
  };
}
