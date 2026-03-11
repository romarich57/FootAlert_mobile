import { buildEnv } from './env/index.js';

export type {
  AppEnv,
  AttestationEnforcementMode,
  BffEnv,
  CacheBackend,
  NodeRole,
  NotificationsPersistenceBackend,
} from './env/index.js';

export { buildEnv } from './env/index.js';

export const env = buildEnv(process.env);
