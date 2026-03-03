import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed_v1';

export async function isOnboardingCompleted(): Promise<boolean> {
  const value = await getJsonValue<boolean>(ONBOARDING_COMPLETED_KEY);
  return Boolean(value);
}

export async function markOnboardingCompleted(): Promise<void> {
  await setJsonValue<boolean>(ONBOARDING_COMPLETED_KEY, true);
}
