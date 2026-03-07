import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildApiSportsPlayerPhoto,
  FOLLOW_DISCOVERY_PLAYER_ID_CORRECTIONS,
  FOLLOW_DISCOVERY_SEED_PLAYERS,
} from '../../dist/follows/discoverySeeds.js';

describe('discovery seeds', () => {
  it('derives every seed player photo from the exported player id', () => {
    for (const seed of FOLLOW_DISCOVERY_SEED_PLAYERS) {
      assert.equal(seed.playerPhoto, buildApiSportsPlayerPhoto(seed.playerId));
      assert.equal(
        seed.playerPhoto,
        `https://media.api-sports.io/football/players/${seed.playerId}.png`,
      );
    }
  });

  it('does not contain correction cycles', () => {
    for (const sourcePlayerId of Object.keys(FOLLOW_DISCOVERY_PLAYER_ID_CORRECTIONS)) {
      const seen = new Set();
      let currentPlayerId = sourcePlayerId;

      while (currentPlayerId) {
        assert.equal(seen.has(currentPlayerId), false);
        seen.add(currentPlayerId);
        const nextPlayerId = FOLLOW_DISCOVERY_PLAYER_ID_CORRECTIONS[currentPlayerId];
        if (!nextPlayerId || nextPlayerId === currentPlayerId) {
          break;
        }

        currentPlayerId = nextPlayerId;
      }
    }
  });
});
