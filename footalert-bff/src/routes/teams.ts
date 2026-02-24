import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import {
  boundedPositiveIntSchema,
  numericStringSchema,
  seasonSchema,
  timezoneSchema,
} from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const teamIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

const teamFixturesQuerySchema = z
  .object({
    season: seasonSchema.optional(),
    leagueId: numericStringSchema.optional(),
    timezone: timezoneSchema.optional(),
    next: boundedPositiveIntSchema(1, 10).optional(),
  })
  .strict();

const standingsQuerySchema = z
  .object({
    leagueId: numericStringSchema,
    season: seasonSchema,
  })
  .strict();

const statsQuerySchema = standingsQuerySchema;

const teamPlayersQuerySchema = z
  .object({
    leagueId: numericStringSchema,
    season: seasonSchema,
    page: boundedPositiveIntSchema(1, 10).optional(),
  })
  .strict();

function buildFixtureQuery(teamId: string, query: z.infer<typeof teamFixturesQuerySchema>): string {
  const searchParams = new URLSearchParams({ team: teamId });

  if (typeof query.season === 'number') {
    searchParams.set('season', String(query.season));
  }

  if (query.leagueId) {
    searchParams.set('league', query.leagueId);
  }

  if (query.timezone) {
    searchParams.set('timezone', query.timezone);
  }

  if (typeof query.next === 'number') {
    searchParams.set('next', String(query.next));
  }

  return searchParams.toString();
}

