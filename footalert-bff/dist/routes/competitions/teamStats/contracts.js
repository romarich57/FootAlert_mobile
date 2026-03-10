export const SUMMARY_METRICS = [
    'pointsPerMatch',
    'winRate',
    'goalsScoredPerMatch',
    'goalsConcededPerMatch',
    'goalDiffPerMatch',
    'formIndex',
    'formPointsPerMatch',
];
export const HOME_AWAY_METRICS = [
    'homePPG',
    'awayPPG',
    'homeGoalsFor',
    'awayGoalsFor',
    'homeGoalsAgainst',
    'awayGoalsAgainst',
    'deltaHomeAwayPPG',
    'deltaHomeAwayGoalsFor',
    'deltaHomeAwayGoalsAgainst',
];
export const ADVANCED_METRICS = [
    'cleanSheets',
    'failedToScore',
    'xGPerMatch',
    'possession',
    'shotsPerMatch',
    'shotsOnTargetPerMatch',
];
export const GOAL_MINUTE_SLOTS = [
    '0-15',
    '16-30',
    '31-45',
    '46-60',
    '61-75',
    '76-90',
    '91-105',
    '106-120',
];
export const SUMMARY_SORT_ORDERS = {
    pointsPerMatch: 'desc',
    winRate: 'desc',
    goalsScoredPerMatch: 'desc',
    goalsConcededPerMatch: 'asc',
    goalDiffPerMatch: 'desc',
    formIndex: 'desc',
    formPointsPerMatch: 'desc',
};
export const HOME_AWAY_SORT_ORDERS = {
    homePPG: 'desc',
    awayPPG: 'desc',
    homeGoalsFor: 'desc',
    awayGoalsFor: 'desc',
    homeGoalsAgainst: 'asc',
    awayGoalsAgainst: 'asc',
    deltaHomeAwayPPG: 'desc',
    deltaHomeAwayGoalsFor: 'desc',
    deltaHomeAwayGoalsAgainst: 'desc',
};
export const ADVANCED_SORT_ORDERS = {
    cleanSheets: 'desc',
    failedToScore: 'asc',
    xGPerMatch: 'desc',
    possession: 'desc',
    shotsPerMatch: 'desc',
    shotsOnTargetPerMatch: 'desc',
};
