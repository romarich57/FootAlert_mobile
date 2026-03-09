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
import type { TeamNotificationPrefs } from '@ui/features/teams/components/TeamNotificationModal';

type TeamAlertPrefKey = Exclude<keyof TeamNotificationPrefs, 'enabled'>;

const TEAM_NOTIFICATION_DEFAULTS: TeamNotificationPrefs = {
  enabled: false,
  matchStart: true,
  halftime: true,
  matchEnd: true,
  goals: true,
  redCards: true,
  missedPenalty: true,
  transfers: true,
  lineups: true,
  matchReminder: true,
};

const TEAM_NOTIFICATION_TOGGLE_DEFAULTS: Omit<TeamNotificationPrefs, 'enabled'> = {
  matchStart: TEAM_NOTIFICATION_DEFAULTS.matchStart,
  halftime: TEAM_NOTIFICATION_DEFAULTS.halftime,
  matchEnd: TEAM_NOTIFICATION_DEFAULTS.matchEnd,
  goals: TEAM_NOTIFICATION_DEFAULTS.goals,
  redCards: TEAM_NOTIFICATION_DEFAULTS.redCards,
  missedPenalty: TEAM_NOTIFICATION_DEFAULTS.missedPenalty,
  transfers: TEAM_NOTIFICATION_DEFAULTS.transfers,
  lineups: TEAM_NOTIFICATION_DEFAULTS.lineups,
  matchReminder: TEAM_NOTIFICATION_DEFAULTS.matchReminder,
};

const TEAM_ALERT_MAP: AlertTypeMap<TeamAlertPrefKey> = {
  matchStart: 'match_start',
  halftime: 'halftime',
  matchEnd: 'match_end',
  goals: 'goal',
  redCards: 'red_card',
  missedPenalty: 'missed_penalty',
  transfers: 'transfer',
  lineups: 'lineup',
  matchReminder: 'match_reminder',
};

type UseTeamNotificationPrefsParams = {
  teamId: string;
  isFollowed: boolean;
  closeModal: () => void;
};

export function useTeamNotificationPrefs({
  teamId,
  isFollowed,
  closeModal,
}: UseTeamNotificationPrefsParams) {
  const [notificationPrefs, setNotificationPrefs] = useState<TeamNotificationPrefs>({
    ...TEAM_NOTIFICATION_DEFAULTS,
    enabled: isFollowed,
  });

  const loadTeamNotificationPrefs = useCallback(async () => {
    if (!teamId) {
      return;
    }

    try {
      const subscriptions = await getNotificationSubscriptions({
        scopeKind: 'team',
        scopeId: teamId,
      });
      const toggles = hydrateNotificationToggles(
        TEAM_NOTIFICATION_TOGGLE_DEFAULTS,
        TEAM_ALERT_MAP,
        subscriptions,
      );
      const hasEnabledAlert = Object.values(toggles).some(Boolean);
      setNotificationPrefs({
        enabled: hasEnabledAlert || isFollowed,
        ...toggles,
      });
    } catch {
      setNotificationPrefs(current => ({
        ...current,
        enabled: isFollowed,
      }));
    }
  }, [isFollowed, teamId]);

  const saveTeamNotificationPrefs = useCallback(
    (prefs: TeamNotificationPrefs) => {
      setNotificationPrefs(prefs);
      if (!teamId) {
        closeModal();
        return;
      }

      const { enabled, ...toggles } = prefs;
      void upsertNotificationSubscriptions({
        scopeKind: 'team',
        scopeId: teamId,
        subscriptions: buildNotificationSubscriptions(toggles, TEAM_ALERT_MAP, {
          disableAll: !enabled,
        }),
      }).finally(() => {
        closeModal();
      });
    },
    [closeModal, teamId],
  );

  return {
    notificationPrefs,
    loadTeamNotificationPrefs,
    saveTeamNotificationPrefs,
  };
}