export async function registerTeamsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/v1/teams/standings',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const query = parseOrThrow(standingsQuerySchema, request.query);

      return withCache(`team:standings:${request.url}`, 60_000, async () => {
        const data = await apiFootballGet(
          `/standings?league=${encodeURIComponent(query.leagueId)}&season=${encodeURIComponent(String(query.season))}`,
        ) as any;
        // Do not cache empty responses aggressively if it might be a rate limit or error
        if (!data || !data.response || data.response.length === 0) {
          throw new Error('No standings data returned from API');
        }
        return data;
      });
    },
  );

  app.get('/v1/teams/:id', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:details:${request.url}`, 120_000, () =>
      apiFootballGet(`/teams?id=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/teams/:id/leagues', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:leagues:${request.url}`, 120_000, () =>
      apiFootballGet(`/leagues?team=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/teams/:id/fixtures', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(teamFixturesQuerySchema, request.query);

    return withCache(`team:fixtures:${request.url}`, 45_000, () =>
      apiFootballGet(`/fixtures?${buildFixtureQuery(params.id, query)}`),
    );
  });

  app.get('/v1/teams/:id/next-fixture', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(
      z
        .object({
          timezone: timezoneSchema,
        })
        .strict(),
      request.query,
    );

    return withCache(`team:nextfixture:${request.url}`, 45_000, () =>
      apiFootballGet(
        `/fixtures?team=${encodeURIComponent(params.id)}&next=1&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );
  });

  app.get(
    '/v1/teams/:id/standings',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      parseOrThrow(teamIdParamsSchema, request.params);
      const query = parseOrThrow(standingsQuerySchema, request.query);

      return withCache(`team:standings:${request.url}`, 60_000, async () => {
        const data = await apiFootballGet(
          `/standings?league=${encodeURIComponent(query.leagueId)}&season=${encodeURIComponent(String(query.season))}`,
        ) as any;
        // Do not cache empty responses aggressively if it might be a rate limit or error
        if (!data || !data.response || data.response.length === 0) {
          throw new Error('No standings data returned from API');
        }
        return data;
      });
    },
  );

  app.get('/v1/teams/:id/stats', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(statsQuerySchema, request.query);

    return withCache(`team:stats:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/teams/statistics?league=${encodeURIComponent(query.leagueId)}&season=${encodeURIComponent(String(query.season))}&team=${encodeURIComponent(params.id)}`,
      ),
    );
  });

  app.get('/v1/teams/:id/players', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(teamPlayersQuerySchema, request.query);

    const searchParams = new URLSearchParams({
      team: params.id,
      league: query.leagueId,
      season: String(query.season),
    });

    if (typeof query.page === 'number') {
      searchParams.set('page', String(query.page));
    }

    return withCache(`team:players:${request.url}`, 60_000, () =>
      apiFootballGet(`/players?${searchParams.toString()}`),
    );
  });

  app.get('/v1/teams/:id/squad', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:squad:${request.url}`, 120_000, async () => {
      const [squadRes, coachRes] = (await Promise.all([
        apiFootballGet(`/players/squads?team=${encodeURIComponent(params.id)}`),
        apiFootballGet(`/coachs?team=${encodeURIComponent(params.id)}`),
      ])) as [any, any];

      const squadData = squadRes.response?.[0] ?? { players: [] };
      const coaches = coachRes.response ?? [];

      // Find the active coach (end of career is null or future)
      const currentCoach = coaches.find((c: any) => {
        const currentJob = c.career?.[0];
        return currentJob && currentJob.team?.id === Number(params.id) && currentJob.end === null;
      }) || coaches[0] || null;

      if (currentCoach) {
        squadData.coach = {
          id: currentCoach.id,
          name: currentCoach.name,
          photo: currentCoach.photo,
          age: currentCoach.age,
        };
      }

      return {
        ...squadRes,
        response: [squadData],
      };
    });
  });

  app.get('/v1/teams/:id/transfers', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:transfers:${request.url}`, 120_000, () =>
      apiFootballGet(`/transfers?team=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/teams/:id/trophies', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:trophies:${request.url}`, 120_000, async () => {
      const trophiesById = await apiFootballGet<{ response?: unknown[] }>(
        `/trophies?team=${encodeURIComponent(params.id)}`,
      );

      if ((trophiesById.response?.length ?? 0) > 0) {
        console.log(`[trophies] team=${params.id} → API-Football by ID returned ${trophiesById.response!.length} items`);
        return trophiesById;
      }
      console.log(`[trophies] team=${params.id} → API-Football by ID returned empty, trying name lookup...`);

      try {
        const teamLookup = await apiFootballGet<{
          response?: Array<{
            team?: {
              name?: string;
              country?: string;
            };
          }>;
        }>(`/teams?id=${encodeURIComponent(params.id)}`);

        const teamName = teamLookup.response?.[0]?.team?.name?.trim();
        if (!teamName) {
          return trophiesById;
        }

        const trophiesByName = await apiFootballGet<{ response?: unknown[] }>(
          `/trophies?team=${encodeURIComponent(teamName)}`,
        );

        if ((trophiesByName.response?.length ?? 0) > 0) {
          console.log(`[trophies] team=${params.id} → API-Football by name "${teamName}" returned ${trophiesByName.response!.length} items`);
          return trophiesByName;
        }
        console.log(`[trophies] team=${params.id} → API-Football by name "${teamName}" also empty, trying Wikipedia...`);

        // Wikipedia Fallback
        try {
          const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(teamName + " football club")}&utf8=&format=json`);
          const searchData = (await searchRes.json()) as any;
          if (searchData.query?.search?.length) {
            const pageTitle = searchData.query.search[0].title;
            const parseRes = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=sections&format=json`);
            const parseData = (await parseRes.json()) as any;

            const honourSection = parseData.parse?.sections?.find((s: any) =>
              s.line.toLowerCase().includes('honour') || s.line.toLowerCase().includes('trophies') || s.line.toLowerCase().includes('palmares')
            );

            if (honourSection) {
              const contentRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvsection=${honourSection.index}&titles=${encodeURIComponent(pageTitle)}&format=json`);
              const contentData = (await contentRes.json()) as any;

              const pages = contentData.query?.pages;
              const pageId = pages && Object.keys(pages)[0];
              const wikitext = pageId ? pages[pageId]?.revisions?.[0]?.['*'] : null;

              if (wikitext) {
                const trophies: Array<{ league: string; country: string; season: string; place: string }> = [];
                const lines = wikitext.split('\n');
                let currentComp: string | null = null;
                let currentCount = 0;

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i].trim();

                  if (line.startsWith('! scope="row"')) {
                    const linkMatch = line.match(/\[\[([^\]]+)\]\]/);
                    if (linkMatch) {
                      currentComp = linkMatch[1].split('|').pop();
                      currentCount = 0;
                      continue;
                    }
                  }

                  if (currentComp && line.startsWith('|')) {
                    const countMatch = line.match(/\|\s*(?:.*\|)?\s*'*\s*(\d+)\s*'*/);
                    if (countMatch && !currentCount) {
                      currentCount = parseInt(countMatch[1], 10);
                      continue;
                    }

                    if (currentCount > 0 && line.length > 20) {
                      let cleanSeasons = line.replace(/\[\[([^\]]+)\]\]/g, (m: string, p1: string) => p1.split('|').pop() || '')
                        .replace(/\{\{[^}]+\}\}/g, '')
                        .replace(/\|\s*align="left"\s*\|/g, '')
                        .replace(/<[^>]+>/g, '')
                        .replace(/\|style="[^"]+"|/g, '')
                        .replace(/\|/g, '')
                        .trim();

                      if (cleanSeasons) {
                        const seasonsArr = cleanSeasons.split(/[,•]/).map((s: string) => s.trim()).filter(Boolean);

                        seasonsArr.forEach((season: string) => {
                          trophies.push({
                            league: currentComp!,
                            country: teamLookup.response?.[0]?.team?.country ?? 'Unknown',
                            season: season,
                            place: 'Winner'
                          });
                        });
                        currentComp = null;
                        currentCount = 0;
                      }
                    }
                  }
                }

                if (trophies.length > 0) {
                  console.log(`[trophies] team=${params.id} → Wikipedia extracted ${trophies.length} trophies!`);
                  return { response: trophies };
                }
                console.log(`[trophies] team=${params.id} → Wikipedia parsing found 0 trophies`);
              }
            }
          }
        } catch (wikiErr) {
          console.log(`[trophies] team=${params.id} → Wikipedia fallback error:`, wikiErr);
          request.log.warn({ err: wikiErr }, 'Wikipedia fallback failed');
        }

      } catch (outerErr) {
        console.log(`[trophies] team=${params.id} → Outer catch triggered:`, outerErr);
        return trophiesById;
      }

      return trophiesById;
    });
  });
}
