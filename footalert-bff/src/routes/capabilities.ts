import type { FastifyInstance } from 'fastify';

const CAPABILITIES_PAYLOAD = {
  version: 1,
  features: {
    matchDetails: {
      details: true,
      events: true,
      statistics: true,
      lineups: true,
      headToHead: true,
      predictions: true,
      absences: true,
      playersStats: true,
    },
  },
  endpoints: {
    matchDetails: {
      details: '/v1/matches/:id',
      events: '/v1/matches/:id/events',
      statistics: '/v1/matches/:id/statistics',
      lineups: '/v1/matches/:id/lineups',
      headToHead: '/v1/matches/:id/head-to-head',
      predictions: '/v1/matches/:id/predictions',
      absences: '/v1/matches/:id/absences',
      playersStats: '/v1/matches/:id/players/:teamId/stats',
    },
  },
} as const;

export async function registerCapabilitiesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/capabilities', async () => CAPABILITIES_PAYLOAD);
}

