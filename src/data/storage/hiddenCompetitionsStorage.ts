import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';

const HIDDEN_COMPETITIONS_KEY = 'footAlert:hiddenCompetitions';

export async function getHiddenCompetitionIds(): Promise<string[]> {
    const ids = await getJsonValue<string[]>(HIDDEN_COMPETITIONS_KEY);
    return ids ?? [];
}

export async function addHiddenCompetitionId(competitionId: string): Promise<void> {
    const currentIds = await getHiddenCompetitionIds();
    if (!currentIds.includes(competitionId)) {
        const nextIds = [...currentIds, competitionId];
        await setJsonValue(HIDDEN_COMPETITIONS_KEY, nextIds);
    }
}

export async function removeHiddenCompetitionId(competitionId: string): Promise<void> {
    const currentIds = await getHiddenCompetitionIds();
    const nextIds = currentIds.filter(id => id !== competitionId);
    await setJsonValue(HIDDEN_COMPETITIONS_KEY, nextIds);
}
