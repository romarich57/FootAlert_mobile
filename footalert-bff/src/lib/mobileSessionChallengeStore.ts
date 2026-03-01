import { randomBytes, randomUUID } from 'node:crypto';

import type { MobilePlatform } from './mobileAttestation/index.js';

export type MobileSessionChallengeContext = {
  challengeId: string;
  challenge: string;
  platform: MobilePlatform;
  deviceIdHash: string;
  appVersion: string;
  buildNumber: string;
  expiresAtMs: number;
  createdAtMs: number;
};

const challengeStore = new Map<string, MobileSessionChallengeContext>();

function pruneExpiredChallenges(nowMs: number): void {
  for (const [challengeId, value] of challengeStore.entries()) {
    if (value.expiresAtMs <= nowMs) {
      challengeStore.delete(challengeId);
    }
  }
}

export function createMobileSessionChallenge(input: {
  platform: MobilePlatform;
  deviceIdHash: string;
  appVersion: string;
  buildNumber: string;
  ttlMs: number;
  nowMs?: number;
}): MobileSessionChallengeContext {
  const nowMs = input.nowMs ?? Date.now();
  pruneExpiredChallenges(nowMs);

  const challengeContext: MobileSessionChallengeContext = {
    challengeId: randomUUID(),
    challenge: randomBytes(24).toString('base64url'),
    platform: input.platform,
    deviceIdHash: input.deviceIdHash,
    appVersion: input.appVersion,
    buildNumber: input.buildNumber,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + input.ttlMs,
  };

  challengeStore.set(challengeContext.challengeId, challengeContext);
  return challengeContext;
}

export function consumeMobileSessionChallenge(
  challengeId: string,
  nowMs = Date.now(),
): MobileSessionChallengeContext | null {
  pruneExpiredChallenges(nowMs);

  const challenge = challengeStore.get(challengeId);
  if (!challenge) {
    return null;
  }

  challengeStore.delete(challengeId);
  if (challenge.expiresAtMs <= nowMs) {
    return null;
  }

  return challenge;
}

export function resetMobileSessionChallengeStoreForTests(): void {
  challengeStore.clear();
}

