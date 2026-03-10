import type { FastifyInstance } from 'fastify';

import { registerCompetitionBracketRoute } from './bracketRoute.js';
import { registerCompetitionCoreRoutes } from './coreRoutes.js';
import { registerCompetitionFullRoute } from './fullRoute.js';
import { registerCompetitionMatchesRoute } from './matchesRoute.js';
import { registerCompetitionPlayerStatsRoute } from './playerStatsRoute.js';
import { registerCompetitionStandingsRoute } from './standingsRoute.js';
import { registerCompetitionTeamStatsRoute } from './teamStats/route.js';
import { registerCompetitionTotwRoute } from './totwRoute.js';
import { registerCompetitionTransfersRoute } from './transfersRoute.js';

export async function registerCompetitionsRoutes(app: FastifyInstance): Promise<void> {
  registerCompetitionCoreRoutes(app);
  registerCompetitionFullRoute(app);
  registerCompetitionStandingsRoute(app);
  registerCompetitionMatchesRoute(app);
  registerCompetitionBracketRoute(app);
  registerCompetitionPlayerStatsRoute(app);
  registerCompetitionTeamStatsRoute(app);
  registerCompetitionTotwRoute(app);
  registerCompetitionTransfersRoute(app);
}
