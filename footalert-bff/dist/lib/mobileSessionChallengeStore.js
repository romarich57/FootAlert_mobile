import { randomBytes, randomUUID } from 'node:crypto';
const challengeStore = new Map();
function pruneExpiredChallenges(nowMs) {
    for (const [challengeId, value] of challengeStore.entries()) {
        if (value.expiresAtMs <= nowMs) {
            challengeStore.delete(challengeId);
        }
    }
}
export function createMobileSessionChallenge(input) {
    const nowMs = input.nowMs ?? Date.now();
    pruneExpiredChallenges(nowMs);
    const challengeContext = {
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
export function consumeMobileSessionChallenge(challengeId, nowMs = Date.now()) {
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
export function resetMobileSessionChallengeStoreForTests() {
    challengeStore.clear();
}
