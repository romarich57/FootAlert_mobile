import type { PlayerAggregateFetchOptions, PlayerOverviewPayload, PlayerStatsCatalogPayload } from './aggregates/contracts.js';
import { fetchPlayerOverviewService } from './aggregates/overviewService.js';
import { fetchPlayerStatsCatalogService } from './aggregates/statsCatalogService.js';

export async function fetchPlayerOverview(
  playerId: string,
  season: number,
  options: PlayerAggregateFetchOptions = {},
): Promise<{ response: PlayerOverviewPayload }> {
  return fetchPlayerOverviewService(playerId, season, options);
}

export async function fetchPlayerStatsCatalog(
  playerId: string,
  options: PlayerAggregateFetchOptions = {},
): Promise<{ response: PlayerStatsCatalogPayload }> {
  return fetchPlayerStatsCatalogService(playerId, options);
}
