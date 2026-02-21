import { useCallback, useEffect, useState } from 'react';

import { fetchAllLeagues, searchLeaguesByName } from '@data/endpoints/competitionsApi';
import type {
    Competition,
    CountryWithCompetitions,
} from '@ui/features/competitions/types/competitions.types';

const SUGGESTED_LEAGUE_IDS = ['135', '78', '39', '140', '61']; // Serie A, Bundesliga, PL, La Liga, Ligue 1

export function useCompetitions() {
    const [countries, setCountries] = useState<CountryWithCompetitions[]>([]);
    const [suggestedCompetitions, setSuggestedCompetitions] = useState<Competition[]>([]);
    const [searchResults, setSearchResults] = useState<Competition[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadAllLeagues = useCallback(async () => {
        setIsLoading(true);
        try {
            const dtos = await fetchAllLeagues();

            // Parse and group by country
            const grouped = new Map<string, CountryWithCompetitions>();
            const suggestions: Competition[] = [];

            dtos.forEach(dto => {
                const comp: Competition = {
                    id: String(dto.league.id),
                    name: dto.league.name,
                    logo: dto.league.logo,
                    type: dto.league.type,
                    countryName: dto.country.name,
                };

                if (SUGGESTED_LEAGUE_IDS.includes(comp.id)) {
                    suggestions.push(comp);
                }

                const countryName = dto.country.name;
                if (!grouped.has(countryName)) {
                    grouped.set(countryName, {
                        name: countryName,
                        code: dto.country.code,
                        flag: dto.country.flag,
                        competitions: [],
                    });
                }
                grouped.get(countryName)!.competitions.push(comp);
            });

            // Sort countries alphabetically
            const sortedCountries = Array.from(grouped.values()).sort((a, b) =>
                a.name.localeCompare(b.name),
            );

            setCountries(sortedCountries);
            setSuggestedCompetitions(suggestions);
        } catch (error) {
            console.error('Failed to load all leagues', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllLeagues();
    }, [loadAllLeagues]);

    const searchLeagues = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const dtos = await searchLeaguesByName(query);
            const results: Competition[] = dtos.map(dto => ({
                id: String(dto.league.id),
                name: dto.league.name,
                logo: dto.league.logo,
                type: dto.league.type,
                countryName: dto.country.name,
            }));
            setSearchResults(results);
        } catch (error) {
            console.error('Failed to search leagues', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    return {
        countries,
        suggestedCompetitions,
        searchResults,
        isSearching,
        isLoading,
        searchLeagues,
        refresh: loadAllLeagues,
    };
}
