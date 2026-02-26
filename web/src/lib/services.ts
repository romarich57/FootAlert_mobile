import {
  createCompetitionsReadService,
  createFollowsReadService,
  createMatchesReadService,
  createPlayersReadService,
  createTeamsReadService,
} from '@app-core';

import { resolveWebApiBaseUrl } from './config';
import { createWebHttpAdapter } from './httpAdapter';
import { browserTelemetryAdapter } from './telemetryAdapter';

const http = createWebHttpAdapter(resolveWebApiBaseUrl());

export const readServices = {
  matches: createMatchesReadService({ http, telemetry: browserTelemetryAdapter }),
  teams: createTeamsReadService({ http, telemetry: browserTelemetryAdapter }),
  players: createPlayersReadService({ http, telemetry: browserTelemetryAdapter }),
  competitions: createCompetitionsReadService({ http, telemetry: browserTelemetryAdapter }),
  follows: createFollowsReadService({ http, telemetry: browserTelemetryAdapter }),
};
