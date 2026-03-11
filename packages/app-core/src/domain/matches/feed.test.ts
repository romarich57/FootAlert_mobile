import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyCompetitionCatalogToSections,
  buildCompetitionCatalogMap,
  buildFeedItems,
  buildFollowsSection,
  composeMatchesFeed,
  filterSectionsByStatus,
  sortMatchesByKickoff,
  type CompetitionCatalogLeague,
  type MatchCompetitionSection,
  type MatchFeedMatch,
} from './index.js';

const createMatch = (
  fixtureId: string,
  overrides: Partial<MatchFeedMatch> = {},
): MatchFeedMatch => ({
  fixtureId,
  competitionId: '39',
  competitionName: 'Ligue 1',
  competitionLogo: 'league-logo',
  competitionCountry: 'France',
  startDate: '2026-03-11T18:00:00.000Z',
  minute: null,
  venue: 'Parc des Princes',
  status: 'upcoming',
  statusLabel: 'NS',
  homeTeamId: '85',
  homeTeamName: 'Paris Saint-Germain',
  homeTeamLogo: 'psg-logo',
  awayTeamId: '81',
  awayTeamName: 'Olympique de Marseille',
  awayTeamLogo: 'om-logo',
  homeGoals: null,
  awayGoals: null,
  hasBroadcast: false,
  ...overrides,
});

const createSection = (
  id: string,
  matches: MatchFeedMatch[],
  overrides: Partial<MatchCompetitionSection> = {},
): MatchCompetitionSection => ({
  id,
  name: `Competition ${id}`,
  logo: `logo-${id}`,
  country: 'France',
  matches,
  ...overrides,
});

