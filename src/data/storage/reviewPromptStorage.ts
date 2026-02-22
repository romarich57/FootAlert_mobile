import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';

export const REVIEW_PROMPT_STATE_KEY = 'app_review_state_v1';

const MIN_LAUNCH_COUNT = 4;
const MIN_POSITIVE_EVENT_COUNT = 5;
const MIN_APP_AGE_DAYS = 7;
const PROMPT_COOLDOWN_DAYS = 90;
const MAX_PROMPT_COUNT = 3;

export type ReviewPromptState = {
  firstSeenAt: string;
  appLaunchCount: number;
  positiveEventCount: number;
  lastPromptAt: string | null;
  promptCount: number;
  lastPromptedVersion: string | null;
};

export type ReviewPromptEligibilityInput = {
  isDevRuntime: boolean;
  appVersion: string;
  now?: Date;
};

function toIso(value: Date): string {
  return value.toISOString();
}

function parseDateOrNull(rawValue: string | null | undefined): Date | null {
  if (!rawValue) {
    return null;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toSafeInt(value: unknown, fallbackValue = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallbackValue;
  }

  return Math.max(0, Math.floor(value));
}

function buildDefaultState(now: Date): ReviewPromptState {
  return {
    firstSeenAt: toIso(now),
    appLaunchCount: 0,
    positiveEventCount: 0,
    lastPromptAt: null,
    promptCount: 0,
    lastPromptedVersion: null,
  };
}

function sanitizeState(rawValue: unknown, now: Date): ReviewPromptState {
  if (!rawValue || typeof rawValue !== 'object') {
    return buildDefaultState(now);
  }

  const candidate = rawValue as Partial<ReviewPromptState>;
  const firstSeenAt = parseDateOrNull(candidate.firstSeenAt) ?? now;
  const lastPromptAt = parseDateOrNull(candidate.lastPromptAt ?? null);

  return {
    firstSeenAt: toIso(firstSeenAt),
    appLaunchCount: toSafeInt(candidate.appLaunchCount, 0),
    positiveEventCount: toSafeInt(candidate.positiveEventCount, 0),
    lastPromptAt: lastPromptAt ? toIso(lastPromptAt) : null,
    promptCount: toSafeInt(candidate.promptCount, 0),
    lastPromptedVersion:
      typeof candidate.lastPromptedVersion === 'string' &&
      candidate.lastPromptedVersion.trim().length > 0
        ? candidate.lastPromptedVersion
        : null,
  };
}

async function saveReviewPromptState(state: ReviewPromptState): Promise<ReviewPromptState> {
  await setJsonValue<ReviewPromptState>(REVIEW_PROMPT_STATE_KEY, state);
  return state;
}

export async function loadReviewPromptState(now: Date = new Date()): Promise<ReviewPromptState> {
  const payload = await getJsonValue<unknown>(REVIEW_PROMPT_STATE_KEY);
  const normalized = sanitizeState(payload, now);
  if (!payload || JSON.stringify(payload) !== JSON.stringify(normalized)) {
    await saveReviewPromptState(normalized);
  }
  return normalized;
}

export async function incrementAppLaunchCount(now: Date = new Date()): Promise<ReviewPromptState> {
  const currentState = await loadReviewPromptState(now);
  const nextState: ReviewPromptState = {
    ...currentState,
    appLaunchCount: currentState.appLaunchCount + 1,
  };
  return saveReviewPromptState(nextState);
}

export async function incrementPositiveEventCount(
  now: Date = new Date(),
): Promise<ReviewPromptState> {
  const currentState = await loadReviewPromptState(now);
  const nextState: ReviewPromptState = {
    ...currentState,
    positiveEventCount: currentState.positiveEventCount + 1,
  };
  return saveReviewPromptState(nextState);
}

export async function markReviewPrompted(
  appVersion: string,
  now: Date = new Date(),
): Promise<ReviewPromptState> {
  const currentState = await loadReviewPromptState(now);
  const nextState: ReviewPromptState = {
    ...currentState,
    lastPromptAt: toIso(now),
    promptCount: currentState.promptCount + 1,
    lastPromptedVersion: appVersion,
  };
  return saveReviewPromptState(nextState);
}

function elapsedDays(fromDate: Date, toDate: Date): number {
  return (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000);
}

export function isReviewPromptEligible(
  state: ReviewPromptState,
  input: ReviewPromptEligibilityInput,
): boolean {
  const { appVersion, isDevRuntime } = input;
  const now = input.now ?? new Date();

  if (isDevRuntime) {
    return false;
  }

  if (state.promptCount >= MAX_PROMPT_COUNT) {
    return false;
  }

  if (!appVersion || state.lastPromptedVersion === appVersion) {
    return false;
  }

  if (state.appLaunchCount < MIN_LAUNCH_COUNT) {
    return false;
  }

  if (state.positiveEventCount < MIN_POSITIVE_EVENT_COUNT) {
    return false;
  }

  const firstSeenAt = parseDateOrNull(state.firstSeenAt);
  if (!firstSeenAt || elapsedDays(firstSeenAt, now) < MIN_APP_AGE_DAYS) {
    return false;
  }

  const lastPromptAt = parseDateOrNull(state.lastPromptAt);
  if (lastPromptAt && elapsedDays(lastPromptAt, now) < PROMPT_COOLDOWN_DAYS) {
    return false;
  }

  return true;
}

