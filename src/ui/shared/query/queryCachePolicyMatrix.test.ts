import {
  isPersistableQueryCachePolicy,
  queryCachePolicyMatrix,
} from '@ui/shared/query/queryCachePolicyMatrix';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

describe('queryCachePolicyMatrix', () => {
  it('marks only stable revisit-friendly datasets as persistable', () => {
    expect(
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.teams.details.cachePolicy),
    ).toBe(true);
    expect(
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.players.career.cachePolicy),
    ).toBe(true);
    expect(
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.matches.details.cachePolicy),
    ).toBe(true);
    expect(
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.matches.events.cachePolicy),
    ).toBe(false);
    expect(
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.competitions.teamStats.cachePolicy),
    ).toBe(false);
  });

  it('drives the staleTime values exposed by featureQueryOptions', () => {
    expect(featureQueryOptions.teams.details.staleTime).toBe(60 * 60_000);
    expect(featureQueryOptions.teams.leagues.staleTime).toBe(24 * 60 * 60 * 1000);
    expect(featureQueryOptions.teams.squad.staleTime).toBe(6 * 60 * 60 * 1000);
    expect(featureQueryOptions.players.career.staleTime).toBe(24 * 60 * 60 * 1000);
    expect(featureQueryOptions.players.trophies.staleTime).toBe(24 * 60 * 60 * 1000);
    expect(featureQueryOptions.matches.details.staleTime).toBe(60_000);
  });
});
