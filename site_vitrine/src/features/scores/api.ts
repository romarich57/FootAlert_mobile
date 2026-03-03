import { resolveBffBaseUrl } from '@/lib/config';
import { fetchJson } from '@/lib/http';

import { mapFixturesToScoreCards } from './mapper';
import type { MatchScoreCard, MatchesApiEnvelope } from './types';

export async function fetchScoreCards(params: {
  date: string;
  timezone: string;
  limit: number;
  signal?: AbortSignal;
}): Promise<MatchScoreCard[]> {
  const query = new URLSearchParams({
    date: params.date,
    timezone: params.timezone,
    limit: String(params.limit),
  });

  const url = `${resolveBffBaseUrl()}/matches?${query.toString()}`;
  const payload = await fetchJson<MatchesApiEnvelope>(url, params.signal);
  return mapFixturesToScoreCards(payload.response);
}
