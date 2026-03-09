import type { AlertTypeMap } from '@data/notifications/subscriptionMappings';
import type { CompetitionNotificationPrefs } from '@ui/features/competitions/components/CompetitionNotificationModal';

export type CompetitionAlertPrefKey = Exclude<keyof CompetitionNotificationPrefs, 'enabled'>;

export const COMPETITION_NOTIFICATION_DEFAULTS: CompetitionNotificationPrefs = {
  enabled: false,
  matchStart: true,
  halftime: false,
  matchEnd: true,
  goals: true,
  redCards: true,
  missedPenalty: false,
  transfers: true,
  lineups: false,
  matchReminder: false,
};

export const COMPETITION_NOTIFICATION_TOGGLE_DEFAULTS: Omit<
  CompetitionNotificationPrefs,
  'enabled'
> = {
  matchStart: COMPETITION_NOTIFICATION_DEFAULTS.matchStart,
  halftime: COMPETITION_NOTIFICATION_DEFAULTS.halftime,
  matchEnd: COMPETITION_NOTIFICATION_DEFAULTS.matchEnd,
  goals: COMPETITION_NOTIFICATION_DEFAULTS.goals,
  redCards: COMPETITION_NOTIFICATION_DEFAULTS.redCards,
  missedPenalty: COMPETITION_NOTIFICATION_DEFAULTS.missedPenalty,
  transfers: COMPETITION_NOTIFICATION_DEFAULTS.transfers,
  lineups: COMPETITION_NOTIFICATION_DEFAULTS.lineups,
  matchReminder: COMPETITION_NOTIFICATION_DEFAULTS.matchReminder,
};

export const COMPETITION_ALERT_MAP: AlertTypeMap<CompetitionAlertPrefKey> = {
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
