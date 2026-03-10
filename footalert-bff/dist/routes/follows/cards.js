export function mapTeamCard(teamId, detailsPayload, nextFixturePayload) {
    const team = detailsPayload.response?.[0]?.team;
    const nextFixture = nextFixturePayload.response?.[0];
    const homeTeamId = nextFixture?.teams?.home?.id;
    const isHomeTeam = String(homeTeamId ?? '') === teamId;
    const opponent = isHomeTeam ? nextFixture?.teams?.away : nextFixture?.teams?.home;
    return {
        teamId,
        teamName: team?.name ?? '',
        teamLogo: team?.logo ?? '',
        nextMatch: nextFixture?.fixture?.id && nextFixture?.fixture?.date
            ? {
                fixtureId: String(nextFixture.fixture.id),
                opponentTeamName: opponent?.name ?? '',
                opponentTeamLogo: opponent?.logo ?? '',
                startDate: nextFixture.fixture.date,
            }
            : null,
    };
}
export function mapPlayerCard(playerId, payload) {
    const item = payload.response?.[0];
    const firstStats = item?.statistics?.[0];
    return {
        playerId,
        playerName: item?.player?.name ?? '',
        playerPhoto: item?.player?.photo ?? '',
        position: firstStats?.games?.position ?? '',
        teamName: firstStats?.team?.name ?? '',
        teamLogo: firstStats?.team?.logo ?? '',
        leagueName: firstStats?.league?.name ?? '',
        goals: typeof firstStats?.goals?.total === 'number' ? firstStats.goals.total : null,
        assists: typeof firstStats?.goals?.assists === 'number' ? firstStats.goals.assists : null,
    };
}
