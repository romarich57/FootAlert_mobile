import type { FastifyInstance } from 'fastify';

import { registerCompetitionBracketRoute } from './bracketRoute.js';
import { registerCompetitionCoreRoutes } from './coreRoutes.js';
import { registerCompetitionMatchesRoute } from './matchesRoute.js';
import { registerCompetitionPlayerStatsRoute } from './playerStatsRoute.js';
import { registerCompetitionStandingsRoute } from './standingsRoute.js';
import { registerCompetitionTotwRoute } from './totwRoute.js';
import { registerCompetitionTransfersRoute } from './transfersRoute.js';

export async function registerCompetitionsRoutes(app: FastifyInstance): Promise<void> {
  registerCompetitionCoreRoutes(app);
  registerCompetitionStandingsRoute(app);
  registerCompetitionMatchesRoute(app);
  registerCompetitionBracketRoute(app);
  registerCompetitionPlayerStatsRoute(app);
  registerCompetitionTotwRoute(app);
  registerCompetitionTransfersRoute(app);
}
