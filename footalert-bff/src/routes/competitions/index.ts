import type { FastifyInstance } from 'fastify';

import { registerCompetitionCoreRoutes } from './coreRoutes.js';
import { registerCompetitionMatchesRoute } from './matchesRoute.js';
import { registerCompetitionPlayerStatsRoute } from './playerStatsRoute.js';
import { registerCompetitionStandingsRoute } from './standingsRoute.js';
import { registerCompetitionTransfersRoute } from './transfersRoute.js';

export async function registerCompetitionsRoutes(app: FastifyInstance): Promise<void> {
  registerCompetitionCoreRoutes(app);
  registerCompetitionStandingsRoute(app);
  registerCompetitionMatchesRoute(app);
  registerCompetitionPlayerStatsRoute(app);
  registerCompetitionTransfersRoute(app);
}
