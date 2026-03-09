# Dead Code Audit Matrix

Date: 2026-03-07

## Scope

- Strict-proof cleanup only
- Runtime-adjacent code plus tracked debug probes
- Non-tracked local probe files inventoried only

## PROVEN_DEAD and removed

| Status | Path / Symbol | Reason | Proof | Validation |
| --- | --- | --- | --- | --- |
| `PROVEN_DEAD` | `src/domain/contracts/index.ts` | Unused barrel export | No repo consumer of `@domain/contracts` barrel; imports target concrete `*.types` modules | Mobile typecheck |
| `PROVEN_DEAD` | `src/data/endpoints/competitionsApi.ts#fetchLeagueFixtures` | Dead wrapper superseded by paginated API path | No consumer of `fetchLeagueFixtures`; active flow uses `fetchLeagueFixturesPage` | Mobile typecheck + competition tests |
| `PROVEN_DEAD` | `src/data/storage/hiddenCompetitionsStorage.ts#setHiddenCompetitionIds` | Unused storage helper | No consumer; active hook uses only `get/add/remove` | Mobile typecheck |
| `PROVEN_DEAD` | `src/ui/features/more/components/DisabledFeatureRow.tsx` | Unmounted component | No consumer beyond barrel export | Mobile typecheck + More screen tests |
| `PROVEN_DEAD` | `src/ui/features/competitions/components/CompetitionSeasonsTab.tsx` | Obsolete season-selection tab | No consumer; active season selection handled by modal flow in competition details screen | Mobile typecheck + competition tests |
| `PROVEN_DEAD` | `packages/app-core/src/domain/parity.ts` | Unused shared type module | No code consumer in mobile/BFF/web/desktop/site/scripts | App-core build + downstream typechecks |
| `PROVEN_DEAD` | `packages/app-core/src/security/requestSignaturePayload.ts` | Unused shared helper module | Only self-test references; no runtime or package consumer | App-core build + downstream typechecks |
| `PROVEN_DEAD` | `packages/app-core/src/security/requestSignaturePayload.test.ts` | Test only for removed dead module | Sole target module removed | App-core build |
| `PROVEN_DEAD` | `test-mapping.ts` | Manual probe outside pipeline | No script/doc/workflow/package consumer | Repo grep + typechecks |
| `PROVEN_DEAD` | `footalert-bff/test-api.mjs` | Manual probe outside pipeline | No script/doc/workflow/package consumer | Repo grep + BFF typecheck |
| `PROVEN_DEAD` | `footalert-bff/test-h2h.mjs` | Manual probe outside pipeline | No script/doc/workflow/package consumer | Repo grep + BFF typecheck |
| `PROVEN_DEAD` | `footalert-bff/test-rm-benfica-lineups.mjs` | Manual probe outside pipeline | No script/doc/workflow/package consumer | Repo grep + BFF typecheck |
| `PROVEN_DEAD` | `footalert-bff/test-rm-matches.mjs` | Manual probe outside pipeline | No script/doc/workflow/package consumer | Repo grep + BFF typecheck |
| `PROVEN_DEAD` | `footalert-bff/test-wiki.mjs` | Manual probe outside pipeline | No script/doc/workflow/package consumer | Repo grep + BFF typecheck |
| `PROVEN_DEAD` | `footalert-bff/test-wiki-html.mjs` | Manual probe outside pipeline | No script/doc/workflow/package consumer | Repo grep + BFF typecheck |

## KEEP / SUSPICIOUS

| Status | Path / Symbol | Reason |
| --- | --- | --- |
| `KEEP` | `src/ui/features/search/screens/SearchPlaceholderScreen.tsx` | No runtime consumer found, but symbol still appears in versioned feedback/spec documentation; kept under strict-proof policy |
| `KEEP` | `desktop/src/index.ts` | No runtime consumer found, but deleting it leaves the desktop TypeScript project with zero TS inputs and breaks `desktop:typecheck` |
| `INVENTORY_ONLY` | `test-haaland.mjs` | Untracked local probe; out of automatic cleanup scope |
| `INVENTORY_ONLY` | `footalert-bff/test-topscorers.mjs` | Untracked local probe; out of automatic cleanup scope |

## Notes

- No route/helper deletion was applied inside BFF runtime code because proof threshold was not met.
- No storybook story, fixture, workflow, or doc artifact was removed in this pass.
