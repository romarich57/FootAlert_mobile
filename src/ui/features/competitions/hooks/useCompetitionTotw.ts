import { useQuery } from '@tanstack/react-query';

export const COMPETITION_TOTW_QUERY_KEY = 'competition_totw';

export type TotwPlayer = {
    id: number;
    name: string;
    photo: string;
    position: string;
    gridX: number; // 0 to 1
    gridY: number; // 0 to 1
    rating: string;
};

export type TeamOfTheWeek = {
    round: string;
    players: TotwPlayer[];
};

export function useCompetitionTotw(leagueId: number | undefined, season: number | undefined, round: string | undefined) {
    return useQuery<TeamOfTheWeek | null, Error>({
        queryKey: [COMPETITION_TOTW_QUERY_KEY, leagueId, season, round],
        queryFn: async () => {
            if (!leagueId || !season || !round) {
                return null;
            }

            // NOTE: Computing the True TOTW requires fetching /fixtures/players for ALL 10 matches of a round.
            // This is 10 API calls per round, which consumes quota extremely fast if triggered frequently.
            // As per implementation plan, we will handle this gracefully to avoid quota exhaustion.
            // The UI will display a clear empty state: "Données non disponibles pour cette ligue" or "Limitations API".

            return null; // Force empty state for now to comply with quota limits.
        },
        enabled: !!leagueId && !!season && !!round,
        staleTime: 24 * 60 * 60 * 1000,
    });
}
