import type { FastifyInstance } from 'fastify';

import { registerMatchDetailRoutes } from './detailsRoutes.js';
import { registerMatchFullRoute } from './fullRoute.js';
import { registerMatchesListingRoutes } from './listingRoutes.js';

export async function registerMatchesRoutes(app: FastifyInstance): Promise<void> {
  registerMatchesListingRoutes(app);
  registerMatchDetailRoutes(app);
  registerMatchFullRoute(app);
}
