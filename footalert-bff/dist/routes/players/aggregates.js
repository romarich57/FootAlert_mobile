import { fetchPlayerOverviewService } from './aggregates/overviewService.js';
import { fetchPlayerStatsCatalogService } from './aggregates/statsCatalogService.js';
export async function fetchPlayerOverview(playerId, season, options = {}) {
    return fetchPlayerOverviewService(playerId, season, options);
}
export async function fetchPlayerStatsCatalog(playerId, options = {}) {
    return fetchPlayerStatsCatalogService(playerId, options);
}
