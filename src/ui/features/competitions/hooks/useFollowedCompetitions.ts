import { useCallback, useEffect, useState } from 'react';

import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import {
    loadFollowedLeagueIds,
    toggleFollowedLeague as storageToggleFollowedLeague,
} from '@data/storage/followsStorage';
import type { Competition } from '@ui/features/competitions/types/competitions.types';

const MAX_FOLLOWED_LEAGUES = 50;

export function useFollowedCompetitions() {
    const [followedIds, setFollowedIds] = useState<string[]>([]);
    const [followedCompetitions, setFollowedCompetitions] = useState<Competition[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFollowedDetails = useCallback(async (ids: string[]) => {
        try {
            const promises = ids.map(id => fetchLeagueById(id));
            const results = await Promise.all(promises);

            const competitions: Competition[] = results
                .filter(Boolean)
                .map(dto => ({
                    id: String(dto!.league.id),
                    name: dto!.league.name,
                    logo: dto!.league.logo,
                    type: dto!.league.type,
                    countryName: dto!.country.name,
                }));

            setFollowedCompetitions(competitions);
        } catch (error) {
            console.error('Failed to fetch followed leagues', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadFollows = useCallback(async () => {
        setIsLoading(true);
        const ids = await loadFollowedLeagueIds();
        setFollowedIds(ids);
        if (ids.length > 0) {
            await fetchFollowedDetails(ids);
        } else {
            setFollowedCompetitions([]);
            setIsLoading(false);
        }
    }, [fetchFollowedDetails]);

    useEffect(() => {
        loadFollows();
    }, [loadFollows]);

    const toggleFollow = useCallback(
        async (leagueId: string) => {
            const result = await storageToggleFollowedLeague(leagueId, MAX_FOLLOWED_LEAGUES);
            if (result.changed) {
                setFollowedIds(result.ids);
                if (result.ids.includes(leagueId)) {
                    // If added, load details for it
                    fetchFollowedDetails(result.ids);
                } else {
                    // If removed, just filter it out
                    setFollowedCompetitions(prev => prev.filter(c => c.id !== leagueId));
                }
            }
            return result;
        },
        [fetchFollowedDetails],
    );

    return {
        followedIds,
        followedCompetitions,
        isLoading,
        toggleFollow,
        refreshDelay: loadFollows,
    };
}
