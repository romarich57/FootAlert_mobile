import { execSync } from 'node:child_process';
import process from 'node:process';

try {
  const repoRoot = execSync('git rev-parse --show-toplevel', {
    encoding: 'utf8',
  }).trim();

  execSync('git diff --exit-code -- packages/api-contract/generated/types.ts', {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  console.log('[api-contract:check] Generated types are up to date.');
} catch {
  if (!process.env.CI) {
    console.warn(
      '[api-contract:check] Generated types changed in working tree. Commit packages/api-contract/generated/types.ts.',
    );
    process.exit(0);
  }

  console.error(
    '[api-contract:check] Generated types changed. Run `npm run contract:generate` and commit the result.',
  );
  process.exit(1);
}
