/**
 * Registre de toutes les migrations SQLite, ordonnées par version.
 * Chaque nouvelle migration doit être ajoutée ici dans l'ordre croissant.
 */

import type { MigrationScript } from '../migrationRunner';
import { migration001Initial } from './001_initial';
import { migration002RelationalCache } from './002_relational_cache';
import { migration003BootstrapCache } from './003_bootstrap_cache';
import { migration004OfflineMutationQueue } from './004_offline_mutation_queue';

export const allMigrations: readonly MigrationScript[] = [
  migration001Initial,
  migration002RelationalCache,
  migration003BootstrapCache,
  migration004OfflineMutationQueue,
];
