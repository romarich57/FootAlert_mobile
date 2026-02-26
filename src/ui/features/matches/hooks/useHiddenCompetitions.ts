import { useCallback, useEffect, useState } from 'react';

import {
    addHiddenCompetitionId,
    getHiddenCompetitionIds,
    removeHiddenCompetitionId,
} from '@data/storage/hiddenCompetitionsStorage';

export function useHiddenCompetitions() {
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);

    const loadHiddenIds = useCallback(async () => {
        try {
            const ids = await getHiddenCompetitionIds();
            setHiddenIds(ids);
        } catch {
            // Ignore
        }
    }, []);

    useEffect(() => {
        loadHiddenIds();
    }, [loadHiddenIds]);

    const hideCompetition = useCallback(
        async (id: string) => {
            await addHiddenCompetitionId(id);
            await loadHiddenIds();
        },
        [loadHiddenIds],
    );

    const unhideCompetition = useCallback(
        async (id: string) => {
            await removeHiddenCompetitionId(id);
            await loadHiddenIds();
        },
        [loadHiddenIds],
    );

    return {
        hiddenIds,
        hideCompetition,
        unhideCompetition,
    };
}
