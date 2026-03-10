import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';
import { searchPlayersQuerySchema, searchQuerySchema, } from './schemas.js';
export function registerFollowsSearchRoutes(app) {
    app.get('/v1/follows/search/competitions', {
        config: {
            rateLimit: {
                max: 30,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const query = parseOrThrow(searchQuerySchema, request.query);
        return withCache(`follows:search:competitions:${request.url}`, 60_000, () => apiFootballGet(`/leagues?search=${encodeURIComponent(query.q)}`));
    });
    app.get('/v1/follows/search/teams', async (request) => {
        const query = parseOrThrow(searchQuerySchema, request.query);
        return withCache(`follows:search:teams:${request.url}`, 60_000, () => apiFootballGet(`/teams?search=${encodeURIComponent(query.q)}`));
    });
    app.get('/v1/follows/search/players', async (request) => {
        const query = parseOrThrow(searchPlayersQuerySchema, request.query);
        return withCache(`follows:search:players-profiles:${request.url}`, 60_000, async () => {
            const result = await apiFootballGet(`/players/profiles?search=${encodeURIComponent(query.q)}`);
            return {
                response: (result.response ?? []).map(item => ({
                    player: {
                        id: item.player?.id,
                        name: item.player?.name,
                        photo: item.player?.photo,
                    },
                    statistics: [
                        {
                            games: {
                                position: item.player?.position,
                            },
                        },
                    ],
                })),
            };
        });
    });
}
