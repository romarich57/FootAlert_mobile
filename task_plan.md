# Task Plan

## Goal
Implement the remaining phases 2 to 6 of the SQLite local-first rollout, starting with a stabilization gate and ending with cleanup, telemetry, and verified parity.

## Phases
| Phase | Status | Notes |
|---|---|---|
| 0. Audit branch state and existing implementation | in_progress | Measure current gaps, errors, and partial rollout |
| 1. Stabilization gate and architecture boundary repair | pending | Fix TS/lint/import violations and shared contracts placement |
| 2. Local-first entity migration | pending | Team, player, competition, match hooks and screen-model adoption |
| 3. Sync engine and warm-up persistence | pending | Middleware, prefetch persistence, matches-by-date explicit writer |
| 4. Fast hydration and MMKV reduction | pending | Bootstrap DB init/hydration before persistence restore |
| 5. Relational cache rollout | pending | `002_relational_cache`, followed entities, standings, enriched matches-by-date |
| 6. Cleanup and observability | pending | GC, telemetry, legacy path removal, final verification |

## Risks
- Dirty worktree with many existing changes, including partial local-first work.
- Type and architecture regressions may block unrelated feature work until fixed.
- Multiple overlapping persistence paths may require careful sequencing to avoid data divergence.

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| `git status` failed at repo root because `.git` lives in `Mobile_Foot` | 1 | Switched working directory to `Mobile_Foot` |
