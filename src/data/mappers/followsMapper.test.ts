import {
  mapPlayerSeasonToFollowedCard,
  mapTeamDetailsAndFixtureToFollowedCard,
  mapTrendingPlayersFromTopScorers,
  mapTrendingTeamsFromStandings,
} from '@data/mappers/followsMapper';

describe('followsMapper', () => {
  it('maps team details + next fixture to followed team card', () => {
    const card = mapTeamDetailsAndFixtureToFollowedCard(
      '85',
      {
        team: {
          id: 85,
          name: 'Paris SG',
          logo: 'psg.png',
        },
      },
      {
        fixture: {
          id: 900,
          date: '2026-03-20T20:00:00+00:00',
        },
        teams: {
          home: {
            id: 85,
            name: 'Paris SG',
            logo: 'psg.png',
          },
          away: {
            id: 81,
            name: 'Marseille',
            logo: 'om.png',
          },
        },
      },
    );

    expect(card.teamId).toBe('85');
    expect(card.teamName).toBe('Paris SG');
    expect(card.nextMatch?.opponentTeamName).toBe('Marseille');
  });

  it('maps player season payload to followed player card', () => {
    const card = mapPlayerSeasonToFollowedCard('154', {
      player: {
        id: 154,
        name: 'Cristiano Ronaldo',
        photo: 'cr7.png',
      },
      statistics: [
        {
          team: {
            name: 'Al-Nassr',
            logo: 'nassr.png',
          },
          league: {
            name: 'Saudi League',
          },
          games: {
            position: 'Attacker',
          },
          goals: {
            total: 24,
            assists: 8,
          },
        },
      ],
    });

    expect(card.playerName).toBe('Cristiano Ronaldo');
    expect(card.goals).toBe(24);
    expect(card.assists).toBe(8);
  });

  it('aggregates unique team trends from standings', () => {
    const trends = mapTrendingTeamsFromStandings(
      [
        {
          league: {
            name: 'League A',
            standings: [
              [
                { team: { id: 1, name: 'Team A', logo: 'a.png' } },
                { team: { id: 2, name: 'Team B', logo: 'b.png' } },
              ],
            ],
          },
        },
        {
          league: {
            name: 'League B',
            standings: [
              [
                { team: { id: 2, name: 'Team B', logo: 'b.png' } },
                { team: { id: 3, name: 'Team C', logo: 'c.png' } },
              ],
            ],
          },
        },
      ],
      10,
    );

    expect(trends).toHaveLength(3);
    expect(trends[0].teamId).toBe('1');
    expect(trends[1].teamId).toBe('2');
    expect(trends[2].teamId).toBe('3');
  });

  it('aggregates unique player trends from top scorers', () => {
    const trends = mapTrendingPlayersFromTopScorers(
      [
        {
          player: { id: 10, name: 'Player A', photo: 'a.png' },
          statistics: [{ team: { name: 'Club A', logo: 'ca.png' }, games: { position: 'Mid' } }],
        },
        {
          player: { id: 10, name: 'Player A', photo: 'a.png' },
          statistics: [{ team: { name: 'Club A', logo: 'ca.png' }, games: { position: 'Mid' } }],
        },
        {
          player: { id: 11, name: 'Player B', photo: 'b.png' },
          statistics: [{ team: { name: 'Club B', logo: 'cb.png' }, games: { position: 'Att' } }],
        },
      ],
      10,
    );

    expect(trends).toHaveLength(2);
    expect(trends[0].playerId).toBe('10');
    expect(trends[1].playerId).toBe('11');
  });

  it('exposes missing fields with explicit placeholders instead of synthetic entities', () => {
    const teamCard = mapTeamDetailsAndFixtureToFollowedCard('85', null, null);
    expect(teamCard.teamName).toBe('?');
    expect(teamCard.teamLogo).toBe('');

    const playerCard = mapPlayerSeasonToFollowedCard('154', {
      player: {
        id: 154,
      },
      statistics: [
        {
          goals: {
            total: null,
            assists: null,
          },
        },
      ],
    });

    expect(playerCard.playerName).toBe('?');
    expect(playerCard.position).toBe('?');
    expect(playerCard.teamName).toBe('?');
    expect(playerCard.leagueName).toBe('?');
    expect(playerCard.goals).toBeNull();
    expect(playerCard.assists).toBeNull();
  });
});
