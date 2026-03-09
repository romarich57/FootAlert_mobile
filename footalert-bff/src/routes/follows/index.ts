import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { getFollowsDiscoveryStore } from '../../lib/follows/discoveryRuntime.js';
import { registerFollowsDiscoveryRoutes, registerFollowsEventsRoute } from './eventsRoute.js';
import { registerFollowsPlayerRoutes } from './playerRoutes.js';
import { registerFollowsSearchRoutes } from './searchRoutes.js';
import { registerFollowsTeamRoutes } from './teamRoutes.js';
import { registerFollowsTrendsRoutes } from './trendsRoutes.js';

export async function registerFollowsRoutes(app: FastifyInstance): Promise<void> {
  const getDiscoveryStore = () =>
    getFollowsDiscoveryStore({
      backend: env.notificationsPersistenceBackend,
      databaseUrl: env.databaseUrl,
    });

  registerFollowsTrendsRoutes(app);
  registerFollowsSearchRoutes(app);
  registerFollowsTeamRoutes(app);
  registerFollowsPlayerRoutes(app);
  registerFollowsEventsRoute(app, getDiscoveryStore);
  registerFollowsDiscoveryRoutes(app, getDiscoveryStore);
}