describe('matches domain feed', () => {
  it('builds a catalog map from valid entries only', () => {
    const catalog: Array<CompetitionCatalogLeague | null | undefined> = [
      undefined,
      null,
      {
        league: {
          id: 39,
          name: 'Ligue 1 Uber Eats',
          logo: 'catalog-logo',
        },
        country: {
          name: 'France',
        },
      },
      {
        league: {
          id: null,
          name: 'Ignored',
          logo: 'ignored-logo',
        },
        country: {
          name: 'France',
        },
      },
    ];

    const catalogMap = buildCompetitionCatalogMap(catalog);

    assert.equal(catalogMap.size, 1);
    assert.deepEqual(catalogMap.get('39'), {
      name: 'Ligue 1 Uber Eats',
      country: 'France',
      logo: 'catalog-logo',
    });
  });

  it('applies catalog metadata to sections and nested matches', () => {
    const catalogMap = buildCompetitionCatalogMap([
      {
        league: {
          id: 39,
          name: 'Ligue 1 Uber Eats',
          logo: 'catalog-logo',
        },
        country: {
          name: 'France',
        },
      },
    ]);
    const sections = [
      createSection('39', [
        createMatch('fixture-1', {
          competitionName: 'Legacy name',
          competitionLogo: 'legacy-logo',
          competitionCountry: 'Legacy country',
        }),
      ]),
    ];

    const normalizedSections = applyCompetitionCatalogToSections(sections, catalogMap);

    assert.equal(normalizedSections[0]?.name, 'Ligue 1 Uber Eats');
    assert.equal(normalizedSections[0]?.logo, 'catalog-logo');
    assert.equal(normalizedSections[0]?.country, 'France');
    assert.equal(normalizedSections[0]?.matches[0]?.competitionName, 'Ligue 1 Uber Eats');
    assert.equal(normalizedSections[0]?.matches[0]?.competitionLogo, 'catalog-logo');
    assert.equal(normalizedSections[0]?.matches[0]?.competitionCountry, 'France');
  });

  it('filters sections by status and sorts kickoffs deterministically', () => {
    const sections = [
      createSection('39', [
        createMatch('fixture-live', {
          status: 'live',
          startDate: '2026-03-11T19:00:00.000Z',
        }),
        createMatch('fixture-upcoming', {
          status: 'upcoming',
          startDate: '2026-03-11T17:00:00.000Z',
        }),
      ]),
      createSection('140', [
        createMatch('fixture-finished', {
          competitionId: '140',
          status: 'finished',
          startDate: '2026-03-11T15:00:00.000Z',
        }),
      ]),
    ];

    const filteredSections = filterSectionsByStatus(sections, 'live');
    const sortedMatches = sortMatchesByKickoff(sections[0]?.matches ?? []);

    assert.deepEqual(filteredSections.map(section => section.id), ['39']);
    assert.deepEqual(
      filteredSections[0]?.matches.map(match => match.fixtureId),
      ['fixture-live'],
    );
    assert.deepEqual(
      sortedMatches.map(match => match.fixtureId),
      ['fixture-upcoming', 'fixture-live'],
    );
  });

  it('builds follows section with starred matches before followed-team matches', () => {
    const sections = [
      createSection('39', [
        createMatch('fixture-starred-late', {
          startDate: '2026-03-11T21:00:00.000Z',
        }),
        createMatch('fixture-team-early', {
          startDate: '2026-03-11T18:00:00.000Z',
          homeTeamId: '100',
        }),
        createMatch('fixture-starred-early', {
          startDate: '2026-03-11T19:00:00.000Z',
        }),
      ]),
    ];

    const followsSection = buildFollowsSection(
      sections,
      ['100'],
      ['fixture-starred-late', 'fixture-starred-early'],
      'Suivis',
    );

    assert.deepEqual(
      followsSection.matches.map(match => match.fixtureId),
      ['fixture-starred-early', 'fixture-starred-late', 'fixture-team-early'],
    );
  });

  it('inserts a single ad slot after the first visible competition section', () => {
    const sections = [
      createSection('follows', [], {
        isFollowSection: true,
        name: 'Suivis',
        logo: '',
        country: '',
      }),
      createSection('39', [createMatch('fixture-1')]),
      createSection('140', [createMatch('fixture-2', { competitionId: '140' })]),
    ];

    const feedItems = buildFeedItems(sections);

    assert.deepEqual(
      feedItems.map(item => ('section' in item ? item.section.id : item.key)),
      ['follows', '39', 'partner-ad-slot', '140'],
    );
  });

  it('composes the mobile feed from catalog, filters, follows and hidden competitions', () => {
    const baseSections = [
      createSection('39', [
        createMatch('fixture-followed-match', {
          startDate: '2026-03-11T20:00:00.000Z',
        }),
      ]),
      createSection('140', [
        createMatch('fixture-hidden', {
          competitionId: '140',
          competitionName: 'La Liga',
          competitionCountry: 'Spain',
          startDate: '2026-03-11T22:00:00.000Z',
          homeTeamId: '200',
        }),
      ], {
        country: 'Spain',
      }),
    ];

    const result = composeMatchesFeed({
      baseSections,
      catalog: [
        {
          league: {
            id: 39,
            name: 'Ligue 1 Uber Eats',
            logo: 'catalog-logo',
          },
          country: {
            name: 'France',
          },
        },
      ],
      statusFilter: 'all',
      followedTeamIds: ['200'],
      followedMatchIds: ['fixture-followed-match'],
      followsSectionLabel: 'Suivis',
      hiddenCompetitionIds: ['140'],
      followedOnly: false,
    });

    assert.equal(result.normalizedSections[0]?.name, 'Ligue 1 Uber Eats');
    assert.deepEqual(
      result.followsSection.matches.map(match => match.fixtureId),
      ['fixture-followed-match', 'fixture-hidden'],
    );
    assert.deepEqual(
      result.sectionsForFeed.map(section => section.id),
      ['follows', '39'],
    );
    assert.deepEqual(
      result.feedItems.map(item => ('section' in item ? item.section.id : item.key)),
      ['follows', '39'],
    );
  });
});
