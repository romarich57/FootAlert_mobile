import type { TrendPlayerItem, TrendTeamItem } from '@ui/features/follows/types/follows.types';

export const FALLBACK_TEAM_TRENDS: TrendTeamItem[] = [
  {
    teamId: '529',
    teamName: 'Barcelona',
    teamLogo: 'https://media.api-sports.io/football/teams/529.png',
    leagueName: 'La Liga',
  },
  {
    teamId: '50',
    teamName: 'Man City',
    teamLogo: 'https://media.api-sports.io/football/teams/50.png',
    leagueName: 'Premier League',
  },
  {
    teamId: '40',
    teamName: 'Liverpool',
    teamLogo: 'https://media.api-sports.io/football/teams/40.png',
    leagueName: 'Premier League',
  },
  {
    teamId: '157',
    teamName: 'Bayern Munich',
    teamLogo: 'https://media.api-sports.io/football/teams/157.png',
    leagueName: 'Bundesliga',
  },
  {
    teamId: '33',
    teamName: 'Man United',
    teamLogo: 'https://media.api-sports.io/football/teams/33.png',
    leagueName: 'Premier League',
  },
];

export const FALLBACK_PLAYER_TRENDS: TrendPlayerItem[] = [
  {
    playerId: '874',
    playerName: 'Kylian Mbappe',
    playerPhoto: 'https://media.api-sports.io/football/players/874.png',
    position: 'Attaquant',
    teamName: 'Paris SG',
    teamLogo: 'https://media.api-sports.io/football/teams/85.png',
  },
  {
    playerId: '1100',
    playerName: 'Ousmane Dembele',
    playerPhoto: 'https://media.api-sports.io/football/players/1100.png',
    position: 'Ailier',
    teamName: 'Paris SG',
    teamLogo: 'https://media.api-sports.io/football/teams/85.png',
  },
  {
    playerId: '875',
    playerName: 'Karim Benzema',
    playerPhoto: 'https://media.api-sports.io/football/players/875.png',
    position: 'Attaquant',
    teamName: 'Al-Ittihad',
    teamLogo: 'https://media.api-sports.io/football/teams/2934.png',
  },
  {
    playerId: '154',
    playerName: 'Cristiano Ronaldo',
    playerPhoto: 'https://media.api-sports.io/football/players/154.png',
    position: 'Attaquant',
    teamName: 'Al-Nassr',
    teamLogo: 'https://media.api-sports.io/football/teams/2939.png',
  },
];
