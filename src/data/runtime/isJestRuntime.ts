export function isJestRuntime(): boolean {
  const runtimeProcess = (globalThis as { process?: { env?: { JEST_WORKER_ID?: string } } }).process;
  return Boolean(runtimeProcess?.env?.JEST_WORKER_ID);
}
